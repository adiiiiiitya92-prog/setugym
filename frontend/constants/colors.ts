export const COLORS = {
  primary: "#6C47FF", // purple
  secondary: "#00C896", // teal/green
  accent: "#FF6B35", // orange
  
  light: {
    background: "#F5F5F5",
    card: "#FFFFFF",
    text: "#0F0F1A",
    textSecondary: "#6B7280",
    border: "#E5E7EB",
    statusBar: "dark-content",
    shadow: "#000000",
  },
  dark: {
    background: "#0F0F1A",
    card: "#1A1A2E",
    text: "#F5F5F5",
    textSecondary: "#9CA3AF",
    border: "#2A2A40",
    statusBar: "light-content",
    shadow: "#000000",
  },
  oled: {
    background: "#000000",
    card: "#0D0D15",
    text: "#FFFFFF",
    textSecondary: "#9CA3AF",
    border: "#1C1C28",
    statusBar: "light-content",
    shadow: "#000000",
  }
};

export type ThemeType = 'light' | 'dark' | 'oled';
