import { Ionicons } from "@expo/vector-icons";
import { Video } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../hooks/use-theme";

// Colors
const COLORS = {
  primary: "#2b9d8a",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  dark: "#1f2937",
  light: "#f9fafb",
  muted: "#b5b5b5",
};

export default function UploadWorkoutScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params || {};
  const { isDarkMode } = useTheme();

  const exerciseKey = params.exerciseKey || "squat";
  const name = params.name || "Squats";
  const repsTarget = Number(params.reps || 10);
  const totalSets = Number(params.sets || 1);
  const doctor = params.doctor || "Dr. Sharma";
  const patientName = params.patientName || "";
  const patientId = params.patientId || "";

  const dynamicColors = {
    containerBg: isDarkMode ? "#0F172A" : "#f4f4f4",
    cardBg: isDarkMode ? "#1F2937" : "#fff",
    text: isDarkMode ? "#f4f4f4" : "#1F2937",
    textSecondary: isDarkMode ? "#9CA3AF" : "#6B7280",
    inputBg: isDarkMode ? "#111827" : "#F3F4F6",
    border: isDarkMode ? "#374151" : "#E5E7EB",
  };

  const [selectedVideo, setSelectedVideo] = useState(null);
  const [processedVideoUri, setProcessedVideoUri] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleChooseVideo = async () => {
    try {
      setError(null);
      const result = await DocumentPicker.getDocumentAsync({
        type: "video/*",
      });
      if (result.canceled) return;

      const asset = result.assets && result.assets.length > 0 ? result.assets[0] : result;

      setSelectedVideo(asset);
      setAnalysisData(null);
      setProcessedVideoUri(null);
      setPdfUrl(null);

      Alert.alert("Success", `Video "${asset.name}" selected successfully`);
    } catch (err) {
      setError("Could not select a video. Please try again.");
      Alert.alert("Error", "Could not select a video.");
    }
  };

  const handleAnalyze = async () => {
    if (!selectedVideo) {
      setError("Please choose a video first.");
      return;
    }

    try {
      setError(null);
      setIsAnalyzing(true);

      const fileUri = selectedVideo.uri;
      const fileName = selectedVideo.name || "exercise.mp4";
      const formData = new FormData();

      if (Platform.OS === "web") {
        const response = await fetch(fileUri);
        const blob = await response.blob();
        formData.append("file", blob, fileName);
      } else {
        formData.append("file", {
          uri: fileUri,
          name: fileName,
          type: "video/mp4",
        });
      }

      formData.append("exercise_key", String(exerciseKey));
      formData.append("patient_name", patientName || "Somay Singh");
      formData.append("patient_id", patientId || "P-2025-001");
      formData.append("assigned_reps", String(repsTarget));
      formData.append("sets", String(totalSets));

      const res = await fetch("http://192.168.1.4:8000/analyze_video", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to analyze video");
      }

      const data = await res.json();
      setAnalysisData(data);

      if (data.processed_video_url) {
        setProcessedVideoUri(`http://192.168.1.4:8000${data.processed_video_url}`);
      }

      Alert.alert("Success", `Analysis complete! Detected ${data.reps ?? 0} reps`);
    } catch (err) {
      setError("Failed to analyze video. Please try again.");
      Alert.alert("Error", "Failed to analyze video");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!analysisData) {
      setError("Please analyze a video first.");
      return;
    }

    try {
      setError(null);
      const duration = analysisData.duration ?? 0;
      const totalReps = analysisData.reps ?? 0;
      const assignedTotalReps = repsTarget * totalSets;
      const avgTime = totalReps > 0 ? duration / totalReps : 0;
      const formScore = analysisData.form_score ?? 0.8;
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

      const res = await fetch("http://192.168.1.4:8000/generate_report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to generate report");
      }

      const data = await res.json();
      const fullUrl = `http://192.168.1.4:8000${data.url}`;
      setPdfUrl(fullUrl);

      Alert.alert("Success", "Report generated successfully!");
    } catch (err) {
      setError("Failed to generate PDF report. Please try again.");
      Alert.alert("Error", "Failed to generate PDF report");
    }
  };

  const handleOpenPdf = () => {
    if (pdfUrl) {
      Linking.openURL(pdfUrl);
    } else {
      Alert.alert("No PDF", "Generate the PDF first.");
    }
  };

  const duration = analysisData?.duration ?? 0;
  const reps = analysisData?.reps ?? 0;
  const formScore = analysisData?.form_score ?? 0;

  const isReady = analysisData && processedVideoUri;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamicColors.containerBg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{name}</Text>
          <Text style={styles.headerSubtitle}>Upload & Analyze</Text>
        </View>

        <View style={styles.doctorChip}>
          <Ionicons name="person" size={14} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.doctorText}>{doctor}</Text>
        </View>
      </View>

      {/* Patient Info */}
      {patientName ? (
        <View style={styles.patientInfo}>
          <View style={styles.patientDetail}>
            <Ionicons name="person-circle" size={16} color={COLORS.primary} />
            <Text style={styles.patientName}>{patientName}</Text>
          </View>
          {patientId && (
            <View style={styles.patientDetail}>
              <Ionicons name="barcode" size={16} color={COLORS.primary} />
              <Text style={styles.patientId}>{patientId}</Text>
            </View>
          )}
        </View>
      ) : null}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Video Display */}
        <View style={styles.videoSection}>
          <Text style={styles.sectionTitle}>Exercise Video</Text>
          <View style={styles.videoWrapper}>
            {processedVideoUri ? (
              <Video
                style={styles.video}
                source={{ uri: processedVideoUri }}
                resizeMode="contain"
                useNativeControls
                isLooping
                shouldPlay
              />
            ) : (
              <View style={styles.videoPlaceholder}>
                <Ionicons name="videocam-outline" size={48} color={COLORS.muted} />
                <Text style={styles.placeholderText}>No video selected</Text>
                <Text style={styles.placeholderSubtext}>
                  Choose and analyze a video to get started
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryBtn]}
            onPress={handleChooseVideo}
            disabled={isAnalyzing}
          >
            <Ionicons name="cloud-upload-outline" size={20} color={COLORS.primary} />
            <Text style={[styles.buttonText, { color: COLORS.primary }]}>Choose Video</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.primaryBtn, { opacity: isAnalyzing ? 0.6 : 1 }]}
            onPress={handleAnalyze}
            disabled={isAnalyzing || !selectedVideo}
          >
            {isAnalyzing ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.buttonText}>Analyzing...</Text>
              </>
            ) : (
              <>
                <Ionicons name="fitness-outline" size={20} color="#fff" />
                <Text style={styles.buttonText}>Analyze Video</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Analysis Results */}
        {isReady && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>Analysis Results</Text>

            <View style={styles.statsGrid}>
              <StatCard label="Reps Detected" value={reps} unit="" />
              <StatCard label="Duration" value={duration.toFixed(1)} unit="sec" />
              <StatCard label="Form Score" value={(formScore * 100).toFixed(0)} unit="/100" />
              <StatCard
                label="Avg Time/Rep"
                value={(duration / (reps || 1)).toFixed(1)}
                unit="sec"
              />
            </View>

            {/* Performance Gauge */}
            <View style={styles.gaugeSection}>
              <Text style={styles.gaugeLabel}>Performance</Text>
              <View style={styles.gauge}>
                <View
                  style={[
                    styles.gaugeFill,
                    {
                      width: `${Math.min((reps / (repsTarget * totalSets)) * 100, 100)}%`,
                      backgroundColor:
                        reps >= repsTarget * totalSets
                          ? COLORS.success
                          : reps >= (repsTarget * totalSets) / 2
                            ? COLORS.warning
                            : COLORS.danger,
                    },
                  ]}
                />
              </View>
              <Text style={styles.gaugeText}>
                {reps} / {repsTarget * totalSets} reps completed
              </Text>
            </View>
          </View>
        )}

        {/* Error Message */}
        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* PDF Section */}
        {isReady && (
          <View style={styles.pdfSection}>
            <Text style={styles.sectionTitle}>Generate Report</Text>

            {!pdfUrl ? (
              <TouchableOpacity style={[styles.button, styles.primaryBtn]} onPress={handleGeneratePdf}>
                <Ionicons name="document-text-outline" size={20} color="#fff" />
                <Text style={styles.buttonText}>Generate PDF Report</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.primaryBtn]}
                  onPress={handleOpenPdf}
                >
                  <Ionicons name="open-outline" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Open PDF Report</Text>
                </TouchableOpacity>

                <Text style={styles.successText}>
                  ✓ Report generated successfully
                </Text>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Stat Card Component
const StatCard = ({ label, value, unit, dynamicColors }) => {
  const colors = dynamicColors || { text: COLORS.dark, inputBg: "#f3f4f6" };
  return (
    <View style={[styles.statCard, { backgroundColor: colors.inputBg }]}>
      <Text style={[styles.statLabel, { color: colors.text }]}>{label}</Text>
      <View style={styles.statValue}>
        <Text style={[styles.statNumber, { color: colors.text }]}>{value}</Text>
        {unit && <Text style={[styles.statUnit, { color: colors.textSecondary }]}>{unit}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backBtn: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "500",
  },
  doctorChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  doctorText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
  patientInfo: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(99, 102, 241, 0.05)",
    gap: 16,
  },
  patientDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  patientName: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.dark,
  },
  patientId: {
    fontSize: 12,
    color: COLORS.muted,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 12,
    marginTop: 16,
  },
  videoSection: {
    marginBottom: 8,
  },
  videoWrapper: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
    height: 280,
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  video: {
    flex: 1,
  },
  videoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  placeholderText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    textAlign: "center",
  },
  placeholderSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.muted,
    textAlign: "center",
  },
  actionSection: {
    gap: 10,
    marginVertical: 16,
  },
  button: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
  },
  secondaryBtn: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  resultsSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "48%",
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "500",
    marginBottom: 6,
  },
  statValue: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary,
  },
  statUnit: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "600",
  },
  gaugeSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  gaugeLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 8,
  },
  gauge: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  gaugeFill: {
    height: "100%",
    borderRadius: 4,
  },
  gaugeText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "500",
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 12,
    padding: 12,
    marginVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: "500",
  },
  pdfSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  successText: {
    marginTop: 12,
    fontSize: 12,
    color: COLORS.success,
    fontWeight: "600",
    textAlign: "center",
  },
});
