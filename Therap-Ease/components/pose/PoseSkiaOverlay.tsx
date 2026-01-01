import React from "react";
import { StyleSheet } from "react-native";
import { Canvas, Circle } from "@shopify/react-native-skia";
import { SharedValue, useDerivedValue } from "react-native-reanimated";

/* ---------------- TYPES ---------------- */

type PoseKeypoint = {
  x: number;
  y: number;
  score?: number;
};

/* ---------------- PROPS ---------------- */

type PoseSkiaOverlayProps = {
  keypointsSV: SharedValue<PoseKeypoint[]>;
};

/* ---------------- COMPONENT ---------------- */

export function PoseSkiaOverlay({
  keypointsSV,
}: PoseSkiaOverlayProps) {
  const points = useDerivedValue<PoseKeypoint[]>(() => {
    return keypointsSV.value ?? [];
  });

  return (
    <Canvas style={StyleSheet.absoluteFillObject}>
      {points.value.map((p: PoseKeypoint, i: number) =>
        (p.score ?? 1) > 0.4 ? (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            color="cyan"
          />
        ) : null
      )}
    </Canvas>
  );
}
