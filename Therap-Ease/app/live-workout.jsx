import { CameraView } from "expo-camera";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { usePoseStore } from "../hooks/use-pose-store";
import { PoseSkiaOverlay } from "../components/pose/PoseSkiaOverlay";

const API_BASE = "http://192.168.1.8:8000";
const FRAME_INTERVAL = 300;

export default function LiveWorkoutScreen() {
  const params = useLocalSearchParams();

  const exerciseKey = params.exerciseKey || "squat";
  const exerciseName = params.name || exerciseKey;
  const repsTarget = Number(params.reps || 10);
  const totalSets = Number(params.sets || 1);
  const patientName = params.patientName || "Somay Singh";
  const patientId = params.patientId || "P-2025-001";

  const cameraRef = useRef(null);
  const frameTimer = useRef(null);

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

  const { processFrame, angleSV, keypointsSV } =
    usePoseStore(exerciseKey, onRep);

  /* ---------------- ANGLE UI (THROTTLED) ---------------- */

  useEffect(() => {
    const id = setInterval(() => {
      setAngleUI(Math.round(angleSV.value || 0));
    }, 250);
    return () => clearInterval(id);
  }, []);

  /* ---------------- ELAPSED TIME ---------------- */

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setElapsed((t) => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  /* ---------------- FRAME CAPTURE ---------------- */

  const captureFrame = async () => {
    if (!cameraRef.current || !running) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.3,
        skipProcessing: true,
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
      processFrame(data.pose || { keypoints: [] });
    } catch {
      // ignore dropped frames
    }
  };

  useEffect(() => {
    if (!running) return;
    frameTimer.current = setInterval(captureFrame, FRAME_INTERVAL);
    return () => clearInterval(frameTimer.current);
  }, [running]);

  /* ---------------- ACTIONS ---------------- */

  const toggleCamera = () =>
    setFacing((f) => (f === "front" ? "back" : "front"));

  const endWorkout = () => {
    setRunning(false);
    setSetCompleted(false);
    setWorkoutEnded(true);
  };

  const startNextSet = () => {
    setCurrentSet((s) => s + 1);
    setRepsThisSet(0);
    setSetCompleted(false);
    setRunning(true);
  };

  const generatePdf = async () => {
    if (generatingPdf) return;
    setGeneratingPdf(true);

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
        form_score: 0.85, // placeholder (can be improved later)
      };

      const res = await fetch(`${API_BASE}/generate_report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setPdfUrl(`${API_BASE}${data.url}`);
    } catch {
      // handle silently
    } finally {
      setGeneratingPdf(false);
    }
  };

  const openPdf = () => {
    if (pdfUrl) Linking.openURL(pdfUrl);
  };

  const repeatWorkout = () => {
    setCurrentSet(1);
    setRepsThisSet(0);
    setTotalReps(0);
    setElapsed(0);
    setRunning(true);
    setWorkoutEnded(false);
    setSetCompleted(false);
    setPdfUrl(null);
  };

  /* ---------------- UI ---------------- */

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing={facing}
      />

      <PoseSkiaOverlay keypointsSV={keypointsSV} />

      {/* Camera toggle */}
      <TouchableOpacity
        onPress={toggleCamera}
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          padding: 10,
          borderRadius: 20,
          backgroundColor: "rgba(0,0,0,0.6)",
        }}
      >
        <Ionicons name="camera-reverse" size={22} color="#fff" />
      </TouchableOpacity>

      {/* End workout anytime */}
      {!workoutEnded && (
        <TouchableOpacity
          onPress={endWorkout}
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            padding: 10,
            borderRadius: 20,
            backgroundColor: "#fecaca",
          }}
        >
          <Text style={{ fontWeight: "700" }}>End</Text>
        </TouchableOpacity>
      )}

      {/* Stats */}
      <View style={{ position: "absolute", bottom: 40, left: 20 }}>
        <Text style={{ color: "#fff", fontSize: 20 }}>
          Set {currentSet}/{totalSets}
        </Text>
        <Text style={{ color: "#fff", fontSize: 18 }}>
          Reps: {repsThisSet}/{repsTarget}
        </Text>
        <Text style={{ color: "#fff" }}>
          Angle: {angleUI}°
        </Text>
        <Text style={{ color: "#9ca3af" }}>
          Time: {elapsed}s
        </Text>
      </View>

      {/* SET COMPLETED */}
      {setCompleted && !workoutEnded && (
        <OverlayBox>
          <Text style={styles.title}>Set {currentSet} completed</Text>
          <PrimaryBtn text="Start Next Set" onPress={startNextSet} />
          <SecondaryBtn text="End Workout" onPress={endWorkout} />
        </OverlayBox>
      )}

      {/* WORKOUT ENDED */}
      {workoutEnded && (
        <OverlayBox>
          <Text style={styles.title}>Workout completed</Text>
          <Text style={styles.sub}>
            Total reps: {totalReps}
          </Text>

          {!pdfUrl && (
            <PrimaryBtn
              text={generatingPdf ? "Generating..." : "Generate Report"}
              onPress={generatePdf}
            />
          )}

          {pdfUrl && (
            <PrimaryBtn text="Open PDF Report" onPress={openPdf} />
          )}

          <SecondaryBtn text="Repeat Workout" onPress={repeatWorkout} />
        </OverlayBox>
      )}
    </SafeAreaView>
  );
}

/* ---------------- REUSABLE UI ---------------- */

const OverlayBox = ({ children }) => (
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

const PrimaryBtn = ({ text, onPress }) => (
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

const SecondaryBtn = ({ text, onPress }) => (
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

const styles = {
  title: { color: "#fff", fontSize: 18, marginBottom: 6 },
  sub: { color: "#9ca3af", marginBottom: 10 },
};
