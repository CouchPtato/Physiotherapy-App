import { Ionicons } from "@expo/vector-icons";
import { Camera, CameraView } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Line } from "react-native-svg";
import { ColorTheme } from "../constants/GlobalStyles";

const API_BASE = "http://192.168.X.X:8000";

const EXERCISE_JOINTS = {
  squat: [
    "left_hip",
    "left_knee",
    "left_ankle",
    "right_hip",
    "right_knee",
    "right_ankle",
  ],
  bicep_curl: [
    "left_shoulder",
    "left_elbow",
    "left_wrist",
    "right_shoulder",
    "right_elbow",
    "right_wrist",
  ],
  shoulder_abduction: [
    "left_shoulder",
    "left_elbow",
    "left_wrist",
    "right_shoulder",
    "right_elbow",
    "right_wrist",
  ],
  knee_extension: [
    "left_hip",
    "left_knee",
    "left_ankle",
    "right_hip",
    "right_knee",
    "right_ankle",
  ],
  leg_raise: [
    "left_hip",
    "left_knee",
    "left_ankle",
    "right_hip",
    "right_knee",
    "right_ankle",
  ],
  side_bend: ["left_shoulder", "right_shoulder", "left_hip", "right_hip"],
};

const EXERCISE_SEGMENTS = {
  squat: [
    ["left_hip", "left_knee"],
    ["left_knee", "left_ankle"],
    ["right_hip", "right_knee"],
    ["right_knee", "right_ankle"],
  ],
  bicep_curl: [
    ["left_shoulder", "left_elbow"],
    ["left_elbow", "left_wrist"],
    ["right_shoulder", "right_elbow"],
    ["right_elbow", "right_wrist"],
  ],
  shoulder_abduction: [
    ["left_shoulder", "left_elbow"],
    ["left_elbow", "left_wrist"],
    ["right_shoulder", "right_elbow"],
    ["right_elbow", "right_wrist"],
  ],
  knee_extension: [
    ["left_hip", "left_knee"],
    ["left_knee", "left_ankle"],
    ["right_hip", "right_knee"],
    ["right_knee", "right_ankle"],
  ],
  leg_raise: [
    ["left_hip", "left_knee"],
    ["left_knee", "left_ankle"],
    ["right_hip", "right_knee"],
    ["right_knee", "right_ankle"],
  ],
  side_bend: [
    ["left_shoulder", "left_hip"],
    ["right_shoulder", "right_hip"],
  ],
};

function toVec(point) {
  return [point.x, point.y];
}

function calculateAngle(a, b, c) {
  const A = toVec(a);
  const B = toVec(b);
  const C = toVec(c);
  const radians =
    Math.atan2(C[1] - B[1], C[0] - B[0]) -
    Math.atan2(A[1] - B[1], A[0] - B[0]);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

function getKeypoint(pose, name) {
  if (!pose || !pose.keypoints) return null;
  const target = name.toLowerCase();
  const kp = pose.keypoints.find((k) => {
    const n = (k.name || k.part || k.bodyPart || "")
      .toString()
      .toLowerCase();
    return n === target;
  });
  if (!kp) return null;
  return { x: kp.x, y: kp.y };
}

function findKp(keypoints, name) {
  if (!keypoints) return null;
  const target = name.toLowerCase();
  return keypoints.find((k) => {
    const n = (k.name || k.part || k.bodyPart || "")
      .toString()
      .toLowerCase();
    return n === target;
  });
}

// Helper to mirror X for front camera (selfie view)
const mapX = (x, isFront = true) => (isFront ? 1 - x : x);

export default function LiveWorkoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const exerciseKey = params.exerciseKey || "squat";
  const name = params.name || "Squats";
  const repsTarget = Number(params.reps || 10);
  const totalSets = Number(params.sets || 1);
  const doctor = params.doctor || "Dr. Sharma";
  const patientName = params.patientName || "";
  const patientId = params.patientId || "";

  const [hasPermission, setHasPermission] = useState(null);
  const cameraRef = useRef(null);

  // NEW: camera facing state
  const [facing, setFacing] = useState("front"); // "front" | "back"

  const [angle, setAngle] = useState(0);
  const [stage, setStage] = useState("-");
  const [count, setCount] = useState(0);
  const [totalRepsDone, setTotalRepsDone] = useState(0);
  const [formLabel, setFormLabel] = useState("Good");
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [setCompleted, setSetCompleted] = useState(false);
  const [currentSet, setCurrentSet] = useState(1);
  const [pdfUrl, setPdfUrl] = useState(null);

  const [poseKeypoints, setPoseKeypoints] = useState([]);
  const frameTimerRef = useRef(null);
  const isCapturingRef = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web") {
      setHasPermission(true);
      return;
    }
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  useEffect(() => {
    if (!running || sessionEnded) return;
    const id = setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [running, sessionEnded]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!hasPermission) return;
    if (!running || sessionEnded || setCompleted) {
      if (frameTimerRef.current) {
        clearInterval(frameTimerRef.current);
        frameTimerRef.current = null;
      }
      return;
    }

    frameTimerRef.current = setInterval(() => {
      captureAndAnalyzeFrame();
    }, 800);

    return () => {
      if (frameTimerRef.current) {
        clearInterval(frameTimerRef.current);
        frameTimerRef.current = null;
      }
    };
  }, [hasPermission, running, sessionEnded, setCompleted]);

  const captureAndAnalyzeFrame = async () => {
    if (!cameraRef.current) return;
    if (isCapturingRef.current) return;
    isCapturingRef.current = true;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.3,
        skipProcessing: true,
      });

      if (!photo || !photo.base64) {
        isCapturingRef.current = false;
        return;
      }

      const res = await fetch(`${API_BASE}/analyze_frame`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_base64: photo.base64,
          exercise_key: exerciseKey,
        }),
      });

      if (!res.ok) {
        isCapturingRef.current = false;
        return;
      }

      const data = await res.json();
      const pose = data.pose || { keypoints: [] };
      setPoseKeypoints(pose.keypoints || []);
      updateFromPose(pose);
    } catch (e) {
      console.log("capture/analyze error:", e);
    } finally {
      isCapturingRef.current = false;
    }
  };

  const updateFromPose = (pose) => {
    if (!running || sessionEnded || setCompleted || !pose) return;

    let angles = [];

    if (exerciseKey === "squat") {
      const leftHip = getKeypoint(pose, "left_hip");
      const leftKnee = getKeypoint(pose, "left_knee");
      const leftAnkle = getKeypoint(pose, "left_ankle");
      const rightHip = getKeypoint(pose, "right_hip");
      const rightKnee = getKeypoint(pose, "right_knee");
      const rightAnkle = getKeypoint(pose, "right_ankle");
      if (leftHip && leftKnee && leftAnkle) {
        angles.push(calculateAngle(leftHip, leftKnee, leftAnkle));
      }
      if (rightHip && rightKnee && rightAnkle) {
        angles.push(calculateAngle(rightHip, rightKnee, rightAnkle));
      }
    } else if (
      exerciseKey === "bicep_curl" ||
      exerciseKey === "shoulder_abduction"
    ) {
      const leftShoulder = getKeypoint(pose, "left_shoulder");
      const leftElbow = getKeypoint(pose, "left_elbow");
      const leftWrist = getKeypoint(pose, "left_wrist");
      const rightShoulder = getKeypoint(pose, "right_shoulder");
      const rightElbow = getKeypoint(pose, "right_elbow");
      const rightWrist = getKeypoint(pose, "right_wrist");
      if (leftShoulder && leftElbow && leftWrist) {
        angles.push(calculateAngle(leftShoulder, leftElbow, leftWrist));
      }
      if (rightShoulder && rightElbow && rightWrist) {
        angles.push(calculateAngle(rightShoulder, rightElbow, rightWrist));
      }
    } else if (exerciseKey === "knee_extension" || exerciseKey === "leg_raise") {
      const leftHip = getKeypoint(pose, "left_hip");
      const leftKnee = getKeypoint(pose, "left_knee");
      const leftAnkle = getKeypoint(pose, "left_ankle");
      const rightHip = getKeypoint(pose, "right_hip");
      const rightKnee = getKeypoint(pose, "right_knee");
      const rightAnkle = getKeypoint(pose, "right_ankle");
      if (leftHip && leftKnee && leftAnkle) {
        angles.push(calculateAngle(leftHip, leftKnee, leftAnkle));
      }
      if (rightHip && rightKnee && rightAnkle) {
        angles.push(calculateAngle(rightHip, rightKnee, rightAnkle));
      }
    } else if (exerciseKey === "side_bend") {
      const leftShoulder = getKeypoint(pose, "left_shoulder");
      const rightShoulder = getKeypoint(pose, "right_shoulder");
      const leftHip = getKeypoint(pose, "left_hip");
      const rightHip = getKeypoint(pose, "right_hip");
      if (leftShoulder && leftHip && rightHip) {
        angles.push(calculateAngle(leftShoulder, leftHip, rightHip));
      }
      if (rightShoulder && rightHip && leftHip) {
        angles.push(calculateAngle(rightShoulder, rightHip, leftHip));
      }
    }

    if (!angles.length) return;

    const avgAngle = angles.reduce((sum, a) => sum + a, 0) / angles.length;
    setAngle(avgAngle);

    if (exerciseKey === "bicep_curl") {
      if (avgAngle < 70) setFormLabel("Great contraction!");
      else if (avgAngle > 145) setFormLabel("Full extension!");
      else setFormLabel("Complete your motion fully.");
    } else if (exerciseKey === "squat") {
      if (avgAngle < 95) setFormLabel("Nice deep squat!");
      else if (avgAngle > 160) setFormLabel("Standing tall.");
      else setFormLabel("Try going a bit lower.");
    } else if (exerciseKey === "shoulder_abduction") {
      setFormLabel(
        avgAngle > 120 ? "Good arm raise!" : "Lift higher for full range."
      );
    } else if (exerciseKey === "knee_extension") {
      setFormLabel(
        avgAngle > 160 ? "Full knee extension achieved!" : "Straighten knee more."
      );
    } else if (exerciseKey === "leg_raise") {
      setFormLabel(
        avgAngle > 140 ? "Leg raised high enough!" : "Lift leg higher."
      );
    } else if (exerciseKey === "side_bend") {
      setFormLabel(
        avgAngle > 15 && avgAngle < 35
          ? "Nice side bend!"
          : "Bend slightly more to side."
      );
    } else {
      setFormLabel(
        avgAngle > 170 || avgAngle < 30 ? "Check Form" : "Good"
      );
    }

    const downThresh = 98;
    const upThresh = 150;

    setStage((prevStage) => {
      let newStage = prevStage;
      let repHappened = false;

      if (
        exerciseKey === "bicep_curl" ||
        exerciseKey === "shoulder_abduction"
      ) {
        if (avgAngle > 150) newStage = "down";
        if (avgAngle < 50 && prevStage === "down") {
          newStage = "up";
          repHappened = true;
        }
      } else if (
        exerciseKey === "squat" ||
        exerciseKey === "knee_extension" ||
        exerciseKey === "leg_raise"
      ) {
        if (avgAngle > upThresh) newStage = "up";
        if (avgAngle < downThresh && prevStage === "up") {
          newStage = "down";
          repHappened = true;
        }
      } else if (exerciseKey === "side_bend") {
        if (avgAngle > 40) newStage = "up";
        if (avgAngle < 25 && prevStage === "up") {
          newStage = "down";
          repHappened = true;
        }
      }

      if (repHappened) {
        setCount((prevCount) => {
          const newCount = prevCount + 1;
          setTotalRepsDone((prevTotal) => prevTotal + 1);
          if (newCount >= repsTarget) {
            setSetCompleted(true);
            setRunning(false);
            if (currentSet >= totalSets) {
              setSessionEnded(true);
            }
          }
          return newCount;
        });
      }

      return newStage;
    });
  };

  const handleEndSession = () => {
    setRunning(false);
    setSessionEnded(true);
    setSetCompleted(false);
  };

  const handleStartNextSet = () => {
    if (currentSet >= totalSets) return;
    setCurrentSet((prev) => Math.min(prev + 1, totalSets));
    setCount(0);
    setAngle(0);
    setStage("-");
    setFormLabel("Good");
    setSetCompleted(false);
    setRunning(true);
    setPdfUrl(null);
  };

  const handleRedo = () => {
    setAngle(0);
    setStage("-");
    setCount(0);
    setTotalRepsDone(0);
    setFormLabel("Good");
    setElapsed(0);
    setSessionEnded(false);
    setSetCompleted(false);
    setCurrentSet(1);
    setRunning(true);
    setPdfUrl(null);
    setPoseKeypoints([]);
  };

  const handleBack = () => {
    router.back();
  };

  // NEW: toggle camera front/back
  const handleToggleCamera = () => {
    setFacing((prev) => (prev === "front" ? "back" : "front"));
  };

  const handleGeneratePdf = async () => {
    try {
      const duration = elapsed;
      const totalReps = totalRepsDone;
      const assignedTotalReps = repsTarget * totalSets;
      const avgTime = totalReps > 0 ? duration / totalReps : 0;
      const formScore = formLabel === "Good" ? 0.9 : 0.7;
      const exerciseName = name || exerciseKey;

      const payload = {
        patient_name: patientName || "Somay Singh",
        patient_id: patientId || "P-2025-001",
        exercise: exerciseName,
        exercise_key: exerciseKey,
        reps: totalReps,
        assigned_reps: assignedTotalReps,
        sets: totalSets,
        duration,
        avg_time: avgTime,
        form_score: formScore,
      };

      const res = await fetch(`${API_BASE}/generate_report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        Alert.alert("Error", "Failed to generate PDF report.");
        return;
      }

      const data = await res.json();
      const fullUrl = `${API_BASE}${data.url}`;
      setPdfUrl(fullUrl);
      Alert.alert("Report Ready", "Tap 'Open PDF' to view or download.");
    } catch (_e) {
      Alert.alert("Error", "Something went wrong while generating the report.");
    }
  };

  const handleOpenPdf = () => {
    if (pdfUrl) {
      Linking.openURL(pdfUrl);
    } else {
      Alert.alert("No PDF", "Generate the PDF first.");
    }
  };

  if (Platform.OS !== "web" && hasPermission === null) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>Requesting camera permission…</Text>
      </SafeAreaView>
    );
  }

  if (Platform.OS !== "web" && hasPermission === false) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={{ textAlign: "center", paddingHorizontal: 16 }}>
          Camera access is required for live tracking. Please enable it in
          settings.
        </Text>
      </SafeAreaView>
    );
  }

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const progress = Math.min(1, count / (repsTarget || 1));
  const progressPercent = Math.round(progress * 100);

  const trackedJoints = EXERCISE_JOINTS[exerciseKey] || [];
  const segments = EXERCISE_SEGMENTS[exerciseKey] || [];
  const minScore = 0.4;

  const isFrontCamera = Platform.OS !== "web" && facing === "front";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.iconBtn}>
          <Ionicons
            name="chevron-back"
            size={22}
            color={ColorTheme.fourth}
          />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{name}</Text>
          <Text style={styles.headerSub}>Live tracking</Text>
          {patientName ? (
            <Text style={styles.headerPatient}>
              Patient: {patientName}
              {patientId ? ` • ID: ${patientId}` : ""}
            </Text>
          ) : null}
        </View>
        <View style={styles.chip}>
          <Ionicons
            name="person-outline"
            size={14}
            color={ColorTheme.first}
            style={{ marginRight: 4 }}
          />
          <Text style={styles.chipText}>{doctor}</Text>
        </View>
      </View>

      <View style={styles.cameraWrapper}>
        {Platform.OS === "web" ? (
          <View
            style={[
              styles.camera,
              { alignItems: "center", justifyContent: "center" },
            ]}
          >
            <Text style={{ color: "#fff", padding: 12, textAlign: "center" }}>
              Camera preview is not available on web.{"\n"}
              Please run this screen in Expo Go on a physical device.
            </Text>
          </View>
        ) : (
          <CameraView
            style={styles.camera}
            ref={cameraRef}
            facing={facing}
          />
        )}

        {/* Camera toggle button */}
        {Platform.OS !== "web" && (
          <TouchableOpacity
            style={styles.cameraSwitchBtn}
            onPress={handleToggleCamera}
          >
            <Ionicons
              name="camera-reverse-outline"
              size={20}
              color={ColorTheme.first}
            />
          </TouchableOpacity>
        )}

        <Svg
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          viewBox="0 0 1 1"
        >
          {segments.map(([a, b], idx) => {
            const kpA = findKp(poseKeypoints, a);
            const kpB = findKp(poseKeypoints, b);
            if (
              !kpA ||
              !kpB ||
              (kpA.score ?? 0) < minScore ||
              (kpB.score ?? 0) < minScore
            )
              return null;
            return (
              <Line
                key={`seg-${idx}`}
                x1={mapX(kpA.x, isFrontCamera)}
                y1={kpA.y}
                x2={mapX(kpB.x, isFrontCamera)}
                y2={kpB.y}
                stroke="#4ade80"
                strokeWidth={0.012}
              />
            );
          })}
          {trackedJoints.map((j, idx) => {
            const kp = findKp(poseKeypoints, j);
            if (!kp || (kp.score ?? 0) < minScore) return null;
            return (
              <Circle
                key={`pt-${idx}`}
                cx={mapX(kp.x, isFrontCamera)}
                cy={kp.y}
                r={0.015}
                fill="#22d3ee"
              />
            );
          })}
        </Svg>

        <View style={styles.cameraOverlay}>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeLabel}>Angle</Text>
              <Text style={styles.badgeValue}>{Math.round(angle)}°</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeLabel}>Stage</Text>
              <Text style={styles.badgeValue}>{stage}</Text>
            </View>
            <View
              style={[
                styles.formBadge,
                formLabel === "Good" ? styles.formGood : styles.formCheck,
              ]}
            >
              <Ionicons
                name={
                  formLabel === "Good"
                    ? "checkmark-circle-outline"
                    : "information-circle-outline"
                }
                size={14}
                color={ColorTheme.fourth}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.formText}>{formLabel}</Text>
            </View>
          </View>

          <View style={styles.counterBox}>
            <Text style={styles.counterLabel}>
              Reps (Set {currentSet}/{totalSets})
            </Text>
            <Text style={styles.counterMain}>
              {count} / {repsTarget}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { flex: progress || 0.02 }]}
              />
              <View
                style={[styles.progressEmpty, { flex: 1 - (progress || 0.02) }]}
              />
            </View>
            <Text style={styles.progressText}>
              {progressPercent}% of this set
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.bottomPanel}>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Time</Text>
            <Text style={styles.statValue}>
              {mins.toString().padStart(2, "0")}:
              {secs.toString().padStart(2, "0")}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Sets</Text>
            <Text style={styles.statValue}>
              {currentSet} / {totalSets}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Total Reps Done</Text>
            <Text style={styles.statValue}>{totalRepsDone}</Text>
          </View>
        </View>

        {!sessionEnded && !setCompleted && (
          <TouchableOpacity
            style={[styles.mainBtn, styles.stopBtn]}
            onPress={handleEndSession}
          >
            <Ionicons
              name="stop-circle"
              size={18}
              color={ColorTheme.first}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.mainBtnText}>End Session</Text>
          </TouchableOpacity>
        )}

        {setCompleted && !sessionEnded && (
          <View style={styles.endActions}>
            <Text style={styles.endTitle}>Set {currentSet} completed</Text>
            <Text style={styles.endSub}>
              Reps this set: {count} • Total reps: {totalRepsDone}
            </Text>

            <View style={styles.endButtonsRow}>
              <TouchableOpacity
                style={[styles.mainBtn, styles.secondaryBtn]}
                onPress={handleEndSession}
              >
                <Text
                  style={[
                    styles.mainBtnText,
                    { color: ColorTheme.fourth },
                  ]}
                >
                  End Workout
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mainBtn, styles.primaryBtn]}
                onPress={handleStartNextSet}
              >
                <Text
                  style={[
                    styles.mainBtnText,
                    { color: ColorTheme.first },
                  ]}
                >
                  Start Next Set
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {sessionEnded && (
          <View style={styles.endActions}>
            <Text style={styles.endTitle}>Session completed</Text>
            <Text style={styles.endSub}>
              Total reps: {totalRepsDone} • Duration: {elapsed.toFixed(1)} sec
            </Text>

            <View style={styles.endButtonsRow}>
              <TouchableOpacity
                style={[styles.mainBtn, styles.secondaryBtn]}
                onPress={handleRedo}
              >
                <Text
                  style={[
                    styles.mainBtnText,
                    { color: ColorTheme.fourth },
                  ]}
                >
                  Repeat Workout
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mainBtn, styles.primaryBtn]}
                onPress={handleGeneratePdf}
              >
                <Text
                  style={[
                    styles.mainBtnText,
                    { color: ColorTheme.first },
                  ]}
                >
                  Generate PDF
                </Text>
              </TouchableOpacity>
            </View>

            {pdfUrl && (
              <TouchableOpacity
                style={[styles.mainBtn, styles.openBtn]}
                onPress={handleOpenPdf}
              >
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color={ColorTheme.first}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.mainBtnText,
                    { color: ColorTheme.first },
                  ]}
                >
                  Open PDF
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ColorTheme.first },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  iconBtn: { padding: 6, marginRight: 6 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: ColorTheme.fourth },
  headerSub: { fontSize: 12, color: ColorTheme.fourth, opacity: 0.7 },
  headerPatient: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: ColorTheme.fourth,
  },
  chipText: { fontSize: 11, fontWeight: "600", color: ColorTheme.first },
  cameraWrapper: {
    flex: 1.2,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  camera: { flex: 1 },
  // NEW: camera switch button
  cameraSwitchBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 20,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(15,23,42,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 10,
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  badge: {
    backgroundColor: "rgba(15,23,42,0.85)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeLabel: { fontSize: 10, color: "#cbd5f5" },
  badgeValue: { fontSize: 14, fontWeight: "700", color: "#e5e7ff" },
  formBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  formGood: { backgroundColor: "rgba(34,197,94,0.26)" },
  formCheck: { backgroundColor: "rgba(59,130,246,0.28)" },
  formText: {
    fontSize: 11,
    fontWeight: "600",
    color: " rgba(255, 252, 252, 1)",
  },
  counterBox: {
    marginTop: 4,
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(15,23,42,0.88)",
  },
  counterLabel: { fontSize: 10, color: "#cbd5f5" },
  counterMain: { fontSize: 24, fontWeight: "800", color: "#f9fafb" },
  progressBar: {
    flexDirection: "row",
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 4,
    backgroundColor: "rgba(148,163,184,0.5)",
  },
  progressFill: { backgroundColor: "#22c55e" },
  progressEmpty: { backgroundColor: "transparent" },
  progressText: { marginTop: 2, fontSize: 10, color: "#e5e7eb" },
  bottomPanel: {
    flex: 0.9,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: ColorTheme.second,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  stat: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: "rgba(15,23,42,0.04)",
    minWidth: "30%",
  },
  statLabel: { fontSize: 11, color: "#6b7280" },
  statValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "700",
    color: ColorTheme.fourth,
  },
  mainBtn: {
    height: 46,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  mainBtnText: { fontSize: 14, fontWeight: "700" },
  stopBtn: { marginTop: 6, backgroundColor: "#fecaca" },
  endActions: { marginTop: 4 },
  endTitle: { fontSize: 16, fontWeight: "700", color: ColorTheme.fourth },
  endSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  endButtonsRow: {
    flexDirection: "row",
    marginTop: 10,
    justifyContent: "space-between",
  },
  primaryBtn: { flex: 0.5, backgroundColor: ColorTheme.fourth },
  secondaryBtn: { flex: 0.48, backgroundColor: "#e5e7eb" },
  openBtn: {
    marginTop: 8,
    backgroundColor: "#6b7280",
  },
});
