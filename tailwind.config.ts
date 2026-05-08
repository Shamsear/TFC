import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        foreground: "#ffffff",
        neon: {
          blue: "#00f0ff",
          pink: "#ff00ff",
          green: "#00ff88",
          purple: "#b000ff",
          yellow: "#ffff00",
          orange: "#ff6600",
        },
        dark: {
          100: "#1a1a1a",
          200: "#2a2a2a",
          300: "#3a3a3a",
        },
      },
      boxShadow: {
        "offset-80": "80px 80px 0px rgba(0, 240, 255, 0.3)",
        "offset-80-pink": "80px 80px 0px rgba(255, 0, 255, 0.3)",
        "offset-80-green": "80px 80px 0px rgba(0, 255, 136, 0.3)",
        "offset-80-purple": "80px 80px 0px rgba(176, 0, 255, 0.3)",
        "neon-glow": "0 0 20px rgba(0, 240, 255, 0.5)",
        "neon-glow-pink": "0 0 20px rgba(255, 0, 255, 0.5)",
        "neon-glow-green": "0 0 20px rgba(0, 255, 136, 0.5)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.5s ease-out",
        "pulse-neon": "pulseNeon 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        pulseNeon: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(0, 240, 255, 0.5)" },
          "50%": { boxShadow: "0 0 40px rgba(0, 240, 255, 0.8)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
