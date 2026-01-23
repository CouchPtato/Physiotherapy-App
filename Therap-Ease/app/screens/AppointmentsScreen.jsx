import React from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ColorTheme } from "../../constants/GlobalStyles.jsx";
import { useTheme } from "../../hooks/use-theme";

// ---- SAMPLE DATA ----
const todaysAppointments = [
  { id: 12321, name: "Keshav", date: "27 October", time: "17:30" },
  { id: 11354, name: "Shivam", date: "27 October", time: "20:00" },
  { id: 14354, name: "Somay", date: "27 October", time: "09:00" },
];

const upcomingAppointments = [
  { id: 11354, name: "Hardik Vrijay", date: "28 October", time: "09:00" },
  { id: 14754, name: "Ajay Lohmod", date: "28 October", time: "09:00" },
  { id: 15354, name: "Vijay Nagarjun", date: "29 October", time: "09:00" },
  { id: 15455, name: "Riya Gol", date: "29 October", time: "11:30" },
  { id: 12354, name: "Somay Rajput", date: "30 October", time: "09:00" },
  { id: 16666, name: "Rahul", date: "30 October", time: "15:00" },
];

const requestAppointments = [
  { id: 17777, name: "Arjun Watson", date: "Requested", time: "Requested" },
  { id: 11888, name: "Yusuf", date: "Requested", time: "Requested" },
  { id: 18888, name: "Meera Venkateshwar", date: "Requested", time: "Requested" },
  { id: 188, name: "Gurdeep", date: "Requested", time: "Requested" },
];

// ---- SMALL COMPONENTS ----

const SectionHeader = ({ title, count, subtitle, dynamicColors }) => (
  <View style={styles.sectionHeader}>
    <View>
      <Text style={[styles.headingText, { color: dynamicColors.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subHeadingText, { color: dynamicColors.textSecondary }]}>{subtitle}</Text> : null}
    </View>
    <View style={styles.countBadge}>
      <Text style={styles.countBadgeText}>{count}</Text>
    </View>
  </View>
);

const AppointmentItem = ({ item, type, dynamicColors }) => (
  <View style={[styles.itemContainer, { borderBottomColor: dynamicColors.border }]}>
    <View style={styles.itemLeft}>
      <Text style={[styles.itemName, { color: dynamicColors.text }]}>{item.name}</Text>
      <Text style={[styles.itemIdText, { color: dynamicColors.textSecondary }]}>#{item.id}</Text>
    </View>

    <View style={styles.itemRight}>
      <Text style={[styles.itemDateText, { color: dynamicColors.text }]}>{item.date}</Text>
      <Text style={[styles.itemTimeText, { color: dynamicColors.textSecondary }]}>{item.time}</Text>
    </View>

    {type === "requests" && (
      <View style={styles.buttonRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.actionButton, { backgroundColor: ColorTheme.fourth }]}
        >
          <Text style={styles.btnText}>Accept</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.actionButton, { backgroundColor: ColorTheme.error }]}
        >
          <Text style={styles.btnText}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.actionButton, { backgroundColor: ColorTheme.third }]}
        >
          <Text style={styles.btnText}>View Profile</Text>
        </TouchableOpacity>
      </View>
    )}
  </View>
);

const AppointmentsList = ({ data, type, dynamicColors }) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyStateContainer}>
        <Text style={[styles.emptyStateText, { color: dynamicColors.textSecondary }]}>No appointments.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      renderItem={({ item }) => <AppointmentItem item={item} type={type} dynamicColors={dynamicColors} />}
      keyExtractor={(item) => item.id.toString()}
      ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
      contentContainerStyle={{ paddingVertical: 4 }}
      showsVerticalScrollIndicator={false}
    />
  );
};

// ---- MAIN SCREEN ----

function AppointmentsScreen() {
  const { isDarkMode } = useTheme();
  
  const dynamicColors = {
    containerBg: isDarkMode ? "#0F172A" : "#F9FAFB",
    cardBg: isDarkMode ? "#1F2937" : "#fff",
    text: isDarkMode ? "#F9FAFB" : "#1F2937",
    textSecondary: isDarkMode ? "#9CA3AF" : "#6B7280",
    border: isDarkMode ? "#374151" : "#E5E7EB",
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: dynamicColors.containerBg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* TODAY'S APPOINTMENTS */}
        <View style={[styles.card, { backgroundColor: dynamicColors.cardBg }]}>
          <SectionHeader
            title="Today's Appointments"
            count={todaysAppointments.length}
            subtitle="Patients scheduled for today"
            dynamicColors={dynamicColors}
          />
          <AppointmentsList data={todaysAppointments} type="today" dynamicColors={dynamicColors} />
        </View>

        {/* UPCOMING APPOINTMENTS */}
        <View style={[styles.card, { backgroundColor: dynamicColors.cardBg }]}>
          <SectionHeader
            title="Upcoming Appointments"
            count={upcomingAppointments.length}
            subtitle="Next sessions in your calendar"
            dynamicColors={dynamicColors}
          />
          <AppointmentsList data={upcomingAppointments} type="upcoming" dynamicColors={dynamicColors} />
        </View>

        {/* REQUESTS */}
        <View style={[styles.card, { backgroundColor: dynamicColors.cardBg }]}>
          <SectionHeader
            title="Requests"
            count={requestAppointments.length}
            subtitle="Pending approval from patients"
            dynamicColors={dynamicColors}
          />
          <AppointmentsList data={requestAppointments} type="requests" dynamicColors={dynamicColors} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---- STYLES ----

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: ColorTheme.first,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },

  card: {
    backgroundColor: ColorTheme.fourth,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
    // subtle "card" feel
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },

  headingText: {
    fontSize: 20,
    fontWeight: "700",
    color: ColorTheme.first,
  },

  subHeadingText: {
    fontSize: 12,
    color: ColorTheme.first,
    opacity: 0.8,
    marginTop: 2,
  },

  countBadge: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: ColorTheme.first,
    alignItems: "center",
    justifyContent: "center",
  },

  countBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: ColorTheme.fourth,
  },

  itemContainer: {
    backgroundColor: ColorTheme.first,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  itemLeft: {
    flex: 1,
  },

  itemRight: {
    alignItems: "flex-end",
  },

  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: ColorTheme.fourth,
  },

  itemIdText: {
    fontSize: 12,
    color: ColorTheme.fourth,
    opacity: 0.7,
    marginTop: 1,
  },

  itemDateText: {
    fontSize: 13,
    color: ColorTheme.fourth,
  },

  itemTimeText: {
    fontSize: 12,
    color: ColorTheme.fourth,
    opacity: 0.8,
    marginTop: 1,
  },

  itemSeparator: {
    height: 6,
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 6,
  },

  actionButton: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  btnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },

  emptyStateContainer: {
    paddingVertical: 12,
    alignItems: "center",
  },

  emptyStateText: {
    color: ColorTheme.first,
    opacity: 0.9,
    fontSize: 13,
  },
});

export default AppointmentsScreen;
