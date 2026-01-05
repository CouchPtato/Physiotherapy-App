import DateTimePicker from "@react-native-community/datetimepicker";
import { Formik } from "formik";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Yup from "yup";
import * as SecureStore from "expo-secure-store";

import logoimg from "../../assets/images/logo.png";
import { ColorTheme, styles } from "../../constants/GlobalStyles.jsx";

/* 🔗 BACKEND URL */
const API_URL = "http://192.168.X.X:8000";

/* ===================== VALIDATION ===================== */

const RegisterSchema = Yup.object().shape({
  email: Yup.string().email("Invalid email").required("Email is required"),
  password: Yup.string().min(4, "Too short!").required("Password is required"),
  confirm: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Confirm password is required"),
  dob: Yup.string().required("DOB is required"),
});

const LoginSchema = Yup.object().shape({
  username: Yup.string().required("Username is required"),
  password: Yup.string().required("Password is required"),
});

/* ===================== RADIO BUTTON ===================== */

const RadioButton = ({ label, value, selected, onSelect }) => (
  <TouchableOpacity style={styles.radioOption} onPress={() => onSelect(value)}>
    <View
      style={[styles.radioCircle, selected === value && styles.radioSelected]}
    />
    <Text style={styles.radioLabel}>{label}</Text>
  </TouchableOpacity>
);

/* ===================== MAIN SCREEN ===================== */

const LoginScreen = ({ navigation }) => {
  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [role, setRole] = useState("patient");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const registerAnim = useRef(new Animated.Value(0)).current;
  const loginAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(registerAnim, {
      toValue: showRegister ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [showRegister]);

  useEffect(() => {
    Animated.timing(loginAnim, {
      toValue: showLogin ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [showLogin]);

  /* ===================== REGISTER ===================== */

  const handleRegister = async (values, resetForm) => {
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          dob: values.dob,
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Registration Failed", data.detail || "Error");
        return;
      }

      Alert.alert("Success", "Account created. Please login.");
      resetForm();
      setShowRegister(false);
      setShowLogin(true);
    } catch (err) {
      Alert.alert("Error", "Server not reachable");
    }
  };

  /* ===================== LOGIN ===================== */

  const handleLogin = async (values, resetForm) => {
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: values.username,
          password: values.password,
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Login Failed", data.detail || "Invalid credentials");
        return;
      }

      /* 🔐 STORE TOKEN */
      await SecureStore.setItemAsync("token", data.access_token);
      await SecureStore.setItemAsync("role", data.role);

      resetForm();
      navigation.replace("MainApp", { role: data.role });

    } catch (err) {
      Alert.alert("Error", "Server not reachable");
    }
  };

  /* ===================== UI ===================== */

  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center" }}>
      <View style={styles.container}>
        <Image source={logoimg} style={styles.logo} />

        {/* REGISTER BUTTON */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setShowRegister(!showRegister);
            setShowLogin(false);
          }}
        >
          <Text style={styles.paragraph}>Register</Text>
        </TouchableOpacity>

        {/* REGISTER FORM */}
        <Animated.View
          style={[
            styles.formContainer,
            {
              height: registerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 380],
              }),
              opacity: registerAnim,
            },
          ]}
        >
          <Formik
            initialValues={{ email: "", password: "", confirm: "", dob: "" }}
            validationSchema={RegisterSchema}
            onSubmit={(values, { resetForm }) =>
              handleRegister(values, resetForm)
            }
          >
            {({
              handleChange,
              handleBlur,
              handleSubmit,
              setFieldValue,
              values,
              errors,
              touched,
            }) => (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={values.email}
                  onChangeText={handleChange("email")}
                  onBlur={handleBlur("email")}
                />
                {touched.email && <Text style={styles.errorText}>{errors.email}</Text>}

                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  secureTextEntry
                  value={values.password}
                  onChangeText={handleChange("password")}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  secureTextEntry
                  value={values.confirm}
                  onChangeText={handleChange("confirm")}
                />

                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text>{values.dob || "Select DOB"}</Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={new Date()}
                    mode="date"
                    maximumDate={new Date()}
                    onChange={(e, date) => {
                      setShowDatePicker(false);
                      if (date)
                        setFieldValue(
                          "dob",
                          date.toISOString().split("T")[0]
                        );
                    }}
                  />
                )}

                <View style={styles.radioGroup}>
                  <RadioButton label="Doctor" value="doctor" selected={role} onSelect={setRole} />
                  <RadioButton label="Patient" value="patient" selected={role} onSelect={setRole} />
                </View>

                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                  <Text style={styles.submitText}>Register</Text>
                </TouchableOpacity>
              </>
            )}
          </Formik>
        </Animated.View>

        {/* LOGIN BUTTON */}
        <TouchableOpacity
          style={[styles.actionButton, { marginTop: 10 }]}
          onPress={() => {
            setShowLogin(!showLogin);
            setShowRegister(false);
          }}
        >
          <Text style={styles.paragraph}>Login</Text>
        </TouchableOpacity>

        {/* LOGIN FORM */}
        <Animated.View
          style={[
            styles.formContainer,
            {
              height: loginAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 220],
              }),
              opacity: loginAnim,
            },
          ]}
        >
          <Formik
            initialValues={{ username: "", password: "" }}
            validationSchema={LoginSchema}
            onSubmit={(values, { resetForm }) =>
              handleLogin(values, resetForm)
            }
          >
            {({ handleChange, handleSubmit, values }) => (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  value={values.username}
                  onChangeText={handleChange("username")}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  secureTextEntry
                  value={values.password}
                  onChangeText={handleChange("password")}
                />

                <View style={styles.radioGroup}>
                  <RadioButton label="Doctor" value="doctor" selected={role} onSelect={setRole} />
                  <RadioButton label="Patient" value="patient" selected={role} onSelect={setRole} />
                </View>

                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                  <Text style={styles.submitText}>Login</Text>
                </TouchableOpacity>
              </>
            )}
          </Formik>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;
