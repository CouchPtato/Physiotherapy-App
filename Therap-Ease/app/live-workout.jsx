import { CameraView } from "expo-camera";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Text, View, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { usePoseStore } from "../hooks/use-pose-store";
import { PoseSkiaOverlay } from "../components/pose/PoseSkiaOverlay";

const API_BASE = "http://192.168.1.8:8000";
const FRAME_INTERVAL = 300;

export default function LiveWorkoutScreen() {
  const params = useLocalSearchParams();

  const exerciseKey = params.exerciseKey || "squat";
  const repsTarget = Number(params.reps || 10);
  const totalSets = Number(params.sets || 1);

  const cameraRef = useRef(null);
  const frameTimer = useRef(null);

  /* ---------------- UI STATE (LOW FREQUENCY) ---------------- */

  const [facing, setFacing] = useState("front");
  const [currentSet, setCurrentSet] = useState(1);
  const [repsThisSet, setRepsThisSet] = useState(0);
  const [totalReps, setTotalReps] = useState(0);
  const [angleUI, setAngleUI] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const [setCompleted, setSetCompleted] = useState(false);
  const [workoutCompleted, setWorkoutCompleted] = useState(false);
  const [running, setRunning] = useState(true);

  /* ---------------- REP CALLBACK ---------------- */

  const onRep = () => {
    setRepsThisSet((r) => {
      const next = r + 1;
      setTotalReps((t) => t + 1);

      if (next >= repsTarget) {
        setRunning(false);
        setSetCompleted(true);

        if (currentSet >= totalSets) {
          setWorkoutCompleted(true);
        }
      }
      return next;
    });
  };

  /* ---------------- POSE ENGINE ---------------- */

  const { processFrame, angleSV, keypointsSV } =
    usePoseStore(exerciseKey, onRep);

  /* ---------------- ANGLE UI THROTTLE ---------------- */

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

  const startNextSet = () => {
    setCurrentSet((s) => s + 1);
    setRepsThisSet(0);
    setSetCompleted(false);
    setRunning(true);
  };

  const redoWorkout = () => {
    setCurrentSet(1);
    setRepsThisSet(0);
    setTotalReps(0);
    setElapsed(0);
    setSetCompleted(false);
    setWorkoutCompleted(false);
    setRunning(true);
  };

  const toggleCamera = () => {
    setFacing((f) => (f === "front" ? "back" : "front"));
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

      {/* Stats */}
      <View style={{ position: "absolute", bottom: 40, left: 20 }}>
        <Text style={{ color: "#fff", fontSize: 22 }}>
          Set {currentSet}/{totalSets}
        </Text>
        <Text style={{ color: "#fff", fontSize: 20 }}>
          Reps: {repsThisSet}/{repsTarget}
        </Text>
        <Text style={{ color: "#fff", fontSize: 18 }}>
          Angle: {angleUI}°
        </Text>
        <Text style={{ color: "#9ca3af", fontSize: 14 }}>
          Time: {elapsed}s
        </Text>
      </View>

      {/* SET COMPLETED */}
      {setCompleted && !workoutCompleted && (
        <View
          style={{
            position: "absolute",
            bottom: 120,
            left: 20,
            right: 20,
            padding: 16,
            borderRadius: 12,
            backgroundColor: "rgba(0,0,0,0.8)",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 18, marginBottom: 8 }}>
            Set {currentSet} completed
          </Text>

          <TouchableOpacity
            onPress={startNextSet}
            style={{
              backgroundColor: "#22c55e",
              padding: 12,
              borderRadius: 8,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#000", fontWeight: "700" }}>
              Start Next Set
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* WORKOUT COMPLETED */}
      {workoutCompleted && (
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
          <Text style={{ color: "#fff", fontSize: 18, marginBottom: 8 }}>
            Workout completed 🎉
          </Text>

          <Text style={{ color: "#9ca3af", marginBottom: 12 }}>
            Total reps: {totalReps}
          </Text>

          <TouchableOpacity
            onPress={redoWorkout}
            style={{
              backgroundColor: "#e5e7eb",
              padding: 12,
              borderRadius: 8,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#000", fontWeight: "700" }}>
              Repeat Workout
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
