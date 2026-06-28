/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Vercel-grade dark grayscale ranking
        bg: "#0a0a0a", // background-100 (page)
        surface: "#0e0e0e", // cell surface
        surface2: "#161616", // raised / hover
        border: "rgba(255,255,255,0.09)", // gray-alpha border (default)
        "border-strong": "rgba(255,255,255,0.14)", // gray-alpha border (hover/active)
        text: "#ededed", // gray-1000 (primary)
        secondary: "#a0a0a0", // gray-900 (secondary)
        tertiary: "#6e6e6e", // gray-700 (tertiary / disabled)
        accent: "#F97316",
        "accent-soft": "#FDBA74",
        good: "#3FB950",
        warn: "#D29922",
        risk: "#F85149",
      },
      fontFamily: {
        sans: ["Geist", "system-ui", "-apple-system", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        // tightened display sizes per Geist
        "display-lg": ["42px", { lineHeight: "1.05", letterSpacing: "-0.03em", fontWeight: "600" }],
        "display": ["28px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "600" }],
      },
      borderRadius: {
        DEFAULT: "6px",
        md: "8px",
        lg: "12px",
      },
      transitionTimingFunction: {
        vercel: "cubic-bezier(0.175, 0.885, 0.32, 1.1)",
      },
      transitionDuration: {
        fast: "150ms",
      },
      boxShadow: {
        cell: "0 2px 2px rgba(0,0,0,0.18)",
        pop: "0 1px 1px rgba(0,0,0,0.2), 0 8px 16px -4px rgba(0,0,0,0.4), 0 24px 32px -8px rgba(0,0,0,0.5)",
        focus: "0 0 0 2px #0a0a0a, 0 0 0 4px rgba(249,115,22,0.7)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateX(-6px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-soft": {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.32s cubic-bezier(0.175,0.885,0.32,1.1)",
        "slide-in": "slide-in 0.28s cubic-bezier(0.175,0.885,0.32,1.1)",
        "pop-in": "pop-in 0.28s cubic-bezier(0.175,0.885,0.32,1.1)",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
