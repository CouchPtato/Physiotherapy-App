import { CameraView } from "expo-camera";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import { Text, View, TouchableOpacity, Linking, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { usePoseStore } from "../hooks/use-pose-store";
import { PoseSkiaOverlay } from "../components/pose/PoseSkiaOverlay";
import { useTheme } from "../hooks/use-theme";

import { API_BASE } from "../constants/api";

const FRAME_INTERVAL = 300;
const MOTION_TIMEOUT_MS = 800;

// Colors
const COLORS = {
  primary: "#6366f1",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  dark: "#1f2937",
  light: "#f9fafb",
  muted: "#6b7280",
};

export default function LiveWorkoutScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params || {};
  const { isDarkMode } = useTheme();

  const exerciseKey = params.exerciseKey || "squat";
  const exerciseName = params.name || exerciseKey;
  const repsTarget = Number(params.reps || 10);
  const totalSets = Number(params.sets || 1);
  const patientName = params.patientName || "Somay Singh";
  const patientId = params.patientId || "P-2025-001";

  const dynamicColors = {
    containerBg: isDarkMode ? "#0F172A" : "#F9FAFB",
    cardBg: isDarkMode ? "#1F2937" : "#fff",
    text: isDarkMode ? "#F9FAFB" : "#1F2937",
    textSecondary: isDarkMode ? "#9CA3AF" : "#6B7280",
    border: isDarkMode ? "#374151" : "#E5E7EB",
  };

  const cameraRef = useRef(null);
  const frameTimerRef = useRef(null);
  const stoppedRef = useRef(false);

  const [facing, setFacing] = useState("front");
  const [currentSet, setCurrentSet] = useState(1);
  const [repsThisSet, setRepsThisSet] = useState(0);
  const [totalReps, setTotalReps] = useState(0);
  const [angleUI, setAngleUI] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [workoutEnded, setWorkoutEnded] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const lastPoseTsRef = useRef(0);
  const [motionUI, setMotionUI] = useState(false);

  const totalFormScoreRef = useRef(0);
  const formFrameCountRef = useRef(0);

  const onRep = () => {
    setRepsThisSet((r) => {
      const next = r + 1;
      setTotalReps((t) => t + 1);
      if (next >= repsTarget) {
        setRunning(false);
        if (currentSet >= totalSets) {
          setWorkoutEnded(true);
        }
      }
      return next;
    });
  };

  const { processFrame, angleSV, keypointsSV, lastFormScoreRef } = usePoseStore(exerciseKey, onRep);

  useEffect(() => {
    const id = setInterval(() => {
      setAngleUI(Math.round(angleSV.value || 0));
    }, 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const captureFrame = async () => {
    if (!cameraRef.current || !running || stoppedRef.current) return;
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

      if (keypoints.length > 0) {
        lastPoseTsRef.current = Date.now();
        setMotionUI(true);
        processFrame({ keypoints });

        if (lastFormScoreRef.current != null) {
          totalFormScoreRef.current += lastFormScoreRef.current;
          formFrameCountRef.current += 1;
        }
      } else if (Date.now() - lastPoseTsRef.current > MOTION_TIMEOUT_MS) {
        setMotionUI(false);
      }
    } catch {
      // Ignore dropped frames
    }
  };

  useEffect(() => {
    if (!running || workoutEnded) return;
    frameTimerRef.current = setInterval(captureFrame, FRAME_INTERVAL);
    return () => {
      clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
    };
  }, [running, workoutEnded]);

  const toggleCamera = () => setFacing((f) => (f === "front" ? "back" : "front"));

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
  };

  const startNextSet = () => {
    setCurrentSet((s) => s + 1);
    setRepsThisSet(0);
    setRunning(true);
    stoppedRef.current = false;
  };

  const generatePdf = async () => {
    if (generatingPdf) return;
    setGeneratingPdf(true);

    const avgFormScore =
      formFrameCountRef.current > 0
        ? totalFormScoreRef.current / formFrameCountRef.current
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

      const res = await fetch(`${API_BASE}/generate_report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercentage = (repsThisSet / repsTarget) * 100;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamicColors.containerBg }]}>
      {!workoutEnded && (
        <CameraView ref={cameraRef} style={styles.camera} facing={facing} />
      )}

      <PoseSkiaOverlay keypointsSV={keypointsSV} />

      {/* Header Controls */}
      <View style={[styles.headerControls, { backgroundColor: `rgba(0,0,0,0.5)` }]}>
        <TouchableOpacity style={styles.controlBtn} onPress={goBack}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={toggleCamera}>
          <Ionicons name="camera-reverse" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats Overlay */}
      <View style={styles.statsOverlay}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Set</Text>
          <Text style={styles.statValue}>
            {currentSet}/{totalSets}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Reps</Text>
          <Text style={styles.statValue}>
            {repsThisSet}/{repsTarget}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Time</Text>
          <Text style={styles.statValue}>{formatTime(elapsed)}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Angle</Text>
          <Text style={styles.statValue}>{angleUI}°</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
        </View>
      </View>

      {/* Motion Status */}
      <View style={styles.motionStatus}>
        <View style={[styles.motionIndicator, { backgroundColor: motionUI ? COLORS.success : COLORS.muted }]} />
        <Text style={styles.motionText}>{motionUI ? "Motion Detected" : "No Motion"}</Text>
      </View>

      {/* End Workout Button */}
      {!workoutEnded && (
        <TouchableOpacity style={styles.endBtn} onPress={endWorkout}>
          <Ionicons name="stop-circle" size={20} color="#fff" />
          <Text style={styles.endBtnText}>End Workout</Text>
        </TouchableOpacity>
      )}

      {/* Workout Complete Modal */}
      {workoutEnded && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={60} color={COLORS.success} />
            </View>

            <Text style={styles.modalTitle}>Workout Complete! 🎉</Text>

            <View style={styles.summaryStats}>
              <SummaryStat label="Total Reps" value={totalReps} />
              <SummaryStat label="Total Sets" value={currentSet} />
              <SummaryStat label="Duration" value={formatTime(elapsed)} />
            </View>

            <View style={styles.buttonGroup}>
              {!pdfUrl ? (
                <TouchableOpacity
                  style={[styles.button, styles.primaryBtn]}
                  onPress={generatePdf}
                  disabled={generatingPdf}
                >
                  {generatingPdf ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="document-text" size={18} color="#fff" />
                      <Text style={styles.buttonText}>Generate Report</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.button, styles.primaryBtn]}
                  onPress={() => Linking.openURL(pdfUrl)}
                >
                  <Ionicons name="open" size={18} color="#fff" />
                  <Text style={styles.buttonText}>Open PDF Report</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={[styles.button, styles.secondaryBtn]} onPress={repeatWorkout}>
                <Ionicons name="refresh" size={18} color={COLORS.primary} />
                <Text style={[styles.buttonText, { color: COLORS.primary }]}>Repeat Workout</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.button, styles.secondaryBtn]} onPress={goBack}>
                <Ionicons name="home" size={18} color={COLORS.primary} />
                <Text style={[styles.buttonText, { color: COLORS.primary }]}>Back to Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const SummaryStat = ({ label, value }) => (
  <View style={styles.summaryStatItem}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark,
  },
  camera: {
    flex: 1,
  },
  headerControls: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 10,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  statsOverlay: {
    position: "absolute",
    bottom: 140,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "500",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  progressContainer: {
    position: "absolute",
    bottom: 115,
    left: 16,
    right: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.success,
    borderRadius: 3,
  },
  motionStatus: {
    position: "absolute",
    bottom: 75,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  motionIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  motionText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
  },
  endBtn: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    height: 48,
    backgroundColor: COLORS.danger,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  endBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  modal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 50,
  },
  modalContent: {
    backgroundColor: COLORS.light,
    borderRadius: 20,
    padding: 24,
    width: "85%",
    alignItems: "center",
  },
  successIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 20,
    textAlign: "center",
  },
  summaryStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  summaryStatItem: {
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "500",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
  },
  buttonGroup: {
    width: "100%",
    gap: 10,
  },
  button: {
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
  },
  secondaryBtn: {
    backgroundColor: "#f0f0f0",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});
