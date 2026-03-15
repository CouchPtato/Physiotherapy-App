import { useRef } from "react";
import { runOnJS, SharedValue, useSharedValue } from "react-native-reanimated";
import { processPose } from "../backend/pose/poseEngine";

/* ---------------- TYPES ---------------- */

type PoseKeypoint = {
  name: string;
  x: number;
  y: number;
  score?: number;
};

type PoseFrame = {
  keypoints: PoseKeypoint[];
};

type OnRepCallback = () => void;

/* ---------------- HOOK ---------------- */

export function usePoseStore(
  exerciseKey: string,
  onRep: OnRepCallback,
  options?: { preventRepRef?: { current: boolean } }
): {
  processFrame: (pose: PoseFrame) => void;
  angleSV: SharedValue<number>;
  keypointsSV: SharedValue<PoseKeypoint[]>;
  activeSideSV: SharedValue<"left" | "right" | null>;
  lastFormScoreRef: { current: number | null };
} {
  const preventRepRef = options?.preventRepRef;
  const stageRef = useRef<"up" | "down" | "-">("-");
  const lastRepTs = useRef<number>(0);

  const angleSV = useSharedValue<number>(0);
  const keypointsSV = useSharedValue<PoseKeypoint[]>([]);
  const activeSideSV = useSharedValue<"left" | "right" | null>(null);

  // Last computed per-frame form score (0..1)
  const lastFormScoreRef = useRef<number | null>(null);

  const computeFormScore = (exercise: string, angle: number) => {
    const idealRanges: Record<string, [number, number]> = {
      bicep_curl: [30, 160],
      squat: [70, 160],
      shoulder_abduction: [70, 160],
      knee_extension: [0, 160],
      leg_raise: [40, 150],
      side_bend: [10, 35],
    };

    const [low, high] = idealRanges[exercise] ?? [60, 150];
    let diff = 0;
    if (angle < low) diff = low - angle;
    else if (angle > high) diff = angle - high;
    else diff = 0;

    const score = Math.max(0, 1 - diff / 60);
    return score; // 0..1
  };

  const processFrame = (pose: PoseFrame) => {
    const res = processPose(exerciseKey, pose, stageRef.current) as any;

    stageRef.current = res.stage;
    angleSV.value = res.angle;
    keypointsSV.value = pose.keypoints ?? [];
    activeSideSV.value = res.activeSide ?? null;

    // compute and set last form score per frame
    if (res.angle && res.angle > 0) {
      lastFormScoreRef.current = computeFormScore(exerciseKey, res.angle);
    } else {
      lastFormScoreRef.current = null;
    }

    if (res.repDetected) {
      // Don't call onRep if a higher-level flow has requested rep prevention
      if (preventRepRef?.current) {
        return;
      }

      const now = Date.now();
      if (now - lastRepTs.current > 700) {
        lastRepTs.current = now;
        runOnJS(onRep)();
      }
    }
  };

  return {
    processFrame,
    angleSV,
    keypointsSV,
    activeSideSV,
    lastFormScoreRef,
  };
}
