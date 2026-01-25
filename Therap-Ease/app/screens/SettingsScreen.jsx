import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as SecureStore from "expo-secure-store";
import {
  useNavigation,
  CommonActions,
} from "@react-navigation/native";

import {
  ColorTheme,
  styles as globalStyles,
} from "../../constants/GlobalStyles.jsx";
import { useTheme } from "../../hooks/use-theme";

function SettingsScreen() {
  const navigation = useNavigation();
  const { isDarkMode, setIsDarkMode } = useTheme();

  /* ===================== STATE ===================== */
  const [notifications, setNotifications] = useState(true);
  const [location, setLocation] = useState(false);
  const [autoUpdates, setAutoUpdates] = useState(true);

  const [role, setRole] = useState("-");
  const [email, setEmail] = useState("-");

  // Dynamic colors based on theme
  const dynamicColors = {
    containerBg: isDarkMode ? "#0F172A" : "#f4f4f4",
    headerBg: isDarkMode ? "#111827" : "#fff",
    cardBg: isDarkMode ? "#1F2937" : "#fff",
    text: isDarkMode ? "#f4f4f4" : "#1F2937",
    textSecondary: isDarkMode ? "#9CA3AF" : "#6B7280",
    border: isDarkMode ? "#374151" : "#E5E7EB",
  };

  /* ===================== LOAD USER ===================== */
  useEffect(() => {
    const init = async () => {
      const token = await SecureStore.getItemAsync("token");
      const storedRole = await SecureStore.getItemAsync("role");
      const storedEmail = await SecureStore.getItemAsync("email");

      if (!token) {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "Authenticate" }],
          })
        );
        return;
      }

      setRole(storedRole || "-");
      setEmail(storedEmail || "-");
    };

    init();
  }, []);

  /* ===================== LOGOUT ===================== */
  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await SecureStore.deleteItemAsync("token");
          await SecureStore.deleteItemAsync("role");
          await SecureStore.deleteItemAsync("email");

          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "Authenticate" }],
            })
          );
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[globalStyles.screen, localStyles.screen, { backgroundColor: dynamicColors.containerBg }]}>
      <ScrollView
        style={{ width: "100%" }}
        contentContainerStyle={localStyles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ===================== ACCOUNT ===================== */}
        <View style={[localStyles.section, { backgroundColor: dynamicColors.cardBg, borderColor: dynamicColors.border }]}>
          <Text style={[localStyles.sectionTitle, { color: dynamicColors.text }]}>Account Overview</Text>
          <Text style={[localStyles.sectionSubtitle, { color: dynamicColors.textSecondary }]}>
            Manage your profile, security, and app preferences.
          </Text>

          <View style={[localStyles.row, { borderBottomColor: dynamicColors.border }]}>
            <View>
              <Text style={[localStyles.rowLabel, { color: dynamicColors.textSecondary }]}>Account Type</Text>
              <Text style={[localStyles.rowValue, { color: dynamicColors.text }]}>
                {role === "doctor" ? "Doctor" : "Patient"}
              </Text>
            </View>
            <Ionicons
              name="person-circle-outline"
              size={26}
              color={ColorTheme.fourth}
            />
          </View>

          <View style={localStyles.row}>
            <View>
              <Text style={[localStyles.rowLabel, { color: dynamicColors.textSecondary }]}>Email</Text>
              <Text style={[localStyles.rowValue, { color: dynamicColors.text }]}>{email}</Text>
            </View>
            <Ionicons
              name="mail-outline"
              size={22}
              color={ColorTheme.fourth}
            />
          </View>
        </View>

        {/* ===================== PREFERENCES ===================== */}
        <View style={[localStyles.section, { backgroundColor: dynamicColors.cardBg, borderColor: dynamicColors.border }]}>
          <Text style={[localStyles.sectionTitle, { color: dynamicColors.text }]}>Preferences</Text>

          <View style={[localStyles.toggleRow, { borderBottomColor: dynamicColors.border }]}>
            <Text style={[localStyles.toggleLabel, { color: dynamicColors.text }]}>Notifications</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              thumbColor={ColorTheme.fourth}
              trackColor={{ true: ColorTheme.fifth }}
            />
          </View>

          <View style={localStyles.toggleRow}>
            <Text style={[localStyles.toggleLabel, { color: dynamicColors.text }]}>Dark Mode</Text>
            <Switch
              value={isDarkMode}
              onValueChange={setIsDarkMode}
              thumbColor={ColorTheme.fourth}
              trackColor={{ true: ColorTheme.fifth }}
            />
          </View>

          <View style={[localStyles.toggleRow, { borderBottomColor: dynamicColors.border }]}>
            <Text style={[localStyles.toggleLabel, { color: dynamicColors.text }]}>Location Services</Text>
            <Switch
              value={location}
              onValueChange={setLocation}
              thumbColor={ColorTheme.fourth}
              trackColor={{ true: ColorTheme.fifth }}
            />
          </View>

          <View style={localStyles.toggleRow}>
            <Text style={[localStyles.toggleLabel, { color: dynamicColors.text }]}>Auto Updates</Text>
            <Switch
              value={autoUpdates}
              onValueChange={setAutoUpdates}
              thumbColor={ColorTheme.fourth}
              trackColor={{ true: ColorTheme.fifth }}
            />
          </View>
        </View>

        {/* ===================== LOGOUT ===================== */}
        <View style={[localStyles.section, { backgroundColor: dynamicColors.cardBg, borderColor: dynamicColors.border }]}>
          <TouchableOpacity
            style={localStyles.logoutRow}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={22} color="#ff6b6b" />
            <Text style={[localStyles.logoutText, { color: dynamicColors.text }]}>Log Out</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default SettingsScreen;

/* ===================== STYLES ===================== */

const localStyles = StyleSheet.create({
  screen: { alignItems: "center" },
  content: {
    width: "100%",
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  section: {
    width: "100%",
    backgroundColor: ColorTheme.second,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: ColorTheme.second,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: ColorTheme.fourth,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: ColorTheme.fourth,
    opacity: 0.8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 6,
    borderBottomWidth: 1,
    borderBottomColor: ColorTheme.second,
  },
  rowLabel: { fontSize: 13, color: ColorTheme.muted },
  rowValue: { fontSize: 14, fontWeight: "600", color: ColorTheme.dark },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: ColorTheme.second,
  },
  toggleLabel: { fontSize: 14, color: ColorTheme.dark, fontWeight: "500" },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  logoutText: {
    fontSize: 16,
    color: "#ff6b6b",
    fontWeight: "600",
  },
});
