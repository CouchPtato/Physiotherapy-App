import React, { createContext, useContext, useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";

interface ThemeType {
  background: string;
  text: string;
}

interface ThemeContextType {
  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean) => void;
  theme: ThemeType;
}

const LightTheme: ThemeType = {
  background: "#f4f4f4",
  text: "#1F2937",
};

const DarkTheme: ThemeType = {
  background: "#111827",
  text: "#FFFFFF",
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await SecureStore.getItemAsync("darkMode");
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === "true");
        }
      } catch (error) {
        console.log("Error loading theme preference:", error);
      }
    };

    loadThemePreference();
  }, []);

  const handleSetIsDarkMode = async (isDark: boolean) => {
    setIsDarkMode(isDark);
    try {
      await SecureStore.setItemAsync("darkMode", isDark.toString());
    } catch (error) {
      console.log("Error saving theme preference:", error);
    }
  };

  const theme = isDarkMode ? DarkTheme : LightTheme;

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        setIsDarkMode: handleSetIsDarkMode,
        theme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
