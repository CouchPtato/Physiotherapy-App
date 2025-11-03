import React, { useState, useEffect } from "react";
import { View, Button, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";

export default function App() {
  const [data, setData] = useState({});
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [isTracking, setIsTracking] = useState(false);

  const backend = "http://192.168.x.x:8000"; // update if backend IP changes

  // ✅ Start Live Exercise Session
  const startExercise = async (exerciseName) => {
    try {
      setSelectedExercise(exerciseName);
      const res = await axios.post(`${backend}/start_session`, {
        exercise: exerciseName,
        user_id: "1", // You can make this dynamic later
      });
      setIsTracking(true);
      Alert.alert("Session Started", `Tracking ${exerciseName}`);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not start exercise session.");
    }
  };

  // ✅ Stop Live Tracking
  const stopExercise = async () => {
    setSelectedExercise(null);
    setIsTracking(false);
    setData({});
    Alert.alert("Session Stopped", "Exercise tracking stopped.");
  };

  // ✅ Upload recorded video for analysis
  const uploadVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
      });

      if (!result.canceled) {
        const formData = new FormData();
        formData.append("file", {
          uri: result.assets[0].uri,
          type: "video/mp4",
          name: "exercise_video.mp4",
        });
        formData.append("exercise", selectedExercise || "squat");
        formData.append("user_id", "1");

        const res = await axios.post(`${backend}/analyze_frame`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        setData(res.data);
        Alert.alert("Video Analysis Complete", `Form: ${res.data.form}`);
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to upload or analyze video.");
    }
  };

  // ✅ Polling data for live tracking (every 1 sec)
  useEffect(() => {
    let interval;
    if (isTracking && selectedExercise) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`${backend}/data`);
          setData(res.data);
        } catch (error) {
          console.log("Error fetching data:", error.message);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, selectedExercise]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏋️‍♂️ Physiotherapy Exercise Tracker</Text>

      {/* Exercise Buttons */}
      <View style={styles.buttonGroup}>
        {["bicep_curl", "squat", "shoulder_abduction", "knee_extension", "leg_raise", "side_bend"].map((name) => (
          <TouchableOpacity
            key={name}
            style={styles.button}
            onPress={() => startExercise(name)}
          >
            <Text style={styles.buttonText}>{name.replace("_", " ")}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Exercise Data */}
      {selectedExercise && (
        <View style={styles.dataBox}>
          <Text style={styles.info}>Exercise: {selectedExercise}</Text>
          <Text style={styles.info}>Angle: {data.angle?.toFixed?.(2) || "—"}</Text>
          <Text style={styles.info}>Count: {data.count || "—"}</Text>
          <Text style={styles.info}>Stage: {data.stage || "—"}</Text>
          <Text style={styles.info}>Form: {data.form || "—"}</Text>

          <Button title="Stop Live Tracking" onPress={stopExercise} color="#FF4444" />
          <Button title="Upload Video for Analysis" onPress={uploadVideo} color="#007AFF" />
        </View>
      )}
    </View>
  );
}

// ================== Styles ==================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f2f2",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  buttonGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 30,
  },
  button: {
    backgroundColor: "#4CAF50",
    margin: 5,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  dataBox: {
    width: "100%",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    elevation: 3,
    alignItems: "center",
  },
  info: {
    fontSize: 16,
    marginVertical: 4,
  },
});
