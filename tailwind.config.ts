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
        ink: "#0b1020",
        night: "#040814",
        mist: "#b7c2d9",
        line: "rgba(183, 194, 217, 0.16)",
        gold: "#c9d6ff",
        ember: "#7aa2ff",
      },
      boxShadow: {
        glow: "0 20px 80px rgba(35, 69, 143, 0.28)",
      },
backgroundImage: {
  "celestial-fade":
    "radial-gradient(circle at top, rgba(201, 214, 255, 0.16), transparent 50%), linear-gradient(180deg, #0b1020 0%, #040814 100%)",
},
    },
  },
  plugins: [],
};

export default config;
