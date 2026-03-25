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
        page: "#131315",
        surface: "#2A2F3A",
        elevated: "#343A46",
        line: "#454C59",
        foreground: "#F3F5F8",
        secondary: "#B8C0CC",
        muted: "#8D97A6",
        field: "#252B35",
        fieldBorder: "#4A5260",
        focus: "#7C8FB5",
        cool: "#A9B8D6",
        warm: "#C9A86A",
        success: "#7FB58D",
        warning: "#D2A86D",
        danger: "#C97C7C",
        ink: "#F3F5F8",
        night: "#1E222B",
        mist: "#B8C0CC",
        gold: "#C9A86A",
        ember: "#7C8FB5",
      },
      boxShadow: {
        glow: "0 18px 56px rgba(0, 0, 0, 0.28)",
      },
      backgroundImage: {
        "celestial-fade":
          "radial-gradient(circle at top, rgba(169, 184, 214, 0.08), transparent 48%), linear-gradient(180deg, #1E222B 0%, #1E222B 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
