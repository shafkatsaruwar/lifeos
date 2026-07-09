import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        muted: "var(--muted)",
        panel: "var(--panel)",
        line: "var(--line)",
        canvas: "var(--canvas)",
        accent: "var(--accent)",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,.03), 0 12px 32px rgba(15,23,42,.05)",
      },
    },
  },
  plugins: [],
} satisfies Config;
