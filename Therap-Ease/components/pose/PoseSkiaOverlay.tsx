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

        // build path from any available connected keypoints so partial tracking still shows something
        const path = Skia.Path.Make();
        let hasSegment = false;
        if (s && e) {
          const { cx, cy } = toCanvas(s, mirror ?? false);
          path.moveTo(cx, cy);
          const { cx: ex, cy: ey } = toCanvas(e, mirror ?? false);
          path.lineTo(ex, ey);
          hasSegment = true;
          if (w) {
            const { cx: wx, cy: wy } = toCanvas(w, mirror ?? false);
            path.lineTo(wx, wy);
          }
        } else if (e && w) {
          const { cx, cy } = toCanvas(e, mirror ?? false);
          path.moveTo(cx, cy);
          const { cx: wx, cy: wy } = toCanvas(w, mirror ?? false);
          path.lineTo(wx, wy);
          hasSegment = true;
        } else if (s && w) {
          const { cx, cy } = toCanvas(s, mirror ?? false);
          path.moveTo(cx, cy);
          const { cx: wx, cy: wy } = toCanvas(w, mirror ?? false);
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

      {/* Draw keypoint circles */}
      {points.value.map((p: PoseKeypoint, i: number) => {
        if (!p.name) return null;
        if (preferSingleSide && !p.name.startsWith(bestSide)) return null;
        const score = p.score ?? 0;
        if (score <= 0.05) return null;
        const { cx, cy } = toCanvas(p, mirror ?? false);
        const alpha = Math.max(0.25, Math.min(1, score));
        const fill = `rgba(0,255,255,${alpha})`;
        return <Circle key={i} cx={cx} cy={cy} r={4 + (score > 0.8 ? 2 : 0)} color={fill} />;
      })}
    </Canvas>
  );
}
