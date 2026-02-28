import type { Config } from "tailwindcss";

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: token("canvas"),
        panel: token("panel"),
        raised: token("raised"),
        overlay: token("overlay"),
        line: token("line"),
        "line-strong": token("line-strong"),
        ink: token("ink"),
        "ink-muted": token("ink-muted"),
        "ink-subtle": token("ink-subtle"),
        accent: token("accent"),
        "accent-strong": token("accent-strong"),
        "accent-ink": token("accent-ink"),
        danger: token("danger"),
        success: token("success"),
        info: token("info"),
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        DEFAULT: "4px",
        md: "5px",
        lg: "6px",
        xl: "8px",
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.01em" }],
      },
      transitionTimingFunction: {
        forge: "cubic-bezier(0.2, 0.7, 0.2, 1)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "pop-in": {
          from: { opacity: "0", transform: "translateY(-6px) scale(0.985)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "column-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "toast-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 140ms cubic-bezier(0.2,0.7,0.2,1) both",
        "pop-in": "pop-in 160ms cubic-bezier(0.2,0.7,0.2,1) both",
        "column-in": "column-in 260ms cubic-bezier(0.2,0.7,0.2,1) both",
        "toast-in": "toast-in 180ms cubic-bezier(0.2,0.7,0.2,1) both",
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
