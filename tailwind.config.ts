import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        page: "#1b1b1b",
        night: "#070707",
        surface: "#22262a",
        elevated: "#2b3f5c",
        line: "#2B3340",
        foreground: "#F5F7FA",
        secondary: "#C2C9D3",
        muted: "#8F98A6",
        field: "#151A21",
        fieldBorder: "#313949",
        focus: "#FDD835",
        accent: "#FDD835",
        cool: "#FDD835",
        warm: "#FDD835",
        success: "#7FB58D",
        warning: "#D2A86D",
        danger: "#C97C7C",
        ink: "#F5F7FA",
        mist: "#C2C9D3",
        gold: "#FDD835",
        ember: "#FDD835",
      },
      boxShadow: {
        glow: "0 8px 24px rgba(0, 0, 0, 0.12)",
      },

    },
  },
  plugins: [],
};

export default config;
