/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0F0F0F",
        surface: "#161616",
        surface2: "#1C1C1C",
        border: "#272727",
        text: "#E8E8E8",
        secondary: "#8F8F8F",
        accent: "#5B47EB",
        "accent-soft": "#6E5BF0",
        good: "#3FB950",
        warn: "#D29922",
        risk: "#F85149",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(91,71,235,0.5)" },
          "70%": { boxShadow: "0 0 0 10px rgba(91,71,235,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(91,71,235,0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.35s ease-out",
        "pop-in": "pop-in 0.3s ease-out",
        "pulse-ring": "pulse-ring 1.8s infinite",
      },
    },
  },
  plugins: [],
};
