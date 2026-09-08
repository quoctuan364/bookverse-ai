export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:3000"; // 10.0.2.2 cho Android Emulator, localhost cho iOS

export const COLORS = {
  background: "#09090b",
  surface: "#18181b",
  surfaceLight: "#27272a",
  border: "#3f3f46",
  text: "#fafafa",
  textMuted: "#a1a1aa",
  primary: "#6366f1", // Indigo
  primaryLight: "#818cf8",
  secondary: "#10b981", // Emerald
  accent: "#f59e0b", // Amber
  danger: "#ef4444",
  warning: "#f97316",
  card: "#121215",
};

export const READER_THEMES = {
  dark: {
    background: "#121212",
    text: "#e4e4e7",
    uiBackground: "#1e1e24",
    border: "#2e2e38",
  },
  sepia: {
    background: "#fbf0d9",
    text: "#433422",
    uiBackground: "#f4e4c1",
    border: "#e2ceaa",
  },
  light: {
    background: "#ffffff",
    text: "#18181b",
    uiBackground: "#f4f4f5",
    border: "#e4e4e7",
  },
};
