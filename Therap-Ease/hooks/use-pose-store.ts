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
  onRep: OnRepCallback
): {
  processFrame: (pose: PoseFrame) => void;
  angleSV: SharedValue<number>;
  keypointsSV: SharedValue<PoseKeypoint[]>;
} {
  const stageRef = useRef<"up" | "down" | "-">("-");
  const lastRepTs = useRef<number>(0);

  const angleSV = useSharedValue<number>(0);
  const keypointsSV = useSharedValue<PoseKeypoint[]>([]);

  const processFrame = (pose: PoseFrame) => {
    const res = processPose(exerciseKey, pose, stageRef.current);

    stageRef.current = res.stage;
    angleSV.value = res.angle;
    keypointsSV.value = pose.keypoints ?? [];

    if (res.repDetected) {
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
  };
}
