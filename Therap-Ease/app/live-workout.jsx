import { CameraView } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Text, View, TouchableOpacity, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { usePoseStore } from "../hooks/use-pose-store";
import { PoseSkiaOverlay } from "../components/pose/PoseSkiaOverlay";

const API_BASE = "http://172.28.213.100:8000";
const FRAME_INTERVAL = 300;
const MOTION_TIMEOUT_MS = 800; // how long pose keeps motion "alive"

export default function LiveWorkoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const exerciseKey = params.exerciseKey || "squat";
  const exerciseName = params.name || exerciseKey;
  const repsTarget = Number(params.reps || 10);
  const totalSets = Number(params.sets || 1);
  const patientName = params.patientName || "Somay Singh";
  const patientId = params.patientId || "P-2025-001";

  const cameraRef = useRef(null);
  const frameTimerRef = useRef(null);
  const stoppedRef = useRef(false);

  /* ---------------- UI STATE ---------------- */

  const [facing, setFacing] = useState("front");
  const [currentSet, setCurrentSet] = useState(1);
  const [repsThisSet, setRepsThisSet] = useState(0);
  const [totalReps, setTotalReps] = useState(0);
  const [angleUI, setAngleUI] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const [running, setRunning] = useState(true);
  const [setCompleted, setSetCompleted] = useState(false);
  const [workoutEnded, setWorkoutEnded] = useState(false);

  const [pdfUrl, setPdfUrl] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  /* ---------------- MOTION STATE ---------------- */

  const lastPoseTsRef = useRef(0);
  const [motionUI, setMotionUI] = useState(false);

  /* ---------------- FORM SCORE ---------------- */

  const totalFormScoreRef = useRef(0);
  const formFrameCountRef = useRef(0);

  /* ---------------- REP CALLBACK ---------------- */

  const onRep = () => {
    setRepsThisSet((r) => {
      const next = r + 1;
      setTotalReps((t) => t + 1);

      if (next >= repsTarget) {
        setRunning(false);
        setSetCompleted(true);
        if (currentSet >= totalSets) {
          setWorkoutEnded(true);
        }
      }
      return next;
    });
  };

  /* ---------------- POSE ENGINE ---------------- */

  const {
    processFrame,
    angleSV,
    keypointsSV,
    lastFormScoreRef,
  } = usePoseStore(exerciseKey, onRep);

  /* ---------------- ANGLE UI ---------------- */

  useEffect(() => {
    const id = setInterval(() => {
      setAngleUI(Math.round(angleSV.value || 0));
    }, 250);
    return () => clearInterval(id);
  }, []);

  /* ---------------- TIMER ---------------- */

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  /* ---------------- FRAME LOOP ---------------- */

  const captureFrame = async () => {
    if (
      !cameraRef.current ||
      !running ||
      stoppedRef.current
    ) {
      return;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.25,
        skipProcessing: true,
        mute: true,
      });

      const res = await fetch(`${API_BASE}/analyze_frame`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_base64: photo.base64,
          exercise_key: exerciseKey,
        }),
      });

      const data = await res.json();
      const keypoints = data.pose?.keypoints || [];

      // ✅ MOTION = POSE PRESENT
      if (keypoints.length > 0) {
        lastPoseTsRef.current = Date.now();
        setMotionUI(true);
        processFrame({ keypoints });

        if (lastFormScoreRef.current != null) {
          totalFormScoreRef.current += lastFormScoreRef.current;
          formFrameCountRef.current += 1;
        }
      } else {
        // Check timeout
        if (
          Date.now() - lastPoseTsRef.current > MOTION_TIMEOUT_MS
        ) {
          setMotionUI(false);
        }
      }
    } catch {
      // ignore dropped frames
    }
  };

  useEffect(() => {
    if (!running || workoutEnded) return;

    frameTimerRef.current = setInterval(
      captureFrame,
      FRAME_INTERVAL
    );

    return () => {
      clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
    };
  }, [running, workoutEnded]);

  /* ---------------- ACTIONS ---------------- */

  const toggleCamera = () =>
    setFacing((f) => (f === "front" ? "back" : "front"));

  const hardStopCamera = () => {
    stoppedRef.current = true;
    if (frameTimerRef.current) {
      clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
    }
  };

  const endWorkout = () => {
    hardStopCamera();
    setRunning(false);
    setWorkoutEnded(true);
    setSetCompleted(false);
  };

  const startNextSet = () => {
    setCurrentSet((s) => s + 1);
    setRepsThisSet(0);
    setSetCompleted(false);
    setRunning(true);
    stoppedRef.current = false;
  };

  const generatePdf = async () => {
    if (generatingPdf) return;
    setGeneratingPdf(true);

    const avgFormScore =
      formFrameCountRef.current > 0
        ? totalFormScoreRef.current /
          formFrameCountRef.current
        : 0;

    try {
      const payload = {
        patient_name: patientName,
        patient_id: patientId,
        exercise: exerciseName,
        exercise_key: exerciseKey,
        reps: totalReps,
        assigned_reps: repsTarget * totalSets,
        sets: totalSets,
        duration: elapsed,
        avg_time: totalReps ? elapsed / totalReps : 0,
        form_score: avgFormScore,
      };

      const res = await fetch(
        `${API_BASE}/generate_report`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      setPdfUrl(`${API_BASE}${data.url}`);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const repeatWorkout = () => {
    stoppedRef.current = false;
    setCurrentSet(1);
    setRepsThisSet(0);
    setTotalReps(0);
    setElapsed(0);
    setRunning(true);
    setWorkoutEnded(false);
    setSetCompleted(false);
    setPdfUrl(null);
    setMotionUI(false);

    totalFormScoreRef.current = 0;
    formFrameCountRef.current = 0;
    lastPoseTsRef.current = 0;
  };

  const goBack = () => {
    hardStopCamera();
    router.back();
  };

  /* ---------------- UI ---------------- */

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      {!workoutEnded && (
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing={facing}
        />
      )}

      <PoseSkiaOverlay keypointsSV={keypointsSV} />

      <TouchableOpacity onPress={goBack} style={btn({ left: 20 })}>
        <Ionicons name="chevron-back" size={22} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity onPress={toggleCamera} style={btn({ right: 20 })}>
        <Ionicons name="camera-reverse" size={22} color="#fff" />
      </TouchableOpacity>

      {!workoutEnded && (
        <TouchableOpacity onPress={endWorkout} style={endBtn}>
          <Text style={{ fontWeight: "700" }}>End</Text>
        </TouchableOpacity>
      )}

      <View style={{ position: "absolute", bottom: 40, left: 20 }}>
        <Text style={txt(20)}>
          Set {currentSet}/{totalSets}
        </Text>
        <Text style={txt(18)}>
          Reps: {repsThisSet}/{repsTarget}
        </Text>
        <Text style={txt(16)}>
          Angle: {angleUI}°
        </Text>
        <Text style={{ color: "#9ca3af" }}>
          Time: {elapsed}s
        </Text>
        <Text
          style={{
            color: motionUI ? "#22c55e" : "#9ca3af",
          }}
        >
          {motionUI ? "Motion detected" : "Idle"}
        </Text>
      </View>

      {workoutEnded && (
        <Overlay>
          <Title>Workout completed</Title>
          {!pdfUrl && (
            <Primary
              text={
                generatingPdf
                  ? "Generating..."
                  : "Generate Report"
              }
              onPress={generatePdf}
            />
          )}
          {pdfUrl && (
            <Primary
              text="Open PDF Report"
              onPress={() => Linking.openURL(pdfUrl)}
            />
          )}
          <Secondary
            text="Repeat Workout"
            onPress={repeatWorkout}
          />
        </Overlay>
      )}
    </SafeAreaView>
  );
}

/* ---------------- UI HELPERS ---------------- */

const btn = (pos) => ({
  position: "absolute",
  top: 20,
  padding: 10,
  borderRadius: 20,
  backgroundColor: "rgba(0,0,0,0.6)",
  zIndex: 50,
  ...pos,
});

const endBtn = {
  position: "absolute",
  top: 40,
  alignSelf: "center",
  backgroundColor: "#fecaca",
  padding: 15,
  borderRadius: 20,
};

const Overlay = ({ children }) => (
  <View
    style={{
      position: "absolute",
      bottom: 120,
      left: 20,
      right: 20,
      padding: 16,
      borderRadius: 12,
      backgroundColor: "rgba(0,0,0,0.85)",
    }}
  >
    {children}
  </View>
);

const Primary = ({ text, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      backgroundColor: "#22c55e",
      padding: 12,
      borderRadius: 8,
      marginTop: 10,
      alignItems: "center",
    }}
  >
    <Text style={{ fontWeight: "700" }}>{text}</Text>
  </TouchableOpacity>
);

const Secondary = ({ text, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      backgroundColor: "#e5e7eb",
      padding: 12,
      borderRadius: 8,
      marginTop: 8,
      alignItems: "center",
    }}
  >
    <Text style={{ fontWeight: "700" }}>{text}</Text>
  </TouchableOpacity>
);

const Title = ({ children }) => (
  <Text
    style={{
      color: "#fff",
      fontSize: 18,
      marginBottom: 8,
    }}
  >
    {children}
  </Text>
);

const txt = (size) => ({
  color: "#fff",
  fontSize: size,
});
