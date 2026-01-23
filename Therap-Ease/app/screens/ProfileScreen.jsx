import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import UserCard from "../../components/UserCard.jsx";
import { styles } from "../../constants/GlobalStyles.jsx";
import { useTheme } from "../../hooks/use-theme";

function ProfileScreen({role}) {
  const { isDarkMode } = useTheme();
  
  const dynamicColors = {
    containerBg: isDarkMode ? "#0F172A" : "#F9FAFB",
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: dynamicColors.containerBg }]}>
      <UserCard />
    </SafeAreaView>
  );
}

export default ProfileScreen;
