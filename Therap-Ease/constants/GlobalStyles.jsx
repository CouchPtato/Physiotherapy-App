import { StyleSheet } from "react-native";

// Modern, professional color palette
export const ColorTheme = {
  first: "#F9FAFB",      // Light background
  second: "#E5E7EB",     // Light gray
  third: "rgba(0, 0, 0, 0.7)",
  fourth: "#6366F1",     // Primary indigo
  fifth: "#8B5CF6",      // Purple accent
  sixth: "#9CA3AF",      // Muted gray
  seventh: "#1F2937",    // Dark text
  primary: "#6366F1",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  dark: "#1F2937",
  light: "#F9FAFB",
  muted: "#6B7280",
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
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: ColorTheme.primary,
    marginRight: 10,
  },
  radioSelected: {
    backgroundColor: ColorTheme.primary,
  },
  radioLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: ColorTheme.dark,
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
});
    paddingVertical: 10,
    marginTop: 10,
  },
  submitText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
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
    borderWidth: 1,
    borderColor: ColorTheme.fourth,
    marginRight: 8,
  },
  radioSelected: {
    backgroundColor: ColorTheme.fourth,
  },
  radioLabel: {
    fontSize: 16,
  },
  errorText: {
    color: ColorTheme.error,
    marginTop: 0,
    marginBottom: 5,
    fontSize: 12,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 10,
  },
  screen: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    backgroundColor: ColorTheme.first,
  },
  button: {
    width:'95%',
    borderRadius: 200, 
    height:'7%',
    backgroundColor: ColorTheme.fourth,
    alignItems:'center',
    justifyContent: 'center'
  },
  buttonText: {
    fontSize:18, 
    color:ColorTheme.first,
    fontWeight: 'bold',
  },
});
