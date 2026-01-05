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

function SettingsScreen() {
  const navigation = useNavigation();

  /* ===================== STATE ===================== */
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [location, setLocation] = useState(false);
  const [autoUpdates, setAutoUpdates] = useState(true);

  const [role, setRole] = useState("-");
  const [email, setEmail] = useState("-");

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
    <SafeAreaView style={[globalStyles.screen, localStyles.screen]}>
      <ScrollView
        style={{ width: "100%" }}
        contentContainerStyle={localStyles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ===================== ACCOUNT ===================== */}
        <View style={localStyles.section}>
          <Text style={localStyles.sectionTitle}>Account Overview</Text>
          <Text style={localStyles.sectionSubtitle}>
            Manage your profile, security, and app preferences.
          </Text>

          <View style={localStyles.row}>
            <View>
              <Text style={localStyles.rowLabel}>Account Type</Text>
              <Text style={localStyles.rowValue}>
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
              <Text style={localStyles.rowLabel}>Email</Text>
              <Text style={localStyles.rowValue}>{email}</Text>
            </View>
            <Ionicons
              name="mail-outline"
              size={22}
              color={ColorTheme.fourth}
            />
          </View>
        </View>

        {/* ===================== PREFERENCES ===================== */}
        <View style={localStyles.section}>
          <Text style={localStyles.sectionTitle}>Preferences</Text>

          <View style={localStyles.toggleRow}>
            <Text style={localStyles.toggleLabel}>Notifications</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              thumbColor={ColorTheme.fourth}
              trackColor={{ true: ColorTheme.fifth }}
            />
          </View>

          <View style={localStyles.toggleRow}>
            <Text style={localStyles.toggleLabel}>Dark Mode</Text>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              thumbColor={ColorTheme.fourth}
              trackColor={{ true: ColorTheme.fifth }}
            />
          </View>

          <View style={localStyles.toggleRow}>
            <Text style={localStyles.toggleLabel}>Location Services</Text>
            <Switch
              value={location}
              onValueChange={setLocation}
              thumbColor={ColorTheme.fourth}
              trackColor={{ true: ColorTheme.fifth }}
            />
          </View>

          <View style={localStyles.toggleRow}>
            <Text style={localStyles.toggleLabel}>Auto Updates</Text>
            <Switch
              value={autoUpdates}
              onValueChange={setAutoUpdates}
              thumbColor={ColorTheme.fourth}
              trackColor={{ true: ColorTheme.fifth }}
            />
          </View>
        </View>

        {/* ===================== LOGOUT ===================== */}
        <View style={localStyles.section}>
          <TouchableOpacity
            style={localStyles.logoutRow}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={22} color="#ff6b6b" />
            <Text style={localStyles.logoutText}>Log Out</Text>
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
    paddingVertical: 6,
    marginTop: 6,
  },
  rowLabel: { fontSize: 13, color: ColorTheme.fourth },
  rowValue: { fontSize: 14, fontWeight: "600", color: ColorTheme.fourth },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  toggleLabel: { fontSize: 14, color: ColorTheme.fourth },
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
