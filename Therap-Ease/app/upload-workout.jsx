import { Ionicons } from "@expo/vector-icons";
import { Video } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { ColorTheme } from "../constants/GlobalStyles";

const API_BASE = "http://172.28.213.100:8000";

export default function UploadWorkoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const exerciseKey = params.exerciseKey || "squat";
  const name = params.name || "Squats";
  const repsTarget = Number(params.reps || 10);
  const totalSets = Number(params.sets || 1);
  const doctor = params.doctor || "Dr. Sharma";
  const patientName = params.patientName || "";
  const patientId = params.patientId || "";

  const [selectedVideo, setSelectedVideo] = useState(null);
  const [processedVideoUri, setProcessedVideoUri] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleChooseVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "video/*",
      });
      if (result.canceled) return;

      const asset =
        result.assets && result.assets.length > 0 ? result.assets[0] : result;

      setSelectedVideo(asset);
      setAnalysisData(null);
      setProcessedVideoUri(null);
      setPdfUrl(null);
      Alert.alert("Video Selected", asset.name || "Video ready");
    } catch (err) {
      Alert.alert("Error", "Could not select a video.");
    }
  };

  const handleAnalyze = async () => {
    if (!selectedVideo) {
      Alert.alert("No video", "Please choose a video first.");
      return;
    }

    try {
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

      const res = await fetch(`${API_BASE}/analyze_video`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.log("Analyze error response:", errText);
        Alert.alert("Error", "Failed to analyze the uploaded video.");
        return;
      }

      const data = await res.json();
      setAnalysisData(data);
      if (data.processed_video_url) {
        setProcessedVideoUri(`${API_BASE}${data.processed_video_url}`);
      }
      Alert.alert("Analysis Complete", `Reps detected: ${data.reps ?? "N/A"}`);
    } catch (err) {
      console.log("Analyze error:", err);
      Alert.alert("Error", "Something went wrong while analyzing the video.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!analysisData) {
      Alert.alert("No analysis", "Analyze a video first.");
      return;
    }

    try {
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

      const res = await fetch(`${API_BASE}/generate_report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.log("Generate PDF error:", errText);
        Alert.alert("Error", "Failed to generate PDF report.");
        return;
      }

      const data = await res.json();
      const fullUrl = `${API_BASE}${data.url}`;
      setPdfUrl(fullUrl);
      Alert.alert("Report Ready", "Tap 'Open PDF' to view or download.");
    } catch (e) {
      console.log("Generate PDF error:", e);
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

  const duration = analysisData?.duration ?? 0;
  const reps = analysisData?.reps ?? 0;
  const formScore = analysisData?.form_score ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={ColorTheme.fourth} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{name}</Text>
          <Text style={styles.headerSub}>Upload & Analyze Video</Text>
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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
      >
        <View style={styles.videoWrapper}>
          {processedVideoUri ? (
            <Video
              style={styles.video}
              source={{ uri: processedVideoUri }}
              resizeMode="contain"
              useNativeControls
              isLooping
              shouldPlay
              onError={(e) => console.log("Video error:", e)}
            />
          ) : (
            <View style={styles.videoPlaceholder}>
              <Ionicons name="videocam-outline" size={40} color="#9ca3af" />
              <Text style={styles.videoPlaceholderText}>
                Choose a video and tap "Analyze Video" to see tracking.
              </Text>
            </View>
          )}
        </View>

        {/* Loading row under video when analyzing */}
        {isAnalyzing && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={ColorTheme.fourth} />
            <Text style={styles.loadingText}>Analyzing video, please wait…</Text>
          </View>
        )}

        <View style={{ marginTop: 14 }}>
          <TouchableOpacity
            style={[styles.mainBtn, styles.secondaryBtn, { marginBottom: 8 }]}
            onPress={handleChooseVideo}
            disabled={isAnalyzing}
          >
            <Ionicons
              name="cloud-upload-outline"
              size={18}
              color={ColorTheme.fourth}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.mainBtnText, { color: ColorTheme.fourth }]}>
              Choose Video
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.mainBtn,
              styles.primaryBtn,
              { marginBottom: 8, opacity: isAnalyzing ? 0.6 : 1 },
            ]}
            onPress={isAnalyzing ? undefined : handleAnalyze}
            disabled={isAnalyzing}
          >
            <Ionicons
              name="fitness-outline"
              size={18}
              color={ColorTheme.first}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.mainBtnText, { color: ColorTheme.first }]}>
              {isAnalyzing ? "Analyzing..." : "Analyze Video"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Analysis Summary</Text>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Detected Reps</Text>
            <Text style={styles.statsValue}>{reps}</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Duration (sec)</Text>
            <Text style={styles.statsValue}>{duration.toFixed(1)}</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Form Score</Text>
            <Text style={styles.statsValue}>
              {formScore > 1
                ? formScore.toFixed(1)
                : (formScore * 100).toFixed(1)}
              /100
            </Text>
          </View>
        </View>

        <View style={styles.pdfSection}>
          <Text style={styles.statsTitle}>Session Report</Text>
          <TouchableOpacity
            style={[styles.mainBtn, styles.primaryBtn, { marginTop: 8 }]}
            onPress={handleGeneratePdf}
            disabled={isAnalyzing}
          >
            <Ionicons
              name="document-text-outline"
              size={18}
              color={ColorTheme.first}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.mainBtnText, { color: ColorTheme.first }]}>
              Generate PDF
            </Text>
          </TouchableOpacity>

          {pdfUrl && (
            <TouchableOpacity
              style={[styles.mainBtn, styles.openBtn]}
              onPress={handleOpenPdf}
            >
              <Ionicons
                name="open-outline"
                size={18}
                color={ColorTheme.first}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.mainBtnText, { color: ColorTheme.first }]}>
                Open PDF
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ColorTheme.first },
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
  videoWrapper: {
    marginTop: 10,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
    height: 230,
  },
  video: { flex: 1 },
  videoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  videoPlaceholderText: {
    marginTop: 8,
    fontSize: 12,
    color: "#e5e7eb",
    textAlign: "center",
  },
  mainBtn: {
    height: 46,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  mainBtnText: { fontSize: 14, fontWeight: "700" },
  primaryBtn: { backgroundColor: ColorTheme.fourth },
  secondaryBtn: { backgroundColor: "#e5e7eb" },
  openBtn: {
    marginTop: 8,
    backgroundColor: "#6b7280",
  },
  statsCard: {
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: ColorTheme.second,
    padding: 12,
  },
  statsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: ColorTheme.fourth,
    marginBottom: 6,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  statsLabel: { fontSize: 13, color: "#6b7280" },
  statsValue: {
    fontSize: 13,
    fontWeight: "700",
    color: ColorTheme.fourth,
  },
  pdfSection: {
    marginTop: 16,
    marginBottom: 10,
  },
  
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 4,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#6095ffff",
  },
});
