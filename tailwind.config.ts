import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        line: "var(--line)",
        accent: "var(--accent)",
        "accent-2": "var(--accent-2)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)"
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"]
      },
      borderRadius: {
        panel: "var(--radius-card)",
        control: "var(--radius-input)",
        chip: "var(--radius-chip)"
      },
      boxShadow: {
        panel: "var(--shadow-panel)"
      },
      transitionTimingFunction: {
        editorial: "var(--ease-standard)"
      },
      transitionDuration: {
        hover: "var(--duration-hover)",
        panel: "var(--duration-panel)",
        page: "var(--duration-page)"
      },
      maxWidth: {
        workspace: "1400px"
      }
    }
  },
  plugins: []
};

export default config;
