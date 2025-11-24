import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { ColorTheme } from "../../constants/GlobalStyles";

//tutorial URL (replace with your real links)
const EXERCISE_TUTORIALS = {
  squat: "https://www.youtube.com/watch?v=aclHkVaku9U",
  bicep_curl: "https://www.youtube.com/watch?v=ykJmrZ5v0Oo",
  shoulder_abduction: "https://www.youtube.com/watch?v=pYcpY20QaE8",
  knee_extension: "https://www.youtube.com/watch?v=lG4T6b4QFh0",
  leg_raise: "https://www.youtube.com/watch?v=JB2oyawG9KI",
  side_bend: "https://www.youtube.com/watch?v=CSLgrxQqSxY",
};

const ExerciseScreen = (props) => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const name = params.name || props.name || "Squats";
  const reps = params.reps || props.reps || "10";
  const sets = params.sets || props.sets || "3";
  const doctor = params.doctor || props.doctor || "Dr. Sharma";
  const endDate = params.endDate || props.endDate || "2025-12-31";
  const notes =
    params.notes ||
    props.notes ||
    "Keep your back straight and move in a slow, controlled manner.";
  const exerciseKey = params.exerciseKey || props.exerciseKey || "squat";

  const patientName = params.patientName || props.patientName || null;
  const patientId = params.patientId || props.patientId || null;

  // Pick tutorial URL based on exerciseKey
  const tutorialUrl = EXERCISE_TUTORIALS[exerciseKey];

  const handleStartLive = () => {
    router.push({
      pathname: "/live-workout",
      params: {
        exerciseKey,
        name,
        reps: String(reps),
        sets: String(sets),
        doctor,
        endDate,
        notes,
        patientName: patientName || "",
        patientId: patientId || "",
      },
    });
  };

  const handleUploadPress = () => {
    router.push({
      pathname: "/upload-workout",
      params: {
        exerciseKey,
        name,
        reps: String(reps),
        sets: String(sets),
        doctor,
        endDate,
        notes,
        patientName: patientName || "",
        patientId: patientId || "",
      },
    });
  };

  // Open tutorial link (if available)
  const handleWatchTutorial = () => {
    if (!tutorialUrl) {
      return;
    }
    Linking.openURL(tutorialUrl).catch(() => {
      // optionally show an alert if open fails
    });
  };

  const tutorialAvailable = !!tutorialUrl;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerWrapper}>
          <View style={styles.headerBadge}>
            <Ionicons
              name="fitness-outline"
              size={18}
              color={ColorTheme.first}
            />
            <Text style={styles.headerBadgeText}>Exercise Session</Text>
          </View>
          <Text style={styles.headerTitle}>All the best!</Text>
          <Text style={styles.headerSubtitle}>
            Complete your exercise and either track it live or upload a short
            video for your doctor.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Live Tracking</Text>
          <Text style={styles.sectionSubtitle}>
            Use your phone camera to track your reps, angles and form in real
            time.
          </Text>

          <TouchableOpacity style={styles.liveButton} onPress={handleStartLive}>
            <Ionicons
              name="walk-outline"
              size={20}
              color={ColorTheme.first}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.liveButtonText}>Start Live Session</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Exercise Video</Text>
          <Text style={styles.sectionSubtitle}>
            Upload a video of you performing this exercise so your doctor can
            review your form and metrics.
          </Text>

          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleUploadPress}
          >
            <View style={styles.uploadIconWrapper}>
              <Ionicons
                name="cloud-upload-outline"
                size={22}
                color={ColorTheme.fourth}
              />
            </View>
            <View>
              <Text style={styles.uploadText}>Go to Upload Screen</Text>
              <Text style={styles.uploadHint}>
                You’ll choose and analyze your video there.
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Exercise Details</Text>

          {patientName && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Patient</Text>
              <Text style={styles.detailValue}>
                {patientName}
                {patientId ? ` (ID: ${patientId})` : ""}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name</Text>
            <Text style={styles.detailValue}>{name}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reps</Text>
            <Text style={styles.detailValue}>{reps}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Sets</Text>
            <Text style={styles.detailValue}>{sets}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Prescribed by</Text>
            <Text style={styles.detailValue}>{doctor}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>End Date</Text>
            <Text style={styles.detailValue}>{endDate}</Text>
          </View>

          <View style={[styles.detailRow, { alignItems: "flex-start" }]}>
            <Text style={styles.detailLabel}>Notes</Text>
            <Text style={[styles.detailValue, styles.detailNotes]}>{notes}</Text>
          </View>
        </View>

        <View style={styles.helpWrapper}>
          <Ionicons
            name="help-circle-outline"
            size={26}
            color={ColorTheme.fourth}
          />
          <Text style={styles.helpTitle}>Need Help?</Text>
          <Text style={styles.helpSubtitle}>Watch and learn!</Text>

          <TouchableOpacity
            style={[
              styles.helpButton,
              !tutorialAvailable && { opacity: 0.4 },
            ]}
            onPress={tutorialAvailable ? handleWatchTutorial : undefined}
            disabled={!tutorialAvailable}
          >
            <Ionicons
              name="play-circle-outline"
              size={20}
              color={ColorTheme.first}
            />
            <Text style={styles.helpButtonText}>
              {tutorialAvailable
                ? "Watch Exercise Tutorial"
                : "Tutorial coming soon"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ExerciseScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ColorTheme.first,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    alignItems: "center",
  },
  headerWrapper: {
    width: "100%",
    marginBottom: 16,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: ColorTheme.second,
    marginBottom: 8,
  },
  headerBadgeText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "600",
    color: ColorTheme.fourth,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: ColorTheme.fourth,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: ColorTheme.fourth,
    opacity: 0.8,
  },
  card: {
    width: "100%",
    backgroundColor: ColorTheme.second,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: ColorTheme.second,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: ColorTheme.fourth,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: ColorTheme.fourth,
    opacity: 0.8,
    marginBottom: 12,
  },
  liveButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: ColorTheme.fourth,
  },
  liveButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: ColorTheme.first,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ColorTheme.fourth,
    borderStyle: "dashed",
    marginTop: 4,
  },
  uploadIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ColorTheme.fourth,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: "600",
    color: ColorTheme.fourth,
  },
  uploadHint: {
    fontSize: 11,
    color: ColorTheme.fourth,
    opacity: 0.8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  detailLabel: {
    fontWeight: "600",
    color: ColorTheme.fourth,
    fontSize: 13,
  },
  detailValue: {
    color: ColorTheme.fourth,
    fontSize: 13,
    maxWidth: "60%",
    textAlign: "right",
  },
  detailNotes: {
    lineHeight: 18,
  },
  helpWrapper: {
    marginTop: 20,
    alignItems: "center",
  },
  helpTitle: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: "700",
    color: ColorTheme.fourth,
  },
  helpSubtitle: {
    fontSize: 13,
    color: ColorTheme.fourth,
    opacity: 0.85,
    marginTop: 2,
    marginBottom: 10,
  },
  helpButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: ColorTheme.fourth,
    marginTop: 4,
  },
  helpButtonText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "600",
    color: ColorTheme.first,
  },
});
