import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#EFEEE8",
        "paper-hi": "#FBFAF6",
        ink: "#15171D",
        "ink-soft": "#1E212A",
        ultra: "#2B2AE0",
        magenta: "#D4006E",
        slate: "#6C707B",
        rule: "#DAD8D0",
      },
      fontFamily: {
        display: ["var(--font-display)", "Helvetica Neue", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      keyframes: {
        settle: {
          "0%": { opacity: "0", transform: "rotate(-2deg) translateY(48px)" },
          "100%": { opacity: "1", transform: "rotate(0) translateY(0)" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        modalIn: {
          "0%": { opacity: "0", transform: "translateY(8px) scale(.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        toastIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        settle: "settle .9s cubic-bezier(.2,.8,.25,1) both",
        rise: "rise .5s ease both",
        modalIn: "modalIn .18s ease both",
        toastIn: "toastIn .2s ease both",
      },
      boxShadow: {
        card: "0 24px 60px rgba(0,0,0,.45)",
        modal: "0 30px 80px rgba(0,0,0,.35)",
        toast: "0 12px 30px rgba(0,0,0,.3)",
      },
    },
  },
};

export default config;
