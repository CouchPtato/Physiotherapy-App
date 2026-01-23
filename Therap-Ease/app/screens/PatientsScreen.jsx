import { ColorTheme } from "@/constants/GlobalStyles";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  LayoutAnimation,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "../../hooks/use-theme";

const SAMPLE = [
  {
    id: "p1",
    name: "Asha Kumar",
    age: 28,
    gender: "Female",
    city: "Delhi",
    notes: "Diabetic, take insulin",
    exercises: [
      {
        id: "ex1",
        name: "Shoulder Abduction",
        key: "shoulder_abduction",
        reps: 12,
        sets: 3,
        endDate: "2025-12-31",
        notes: "Lift your arm sideways till shoulder height.",
      },
      {
        id: "ex2",
        name: "Bicep Curls",
        key: "bicep_curl",
        reps: 15,
        sets: 2,
        endDate: "2025-12-31",
        notes: "Use light weights and control the motion.",
      },
    ],
  },
  {
    id: "p2",
    name: "Rahul Verma",
    age: 45,
    gender: "Male",
    city: "Mumbai",
    notes: "Hypertension, BP meds",
    exercises: [
      {
        id: "ex1",
        name: "Wall Squats",
        key: "squat",
        reps: 10,
        sets: 3,
        endDate: "2025-11-30",
        notes: "Keep your back against the wall, knees over ankles.",
      },
      {
        id: "ex2",
        name: "Side Bends",
        key: "side_bend",
        reps: 8,
        sets: 2,
        endDate: "2025-11-30",
        notes: "Bend slowly to the side without rotating.",
      },
    ],
  },
  {
    id: "p3",
    name: "Sana Ali",
    age: 33,
    gender: "Female",
    city: "Kolkata",
    notes: "Allergic to penicillin",
    exercises: [
      {
        id: "ex1",
        name: "Straight Leg Raise",
        key: "leg_raise",
        reps: 10,
        sets: 2,
        endDate: "2025-12-15",
        notes: "Keep your knee straight while lifting.",
      },
    ],
  },
  {
    id: "p4",
    name: "Vikram Das",
    age: 52,
    gender: "Male",
    city: "Chennai",
    notes: "Recovering from knee surgery",
    exercises: [
      {
        id: "ex1",
        name: "Knee Extension",
        key: "knee_extension",
        reps: 8,
        sets: 3,
        endDate: "2025-12-20",
        notes: "Extend leg slowly and fully, no jerks.",
      },
      {
        id: "ex2",
        name: "Squats (Supported)",
        key: "squat",
        reps: 6,
        sets: 2,
        endDate: "2025-12-20",
        notes: "Use support if needed; stop if pain increases.",
      },
    ],
  },
  {
    id: "p5",
    name: "Meera Singh",
    age: 19,
    gender: "Female",
    city: "Bengaluru",
    notes: "No chronic conditions",
    exercises: [
      {
        id: "ex1",
        name: "General Squats",
        key: "squat",
        reps: 10,
        sets: 3,
        endDate: "2025-11-30",
        notes: "Keep your chest up and knees aligned with toes.",
      },
    ],
  },
];

function initials(name = "") {
  return name
    .split(" ")
    .map((p) => p[0] || "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function PatientsScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const [patients, setPatients] = useState(SAMPLE);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const dynamicColors = {
    containerBg: isDarkMode ? "#0F172A" : "#F9FAFB",
    cardBg: isDarkMode ? "#1F2937" : "#fff",
    text: isDarkMode ? "#F9FAFB" : "#1F2937",
    textSecondary: isDarkMode ? "#9CA3AF" : "#6B7280",
    border: isDarkMode ? "#374151" : "#E5E7EB",
    inputBg: isDarkMode ? "#111827" : "#F3F4F6",
  };

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, []);

  const filtered = patients.filter((p) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q) ||
      String(p.age).includes(q)
    );
  });

  const toggleExpand = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleOpenExercise = (patient, exercise) => {
    const exerciseName = exercise.name || "Exercise";
    const exerciseKey = exercise.key || "squat";
    const reps = exercise.reps ?? 10;
    const sets = exercise.sets ?? 3;

    router.push({
      pathname: "/exercise",
      params: {
        exerciseKey,
        name: exerciseName,
        reps: String(reps),
        sets: String(sets),
        doctor: "Dr. Sharma", // we will make it dynamic later
        endDate: exercise.endDate || "2025-12-31",
        notes: exercise.notes || patient.notes || "Perform slowly with proper form.",
        patientName: patient.name,
        patientId: patient.id,
      },
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setPatients((prev) => [...prev]);
    }, 800);
  };

  const renderItem = ({ item }, dynamicColors) => {
    const expanded = expandedId === item.id;
    const exercises = item.exercises || [];

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => toggleExpand(item.id)}
        style={[stylesLocal.card, { backgroundColor: dynamicColors.cardBg, borderColor: dynamicColors.border }, expanded ? stylesLocal.cardExpanded : null]}
      >
        <View style={stylesLocal.row}>
          <View style={stylesLocal.avatar}>
            <Text style={stylesLocal.avatarText}>{initials(item.name)}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[stylesLocal.name, { color: dynamicColors.text }]}>{item.name}</Text>
            <Text style={[stylesLocal.meta, { color: dynamicColors.textSecondary }]}>
              {item.age} yrs • {item.gender} • {item.city}
            </Text>

            {exercises.length > 0 && (
              <Text
                style={[
                  stylesLocal.meta,
                  { marginTop: 2, fontSize: 12, color: dynamicColors.textSecondary },
                ]}
              >
                {exercises.length} prescribed exercise
                {exercises.length > 1 ? "s" : ""}
              </Text>
            )}
          </View>

          <View style={{ width: 50, alignItems: "flex-end" }}>
            <Text style={[stylesLocal.chev, { color: dynamicColors.text }]}>{expanded ? "▲" : "▼"}</Text>
          </View>
        </View>

        {expanded && (
          <View style={stylesLocal.expanded}>
            <Text style={[stylesLocal.info, { color: dynamicColors.text }]}>
              Notes: {item.notes || "No notes"}
            </Text>

            {/* List all exercises for this patient */}
            {exercises.length > 0 ? (
              <View style={{ marginTop: 8 }}>
                {exercises.map((ex) => (
                  <View key={ex.id} style={stylesLocal.exerciseRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={stylesLocal.exerciseName}>{ex.name}</Text>
                      <Text style={stylesLocal.exerciseMeta}>
                        {ex.reps} reps • {ex.sets} sets
                      </Text>
                      {ex.endDate && (
                        <Text style={stylesLocal.exerciseMetaSmall}>
                          End by: {ex.endDate}
                        </Text>
                      )}
                    </View>

                    <TouchableOpacity
                      style={[stylesLocal.smallBtn, stylesLocal.startBtn]}
                      onPress={() => handleOpenExercise(item, ex)}
                    >
                      <Text style={stylesLocal.smallBtnText}>Start</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={stylesLocal.exerciseMetaSmall}>
                No exercises assigned.
              </Text>
            )}

            <View style={stylesLocal.actions}>
              <TouchableOpacity style={[stylesLocal.btn, stylesLocal.removeBtn]}>
                <Text style={[stylesLocal.btnText, { color: "#fff" }]}>
                  Remove Patient
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[stylesLocal.container, { backgroundColor: dynamicColors.containerBg }]}>
      <View style={[stylesLocal.header, { backgroundColor: dynamicColors.cardBg }]}>
        <Text style={[stylesLocal.title, { color: dynamicColors.text }]}>Patients</Text>

        <View style={stylesLocal.headerRight}>
          <TouchableOpacity style={stylesLocal.addBtn}>
            <Text style={[stylesLocal.addText, { color: dynamicColors.text }]}>+    Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={stylesLocal.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search name, city or age..."
          style={[stylesLocal.search, { backgroundColor: dynamicColors.inputBg, color: dynamicColors.text, borderColor: dynamicColors.border }]}
          clearButtonMode="while-editing"
          placeholderTextColor={dynamicColors.textSecondary}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => renderItem({ item }, dynamicColors)}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 6 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={{ padding: 24, alignItems: "center" }}>
            <Text style={{ color: dynamicColors.textSecondary }}>No patients match your search.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const stylesLocal = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f7fb" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  title: { fontSize: 20, fontWeight: "700" },
  headerRight: { flexDirection: "row", alignItems: "center" },
  addBtn: {
    backgroundColor: ColorTheme.fourth,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addText: { color: "#fff", fontWeight: "700" },

  searchWrap: { paddingHorizontal: 16, paddingTop: 10 },
  search: {
    height: 42,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e6e9ef",
  },

  card: {
    marginHorizontal: 14,
    marginVertical: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardExpanded: { backgroundColor: "#fcfdff" },

  row: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 52,
    backgroundColor: "#eef2ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { fontWeight: "800", color: ColorTheme.fourth },
  name: { fontSize: 16, fontWeight: "700" },
  meta: { marginTop: 2, color: "#666" },
  chev: { color: "#999", fontSize: 14 },

  expanded: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f2f7",
    marginTop: 10,
  },
  info: { color: "#444", marginBottom: 6 },

  // Exercise list styles
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#eef1f7",
  },
  exerciseName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  exerciseMeta: { fontSize: 12, color: "#4b5563", marginTop: 2 },
  exerciseMetaSmall: { fontSize: 11, color: "#6b7280", marginTop: 2 },

  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginLeft: 8,
  },
  startBtn: {
    backgroundColor: ColorTheme.fourth,
  },
  smallBtnText: { color: "#fff", fontWeight: "600", fontSize: 12 },

  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  removeBtn: { backgroundColor: "#ff5252" },
  btnText: { fontWeight: "700", color: "#1f2937" },
});
