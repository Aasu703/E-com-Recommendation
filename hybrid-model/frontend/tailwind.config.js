module.exports = {
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Figtree", "system-ui", "sans-serif"],
        serif: ["Fraunces", "Georgia", "serif"],
        mono: ["IBM Plex Mono", "Courier New", "monospace"],
      },
      colors: {
        // "Dashain dusk" — brick-maroon accent (temple pillars, sindoor)
        // replacing the stock teal scale used throughout the app.
        teal: {
          50: "#FBF0EA",
          100: "#F5DECF",
          200: "#E9B99A",
          300: "#D99367",
          400: "#C06E3E",
          500: "#A2532A",
          600: "#853F1F",
          700: "#6B3119",
          800: "#4E2413",
          900: "#33170C",
        },
        // warm ink-on-paper neutrals replacing the stock cool slate scale.
        slate: {
          50: "#F8F3E9",
          100: "#EFE6D3",
          200: "#E0D2B6",
          300: "#C6B492",
          400: "#9C8A6C",
          500: "#786A50",
          600: "#5A4E3A",
          700: "#443A29",
          800: "#2D251A",
          900: "#1B1610",
        },
      },
      keyframes: {
        heroRise: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "hero-rise": "heroRise 0.7s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [],
};
