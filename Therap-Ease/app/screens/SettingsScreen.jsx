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
  ColorTheme,
  styles as globalStyles,
} from "../../constants/GlobalStyles.jsx";

function SettingsScreen({ navigation }) {
  /* ===================== STATE ===================== */
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [location, setLocation] = useState(false);
  const [autoUpdates, setAutoUpdates] = useState(true);

  const [role, setRole] = useState("-");
  const [email, setEmail] = useState("-");

  /* ===================== AUTH GUARD + LOAD USER ===================== */
  useEffect(() => {
    const init = async () => {
      const token = await SecureStore.getItemAsync("token");
      const storedRole = await SecureStore.getItemAsync("role");
      const storedEmail = await SecureStore.getItemAsync("email");

      if (!token) {
        navigation.replace("Authenticate");
        return;
      }

      setRole(storedRole || "-");
      setEmail(storedEmail || "-");
    };

    init();
  }, []);

  /* ===================== LOGOUT ===================== */
  const handleLogout = async () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await SecureStore.deleteItemAsync("token");
          await SecureStore.deleteItemAsync("role");
          await SecureStore.deleteItemAsync("email");

          navigation.replace("Authenticate");
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
          <Text style={localStyles.sectionSubtitle}>
            Customize how the app behaves for you.
          </Text>

          <View style={localStyles.toggleRow}>
            <View style={localStyles.toggleTextBlock}>
              <Text style={localStyles.toggleLabel}>Notifications</Text>
              <Text style={localStyles.toggleHint}>
                Alerts about sessions and updates.
              </Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              thumbColor={ColorTheme.fourth}
              trackColor={{ true: ColorTheme.fifth }}
            />
          </View>

          <View style={localStyles.toggleRow}>
            <View style={localStyles.toggleTextBlock}>
              <Text style={localStyles.toggleLabel}>Dark Mode</Text>
              <Text style={localStyles.toggleHint}>
                Reduce eye strain in low light.
              </Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              thumbColor={ColorTheme.fourth}
              trackColor={{ true: ColorTheme.fifth }}
            />
          </View>

          <View style={localStyles.toggleRow}>
            <View style={localStyles.toggleTextBlock}>
              <Text style={localStyles.toggleLabel}>Location Services</Text>
              <Text style={localStyles.toggleHint}>
                Better clinic suggestions.
              </Text>
            </View>
            <Switch
              value={location}
              onValueChange={setLocation}
              thumbColor={ColorTheme.fourth}
              trackColor={{ true: ColorTheme.fifth }}
            />
          </View>

          <View style={localStyles.toggleRow}>
            <View style={localStyles.toggleTextBlock}>
              <Text style={localStyles.toggleLabel}>Auto Updates</Text>
              <Text style={localStyles.toggleHint}>
                Keep app updated automatically.
              </Text>
            </View>
            <Switch
              value={autoUpdates}
              onValueChange={setAutoUpdates}
              thumbColor={ColorTheme.fourth}
              trackColor={{ true: ColorTheme.fifth }}
            />
          </View>
        </View>

        {/* ===================== ACTIONS ===================== */}
        <View style={localStyles.section}>
          <Text style={localStyles.sectionTitle}>Account Actions</Text>

          <TouchableOpacity style={localStyles.actionRow}>
            <View style={localStyles.actionLeft}>
              <Ionicons
                name="pencil-outline"
                size={20}
                color={ColorTheme.fourth}
              />
              <Text style={localStyles.actionText}>Edit Profile</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={ColorTheme.fourth}
            />
          </TouchableOpacity>

          <TouchableOpacity style={localStyles.actionRow}>
            <View style={localStyles.actionLeft}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={ColorTheme.fourth}
              />
              <Text style={localStyles.actionText}>Privacy & Security</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={ColorTheme.fourth}
            />
          </TouchableOpacity>

          <TouchableOpacity style={localStyles.actionRow}>
            <View style={localStyles.actionLeft}>
              <Ionicons
                name="help-circle-outline"
                size={20}
                color={ColorTheme.fourth}
              />
              <Text style={localStyles.actionText}>Help & Support</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={ColorTheme.fourth}
            />
          </TouchableOpacity>

          {/* LOGOUT */}
          <TouchableOpacity
            style={[localStyles.actionRow, localStyles.logoutRow]}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <View style={localStyles.actionLeft}>
              <Ionicons name="log-out-outline" size={20} color="#ff6b6b" />
              <Text style={[localStyles.actionText, { color: "#ff6b6b" }]}>
                Log Out
              </Text>
            </View>
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
  },
  sectionSubtitle: {
    fontSize: 12,
    color: ColorTheme.fourth,
    opacity: 0.8,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: ColorTheme.fifth,
    marginTop: 4,
  },
  rowLabel: { fontSize: 13, color: ColorTheme.fourth, opacity: 0.9 },
  rowValue: { fontSize: 14, fontWeight: "600", color: ColorTheme.fourth },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  toggleTextBlock: { flex: 1, paddingRight: 10 },
  toggleLabel: { fontSize: 14, fontWeight: "600", color: ColorTheme.fourth },
  toggleHint: { fontSize: 11, color: ColorTheme.fourth, opacity: 0.75 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  actionLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionText: { fontSize: 14, color: ColorTheme.fourth },
  logoutRow: { marginTop: 8 },
});
