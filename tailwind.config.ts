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
        page: "#111418",
        night: "#0D1014",
        surface: "#1A1F27",
        elevated: "#222834",
        line: "#2B3340",
        foreground: "#F5F7FA",
        secondary: "#C2C9D3",
        muted: "#8F98A6",
        field: "#151A21",
        fieldBorder: "#313949",
        focus: "#0091AD",
        accent: "#0091AD",
        cool: "#0091AD",
        warm: "#0091AD",
        success: "#7FB58D",
        warning: "#D2A86D",
        danger: "#C97C7C",
        ink: "#F5F7FA",
        mist: "#C2C9D3",
        gold: "#0091AD",
        ember: "#0091AD",
      },
      boxShadow: {
        glow: "0 8px 24px rgba(0, 0, 0, 0.12)",
      },
      backgroundImage: {
        "celestial-fade":
          "radial-gradient(circle at top, rgba(0, 145, 173, 0.08), transparent 48%), linear-gradient(180deg, #111418 0%, #111418 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
