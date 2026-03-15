import React from "react";
import { StyleSheet, Dimensions } from "react-native";
import { Canvas, Circle, Path, Skia } from "@shopify/react-native-skia";
import { SharedValue, useDerivedValue } from "react-native-reanimated";

/* ---------------- TYPES ---------------- */

type PoseKeypoint = {
  name?: string;
  x: number;
  y: number;
  score?: number;
};

/* ---------------- PROPS ---------------- */

type PoseSkiaOverlayProps = {
  keypointsSV: SharedValue<PoseKeypoint[]>;
  activeSideSV?: SharedValue<"left" | "right" | null>;
  mirror?: boolean;
};

/* ---------------- HELPERS ---------------- */
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

function toCanvas(p: PoseKeypoint, mirror = false) {
  // Accept either normalized (0..1) or pixel coords
  const nx = p.x <= 1 ? p.x * SCREEN_W : p.x;
  const ny = p.y <= 1 ? p.y * SCREEN_H : p.y;
  const cx = mirror ? SCREEN_W - nx : nx;
  const cy = ny;
  return { cx, cy };
}

/* ---------------- COMPONENT ---------------- */

export function PoseSkiaOverlay({
  keypointsSV,
  activeSideSV,
  mirror,
}: PoseSkiaOverlayProps) {
  const points = useDerivedValue<PoseKeypoint[]>(() => {
    return keypointsSV.value ?? [];
  });

  const activeSide = useDerivedValue(() => activeSideSV?.value ?? null);

  const kp = (name: string) => points.value.find((k) => k.name === name);

  // Smoothed positions to avoid jumpy / laggy skeleton — lerp between updates
  const smoothedRef = React.useRef<Record<string, { x: number; y: number; score: number }>>({});
  const [, setTick] = React.useState(0);

  React.useEffect(() => {
    let mounted = true;
    const alpha = 0.4; // smoothing factor (0..1) higher -> snappier

    const step = () => {
      const cur = points.value ?? [];
      let changed = false;

      const seen: Record<string, boolean> = {};
      cur.forEach((p) => {
        if (!p.name) return;
        const key = p.name;
        seen[key] = true;
        const tgtX = p.x <= 1 ? p.x * SCREEN_W : p.x;
        const tgtY = p.y <= 1 ? p.y * SCREEN_H : p.y;
        const prev = smoothedRef.current[key];
        if (!prev) {
          smoothedRef.current[key] = { x: tgtX, y: tgtY, score: p.score ?? 0 };
          changed = true;
        } else {
          const nx = prev.x + (tgtX - prev.x) * alpha;
          const ny = prev.y + (tgtY - prev.y) * alpha;
          const ns = (prev.score + (p.score ?? 0)) / 2;
          if (Math.abs(nx - prev.x) > 0.5 || Math.abs(ny - prev.y) > 0.5) changed = true;
          smoothedRef.current[key] = { x: nx, y: ny, score: ns };
        }
      });

      // remove stale keys
      Object.keys(smoothedRef.current).forEach((k) => {
        if (!seen[k]) {
          delete smoothedRef.current[k];
          changed = true;
        }
      });

      if (changed && mounted) setTick((t) => t + 1);
      if (mounted) requestAnimationFrame(step);
    };

    const id = requestAnimationFrame(step);
    return () => {
      mounted = false;
      cancelAnimationFrame(id);
    };
  }, [points]);

  const makeArmPath = (side: "left" | "right", mirror = false) => {
    const s = kp(`${side}_shoulder`);
    const e = kp(`${side}_elbow`);
    const w = kp(`${side}_wrist`);
    const path = Skia.Path.Make();
    if (s && e) {
      const { cx, cy } = toCanvas(s, mirror);
      path.moveTo(cx, cy);
      const { cx: ex, cy: ey } = toCanvas(e, mirror);
      path.lineTo(ex, ey);
      if (w) {
        const { cx: wx, cy: wy } = toCanvas(w, mirror);
        path.lineTo(wx, wy);
      }
    }
    return path;
  };

  // Decide which side(s) to render based on confidence and reported active side
  const leftScores = [kp("left_shoulder")?.score ?? 0, kp("left_elbow")?.score ?? 0, kp("left_wrist")?.score ?? 0];
  const rightScores = [kp("right_shoulder")?.score ?? 0, kp("right_elbow")?.score ?? 0, kp("right_wrist")?.score ?? 0];
  const leftAvg = leftScores.reduce((a, b) => a + b, 0) / 3;
  const rightAvg = rightScores.reduce((a, b) => a + b, 0) / 3;

  const reportedActive = activeSide.value;
  const displayedActive = reportedActive ? (mirror ? (reportedActive === "left" ? "right" : "left") : reportedActive) : null;

  let preferSingleSide = false;
  let bestSide: "left" | "right" = leftAvg >= rightAvg ? "left" : "right";
  const visRatio = Math.max(leftAvg, rightAvg) / (Math.min(leftAvg, rightAvg) + 1e-6);
  if (displayedActive) {
    preferSingleSide = true;
    bestSide = displayedActive as "left" | "right";
  } else if ((leftAvg >= 0.25 && rightAvg < 0.15) || (rightAvg >= 0.25 && leftAvg < 0.15) || visRatio > 1.5) {
    preferSingleSide = true;
    bestSide = leftAvg >= rightAvg ? "left" : "right";
  }

  const sideVisible = {
    left: leftAvg >= 0.12 || bestSide === "left",
    right: rightAvg >= 0.12 || bestSide === "right",
  };

  return (
    <Canvas style={StyleSheet.absoluteFillObject}>
      {/* Draw arm skeletons (left + right) */}
      {(["left", "right"] as const).map((side) => {
        // Skip side if visibility is too low and not chosen
        if (preferSingleSide && side !== bestSide) return null;
        if (!sideVisible[side]) return null;

        const s = points.value.find((k) => k.name === `${side}_shoulder`);
        const e = points.value.find((k) => k.name === `${side}_elbow`);
        const w = points.value.find((k) => k.name === `${side}_wrist`);

        // build path from smoothed keypoints so skeleton animates smoothly
        const smoothed = smoothedRef.current;
        const s_s = smoothed[`${side}_shoulder`];
        const e_s = smoothed[`${side}_elbow`];
        const w_s = smoothed[`${side}_wrist`];

        const path = Skia.Path.Make();
        let hasSegment = false;
        if (s_s && e_s) {
          const { cx, cy } = { cx: mirror ? SCREEN_W - s_s.x : s_s.x, cy: s_s.y };
          path.moveTo(cx, cy);
          const { cx: ex, cy: ey } = { cx: mirror ? SCREEN_W - e_s.x : e_s.x, cy: e_s.y };
          path.lineTo(ex, ey);
          hasSegment = true;
          if (w_s) {
            const { cx: wx, cy: wy } = { cx: mirror ? SCREEN_W - w_s.x : w_s.x, cy: w_s.y };
            path.lineTo(wx, wy);
          }
        } else if (e_s && w_s) {
          const { cx, cy } = { cx: mirror ? SCREEN_W - e_s.x : e_s.x, cy: e_s.y };
          path.moveTo(cx, cy);
          const { cx: wx, cy: wy } = { cx: mirror ? SCREEN_W - w_s.x : w_s.x, cy: w_s.y };
          path.lineTo(wx, wy);
          hasSegment = true;
        } else if (s_s && w_s) {
          const { cx, cy } = { cx: mirror ? SCREEN_W - s_s.x : s_s.x, cy: s_s.y };
          path.moveTo(cx, cy);
          const { cx: wx, cy: wy } = { cx: mirror ? SCREEN_W - w_s.x : w_s.x, cy: w_s.y };
          path.lineTo(wx, wy);
          hasSegment = true;
        }

        if (!hasSegment) return null;

        const isActive = displayedActive ? displayedActive === side : (preferSingleSide && side === bestSide);

        return (
          <Path
            key={side}
            path={path}
            style="stroke"
            strokeWidth={isActive ? 4 : 2}
            strokeJoin={"round"}
            color={isActive ? "cyan" : "rgba(255,255,255,0.6)"}
            opacity={isActive ? 1 : 0.6}
          />
        );
      })}

      {/* Draw keypoint circles (from smoothed positions) */}
      {Object.entries(smoothedRef.current).map(([name, s], i) => {
        if (preferSingleSide && !name.startsWith(bestSide)) return null;
        const score = s.score ?? 0;
        if (score <= 0.05) return null;
        const cx = mirror ? SCREEN_W - s.x : s.x;
        const cy = s.y;
        const alpha = Math.max(0.25, Math.min(1, score));
        const fill = `rgba(0,255,255,${alpha})`;
        return <Circle key={name} cx={cx} cy={cy} r={4 + (score > 0.8 ? 2 : 0)} color={fill} />;
      })}
    </Canvas>
  );
}
