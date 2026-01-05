import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as SecureStore from "expo-secure-store";

import { ColorTheme } from "../../constants/GlobalStyles.jsx";

import AppointmentsScreen from "./AppointmentsScreen.jsx";
import HomeScreen from "./HomeScreen.jsx";
import PatientsScreen from "./PatientsScreen.jsx";
import SearchScreen from "./SearchScreen.jsx";
import SettingsScreen from "./SettingsScreen.jsx";

const Tab = createBottomTabNavigator();

const MainScreen = ({ navigation, role: roleFromRoute }) => {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  /* 🔐 AUTH + ROLE GUARD */
  useEffect(() => {
    const init = async () => {
      const token = await SecureStore.getItemAsync("token");
      const storedRole = await SecureStore.getItemAsync("role");

      if (!token) {
        navigation.replace("Authenticate");
        return;
      }

      // Prefer secure stored role over route param
      setRole(storedRole || roleFromRoute);
      setLoading(false);
    };

    init();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={ColorTheme.second} />
      </View>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        animation: "shift",
        tabBarStyle: {
          backgroundColor: ColorTheme.fourth,
        },
        tabBarActiveTintColor: ColorTheme.second,
        tabBarInactiveTintColor: ColorTheme.sixth,
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === "Home") iconName = "home-outline";
          else if (route.name === "Search") iconName = "search-outline";
          else if (route.name === "Settings") iconName = "person-outline";
          else if (route.name === "Patients") iconName = "people-outline";
          else if (route.name === "Appointments")
            iconName = "documents-outline";

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      {/* HOME */}
      <Tab.Screen name="Home">
        {() => <HomeScreen role={role} />}
      </Tab.Screen>

      {/* DOCTOR ONLY */}
      {role === "doctor" && (
        <Tab.Screen name="Patients" component={PatientsScreen} />
      )}

      {/* COMMON */}
      <Tab.Screen name="Search" component={SearchScreen} />

      {/* DOCTOR ONLY */}
      {role === "doctor" && (
        <Tab.Screen name="Appointments" component={AppointmentsScreen} />
      )}

      {/* SETTINGS */}
      <Tab.Screen name="Settings">
        {() => <SettingsScreen role={role} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

export default MainScreen;
