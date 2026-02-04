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
};

/* ---------------- HELPERS ---------------- */
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

function toCanvas(p: PoseKeypoint) {
  // Accept either normalized (0..1) or pixel coords
  const cx = p.x <= 1 ? p.x * SCREEN_W : p.x;
  const cy = p.y <= 1 ? p.y * SCREEN_H : p.y;
  return { cx, cy };
}

/* ---------------- COMPONENT ---------------- */

export function PoseSkiaOverlay({
  keypointsSV,
  activeSideSV,
}: PoseSkiaOverlayProps) {
  const points = useDerivedValue<PoseKeypoint[]>(() => {
    return keypointsSV.value ?? [];
  });

  const activeSide = useDerivedValue(() => activeSideSV?.value ?? null);

  const kp = (name: string) => points.value.find((k) => k.name === name);

  const makeArmPath = (side: "left" | "right") => {
    const s = kp(`${side}_shoulder`);
    const e = kp(`${side}_elbow`);
    const w = kp(`${side}_wrist`);
    const path = Skia.Path.Make();
    if (s && e) {
      const { cx, cy } = toCanvas(s);
      path.moveTo(cx, cy);
      const { cx: ex, cy: ey } = toCanvas(e);
      path.lineTo(ex, ey);
      if (w) {
        const { cx: wx, cy: wy } = toCanvas(w);
        path.lineTo(wx, wy);
      }
    }
    return path;
  };

  return (
    <Canvas style={StyleSheet.absoluteFillObject}>
      {/* Draw arm skeletons (left + right) */}
      {(["left", "right"] as const).map((side) => {
        const s = points.value.find((k) => k.name === `${side}_shoulder`);
        const e = points.value.find((k) => k.name === `${side}_elbow`);
        const w = points.value.find((k) => k.name === `${side}_wrist`);
        if (!s || !e) return null;

        const path = Skia.Path.Make();
        const { cx: sx, cy: sy } = toCanvas(s);
        path.moveTo(sx, sy);
        const { cx: ex, cy: ey } = toCanvas(e);
        path.lineTo(ex, ey);
        if (w) {
          const { cx: wx, cy: wy } = toCanvas(w);
          path.lineTo(wx, wy);
        }

        const isActive = activeSide.value === side;
        return (
          <Path
            key={side}
            path={path}
            style="stroke"
            strokeWidth={isActive ? 4 : 2}
            strokeJoin={"round"}
            color={isActive ? "cyan" : "rgba(255,255,255,0.6)"}
          />
        );
      })}

      {/* Draw keypoint circles */}
      {points.value.map((p: PoseKeypoint, i: number) => {
        if ((p.score ?? 1) <= 0.4) return null;
        const { cx, cy } = toCanvas(p);
        return <Circle key={i} cx={cx} cy={cy} r={4} color="cyan" />;
      })}
    </Canvas>
  );
}
