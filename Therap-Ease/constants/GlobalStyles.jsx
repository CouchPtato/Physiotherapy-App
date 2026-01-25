import { StyleSheet } from "react-native";

// Light theme color palette
export const LightTheme = {
  first: "#ffffff",
  second: "#d7d7d7",
  third: "rgba(0, 0, 0, 0.7)",
  fourth: "#2b9d8a",
  fifth: "#53a496",
  sixth: "#fffefe",
  seventh: "#1F2937",
  primary: "#6366F1",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  dark: "#1F2937",
  light: "#f4f4f4",
  muted: "#6B7280",
  bg: "#f4f4f4",
  text: "#1F2937",
  border: "#E5E7EB",
};

// Dark theme color palette
export const DarkTheme = {
  first: "#111827",
  second: "#212d3d",
  third: "rgba(255, 255, 255, 0.7)",
  fourth: "#2b9d8a",
  fifth: "#53a496",
  sixth: "#b5b5b5",
  seventh: "#f4f4f4",
  primary: "#818CF8",
  success: "#34D399",
  warning: "#FBBF24",
  danger: "#F87171",
  dark: "#f4f4f4",
  light: "#111827",
  muted: "#9CA3AF",
  bg: "#0F172A",
  text: "#f4f4f4",
  border: "#1F2937",
};

// Default to light theme
export const ColorTheme = LightTheme;

export const getTheme = (isDarkMode) => {
  return isDarkMode ? DarkTheme : LightTheme;
};

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: ColorTheme.first,
    padding: 16,
    alignItems: "center",
  },

  screen: {
    flex: 1,
    backgroundColor: ColorTheme.light,
  },

  paragraph: {
    margin: 10,
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    color: ColorTheme.dark,
  },

  actionButton: {
    backgroundColor: ColorTheme.primary,
    width: "70%",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },

  formContainer: {
    width: "85%",
    overflow: "hidden",
    marginTop: 16,
  },

  input: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1.5,
    borderColor: ColorTheme.second,
    fontSize: 14,
    fontWeight: "500",
  },

  submitButton: {
    backgroundColor: ColorTheme.primary,
    borderRadius: 10,
    paddingVertical: 12,
    marginVertical: 12,
    alignItems: "center",
  },

  submitText: {
    color: "white",
    fontWeight: "700",
    fontSize: 14,
  },

  radioGroup: {
    flexDirection: "row",
    marginTop: 10,
    justifyContent: "space-around",
  },

  radioOption: {
    flexDirection: "row",
    alignItems: "center",
  },

  radioCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: ColorTheme.fourth,
    marginRight: 8,
  },

  radioSelected: {
    backgroundColor: ColorTheme.fourth,
  },

  radioLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: ColorTheme.dark,
  },

  errorText: {
    color: ColorTheme.danger, // fixed (was ColorTheme.error which didn’t exist)
    marginBottom: 5,
    fontSize: 12,
  },

  logo: {
    width: 200,
    height: 200,
    marginBottom: 10,
  },

  headerCard: {
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: ColorTheme.second,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: ColorTheme.dark,
  },

  headerSubtitle: {
    fontSize: 12,
    color: ColorTheme.muted,
    marginTop: 2,
  },

  button: {
    width: "95%",
    borderRadius: 200,
    height: "7%",
    backgroundColor: ColorTheme.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonText: {
    fontSize: 18,
    color: ColorTheme.first,
    fontWeight: "bold",
  },
});
