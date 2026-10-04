import type { Config } from "tailwindcss";

// Palette lives in CSS variables (src/app/globals.css) so the theme can be swapped without touching components.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "rgb(var(--cream) / <alpha-value>)",       // snow
        burgundy: { DEFAULT: "rgb(var(--burgundy) / <alpha-value>)", dark: "rgb(var(--burgundy-dark) / <alpha-value>)" }, // prayer-flag red
        gold: { DEFAULT: "rgb(var(--gold) / <alpha-value>)", light: "rgb(var(--champagne) / <alpha-value>)" },            // marigold
        ink: "rgb(var(--ink) / <alpha-value>)",
        night: "rgb(var(--night) / <alpha-value>)",
        mist: "rgb(var(--mist) / <alpha-value>)",
        glacier: "rgb(var(--glacier) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-display)", "Georgia", "serif"],
      },
      borderRadius: { xl2: "1.25rem" },
      boxShadow: { soft: "0 6px 24px -10px rgb(20 33 61 / 0.25)" },
    },
  },
  plugins: [],
};
export default config;
