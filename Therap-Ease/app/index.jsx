import { createStackNavigator } from "@react-navigation/stack";
import { useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import { View, ActivityIndicator } from "react-native";

import LoginScreen from "./screens/LoginScreen.jsx";
import MainScreen from "./screens/MainScreen.jsx";
import ExerciseScreen from "./screens/ExerciseScreen.jsx";

const Stack = createStackNavigator();

/* 🔐 AUTH LOADER */
function AuthLoading({ navigation }) {
  useEffect(() => {
    const checkAuth = async () => {
      const token = await SecureStore.getItemAsync("token");
      const role = await SecureStore.getItemAsync("role");

      if (token) {
        navigation.replace("MainApp", { role });
      } else {
        navigation.replace("Authenticate");
      }
    };

    checkAuth();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}

function MyStack() {
  return (
    <Stack.Navigator
      initialRouteName="AuthLoading"
      screenOptions={{ headerShown: false, animation: "slide_from_right" }}
    >
      <Stack.Screen name="AuthLoading" component={AuthLoading} />

      <Stack.Screen name="Authenticate" component={LoginScreen} />

      <Stack.Screen name="MainApp">
        {({ route }) => <MainScreen role={route.params?.role} />}
      </Stack.Screen>

      <Stack.Screen name="Exercise">
        {({ route }) => (
          <ExerciseScreen
            name={route.params.name}
            reps={route.params.reps}
            sets={route.params.sets}
            doctor={route.params.doctor}
            endDate={route.params.endDate}
            notes={route.params.notes}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

export default MyStack;
