import * as Linking from 'expo-linking';
import { useRouter } from "expo-router";
import React from "react";
import {
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import img1 from '../../assets/images/banner1.png';
import img2 from '../../assets/images/banner2.png';
import { ColorTheme } from "../../constants/GlobalStyles.jsx";

const fetchAppointments = () => {
  // MAX, UPCOMING 3
  let data = [
    { "id": 12321, "name": "Keshav", "date": '27 October', "time": '17:30' },
    { "id": 11354, "name": "Shivam", "date": '27 October', "time": '20:00' },
    { "id": 14354, "name": "Somay", "date": '28 October', "time": '09:00' }
  ]
  return data;
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: ColorTheme.first,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 10,
  },

  text: {
    fontSize: 25,
    fontWeight: "bold",
    color: ColorTheme.first,
    marginTop: 15,
    marginLeft: 15,
  },
  text2: {
    fontSize: 27,
    fontWeight: "bold",
    color: ColorTheme.first,
  },
  username: {
    fontSize: 40,
    marginTop: 0,
    color: "white",
  },
  card: {
    width: "95%",
    height: "19%",
    marginTop: "3%",
    backgroundColor: ColorTheme.fourth,
    borderRadius: 10,
    shadowColor: "#000",
  },

  scheduleOuter: {
    width: "95%",
    backgroundColor: ColorTheme.fourth,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginTop: "3%",
  },
  scheduleHeader: {
    fontSize: 20,
    fontWeight: "700",
    color: ColorTheme.first,
    marginBottom: 8,
  },
  scheduleScroll: {
    flexDirection: "row",
  },
  smallCard: {
    width: 110,
    height: 110,
    borderRadius: 8,
    backgroundColor: ColorTheme.first,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "black",
  },
  smallCardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  smallCardSub: {
    fontSize: 12,
    color: "black",
  },
  graph: {
    width: '95%',
    height: '75%',
    resizeMode: 'stretch'
  }
});

function SecondCard({ role }) {
  if (role === "patient") {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: ColorTheme.fifth,
            height: "50%",
            alignItems: "center",
            padding: "3%",
          },
        ]}
      >
        <Text style={[styles.text2, { color: ColorTheme.first }]}>
          Recommended Articles
        </Text>

        <TouchableOpacity
          onPress={() =>
            Linking.openURL(
              "https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/exercise/art-20048389"
            )
          }
          style={[styles.card, { height: "40%", marginTop: 5, elevation: 5 }]}
        >
          <Image
            source={img1}
            style={{ width: "100%", height: "100%", borderRadius: 10 }}
            resizeMode="stretch"
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            Linking.openURL(
              "https://www.healthline.com/nutrition/10-benefits-of-exercise"
            )
          }
          style={[styles.card, { height: "40%", marginTop: 10, elevation: 5 }]}
        >
          <Image
            source={img2}
            style={{ width: "100%", height: "100%", borderRadius: 10 }}
            resizeMode="stretch"
          />
        </TouchableOpacity>
      </View>
    );
  } else {
    const appointmentData = fetchAppointments();
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: ColorTheme.fifth,
            height: "45%",
            alignItems: "center",
            padding: 10,
          },
        ]}
      >
        <Text style={[styles.text2, { color: ColorTheme.first }]}>
          Upcoming Appointments
        </Text>
        <View
          style={[
            styles.card,
            {
              height: "80%",
              marginTop: 10,
              elevation: 5,
              backgroundColor: ColorTheme.first,
              justifyContent: "center",
            },
          ]}
        >
          <FlatList
            data={appointmentData}
            renderItem={({ item }) => (
              <View
                style={{
                  padding: 10,
                  borderBottomWidth: 0.3,
                  borderColor: ColorTheme.fifth,
                }}
              >
                <Text
                  style={[
                    styles.smallCardTitle,
                    { color: ColorTheme.fourth, textAlign: "center" },
                  ]}
                >
                  {item.name}, #{item.id}
                </Text>
                <Text style={{ color: ColorTheme.fourth, textAlign: "center" }}>
                  {item.date} at {item.time}
                </Text>
              </View>
            )}
            keyExtractor={(item) => item.id.toString()}
          />
        </View>
      </View>
    );
  }
}

function ThirdCard({ role }) {
  const router = useRouter(); // ✅ use expo-router

  if (role === "patient") {
    // ✅ add exerciseKey so LiveWorkout knows which tracking logic to use
    const items = [
      {
        id: "1",
        title: "Squat",
        exerciseKey: "squat",
        sub: "3 x 12",
        reps: 5,
        sets: 3,
        doctor: "Dr. ABC",
        endDate: "28 Jan",
        notes: "Focus on form",
      },
      {
        id: "2",
        title: "Bicep Curl",
        exerciseKey: "bicep_curl",
        sub: "4 x 10",
        reps: 5,
        sets: 3,
        doctor: "Dr. ABC",
        endDate: "7 Dec",
        notes: "Before breakfast",
      },
      {
        id: "3",
        title: "Leg Raise",
        exerciseKey: "leg_raise",
        sub: "3 x 60s",
        reps: 5,
        sets: 3,
        doctor: "Dr. ABC",
        endDate: "8 Dec",
        notes: "After dinner",
      },
      {
        id: "4",
        title: "Side Bend",
        exerciseKey: "side_bend",
        sub: "3 x 12",
        reps: 5,
        sets: 3,
        doctor: "Dr. ABC",
        endDate: "20 Jan",
        notes: "take 30 second break in between of sets",
      },
      {
        id: "5",
        title: "Knee Ext.",
        exerciseKey: "knee_extension",
        sub: "2 x 5",
        reps: 5,
        sets: 3,
        doctor: "Dr. ABC",
        endDate: "5 Dec",
        notes: "one last session and then you will be good to go :)",
      },
    ];

    const handleOpenExercise = (it) => {
      router.push({
        pathname: "/exercise", // 👈 your ExerciseScreen route
        params: {
          exerciseKey: it.exerciseKey,
          name: it.title,              // shown on Exercise + LiveWorkout
          reps: String(it.reps),
          sets: String(it.sets),
          doctor: it.doctor,
          endDate: it.endDate,
          notes: it.notes,
        },
      });
    };

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: ColorTheme.fourth,
            height: "31%",
            alignItems: "center",
            padding: "2%",
          },
        ]}
      >
        <Text style={[styles.text2, { marginBottom: "2%" }]}>
          Today&apos;s Exercises
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scheduleScroll}
        >
          {items.map((it) => (
            <TouchableOpacity
              key={it.id}
              style={styles.smallCard}
              onPress={() => handleOpenExercise(it)} // ✅ open tracking flow
            >
              <Text style={styles.smallCardTitle}>{it.title}</Text>
              <Text style={styles.smallCardSub}>{it.sub}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  } else {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: ColorTheme.fourth,
            height: "35%",
            alignItems: "center",
            padding: "2%",
          },
        ]}
      >
        <Text style={[styles.text2, { marginBottom: "2%" }]}>
          Patient Activity Chart
        </Text>
        <Image
          source={require("../../assets/images/graph_placeholder.png")}
          style={styles.graph}
        />
      </View>
    );
  }
}

function UserCard({ username, role }) {
  return (
    <View style={styles.card}>
      <Text style={styles.text}>Hello,</Text>
      <Text style={[styles.text, styles.username]}>
        {role === "doctor" ? `Dr. ${username}` : username}
      </Text>
    </View>
  );
}

function HomeScreen({ role }) {
  return (
    <SafeAreaView style={styles.screen}>
      <UserCard username="ABC XYZ" role={role} />
      <SecondCard role={role} />
      <ThirdCard role={role} />
    </SafeAreaView>
  );
}

export default HomeScreen;
