import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, ThemeType } from '../constants/colors';

interface ThemeContextProps {
  theme: ThemeType;
  colors: typeof COLORS.light & { primary: string; secondary: string; accent: string };
  isDark: boolean;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

const THEME_KEY = "@setugym_theme_mode";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>('light');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(THEME_KEY);
        if (storedTheme && (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'oled')) {
          setThemeState(storedTheme as ThemeType);
        }
      } catch (e) {
        console.error("Failed to load theme preference", e);
      }
    };
    loadTheme();
  }, []);

  const setTheme = async (newTheme: ThemeType) => {
    try {
      setThemeState(newTheme);
      await AsyncStorage.setItem(THEME_KEY, newTheme);
    } catch (e) {
      console.error("Failed to save theme preference", e);
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'oled' : 'light';
    setTheme(nextTheme);
  };

  const isDark = theme === 'dark' || theme === 'oled';

  const colors = {
    ...COLORS[theme],
    primary: COLORS.primary,
    secondary: COLORS.secondary,
    accent: COLORS.accent
  };

  return (
    <ThemeContext.Provider value={{ theme, colors, isDark, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
