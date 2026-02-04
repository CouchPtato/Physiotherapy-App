export type Keypoint = {
  name: string;
  x: number;
  y: number;
  score?: number;
};

export type PoseFrame = {
  keypoints: Keypoint[];
};

export type PoseResult = {
  angle: number;
  stage: "up" | "down" | "-";
  repDetected: boolean;
  activeSide?: "left" | "right" | null;
};

const kp = (pose: PoseFrame, name: string) =>
  pose.keypoints.find(k => k.name === name);

const angle3 = (a: Keypoint, b: Keypoint, c: Keypoint) => {
  const ab = Math.atan2(a.y - b.y, a.x - b.x);
  const cb = Math.atan2(c.y - b.y, c.x - b.x);
  let deg = Math.abs(((cb - ab) * 180) / Math.PI);
  if (deg > 180) deg = 360 - deg;
  return deg;
};

export function processPose(
  exercise: string,
  pose: PoseFrame,
  prevStage: string
): PoseResult {
  let angle = 0;
  let stage: "up" | "down" | "-" = prevStage as any;
  let repDetected = false;

  if (
    exercise === "squat" ||
    exercise === "knee_extension" ||
    exercise === "leg_raise"
  ) {
    const h = kp(pose, "left_hip");
    const k = kp(pose, "left_knee");
    const a = kp(pose, "left_ankle");
    if (!h || !k || !a) return { angle: 0, stage, repDetected };

    angle = angle3(h, k, a);

    if (angle > 160) stage = "up";
    if (angle < 95 && prevStage === "up") {
      stage = "down";
      repDetected = true;
    }
  }

  if (
    exercise === "bicep_curl" ||
    exercise === "shoulder_abduction"
  ) {
    // Check both sides and choose the side with the most valid keypoints / movement
    const sides: Array<"left" | "right"> = ["left", "right"];
    let best: { side: "left" | "right"; angle: number; valid: boolean } | null = null;

    for (const side of sides) {
      const s = kp(pose, `${side}_shoulder`);
      const e = kp(pose, `${side}_elbow`);
      const w = kp(pose, `${side}_wrist`);
      if (!s || !e || !w) continue;
      const a = angle3(s, e, w);
      if (!best || a < best.angle) {
        best = { side, angle: a, valid: true };
      }
    }

    if (!best) return { angle: 0, stage, repDetected, activeSide: null };

    // Use the chosen side for angle and rep detection
    angle = best.angle;

    if (angle > 150) stage = "down";
    if (angle < 50 && prevStage === "down") {
      stage = "up";
      repDetected = true;
    }

    return { angle, stage, repDetected, activeSide: best.side };
  }

  if (exercise === "side_bend") {
    const ls = kp(pose, "left_shoulder");
    const lh = kp(pose, "left_hip");
    const rh = kp(pose, "right_hip");
    if (!ls || !lh || !rh) return { angle: 0, stage, repDetected };

    angle = angle3(ls, lh, rh);

    if (angle > 40) stage = "up";
    if (angle < 25 && prevStage === "up") {
      stage = "down";
      repDetected = true;
    }
  }

  return { angle, stage, repDetected };
}
