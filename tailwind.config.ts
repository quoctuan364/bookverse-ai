import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-bookverse-sans)", "\"Segoe UI\"", "Arial", "sans-serif"],
      },
      colors: {
        bookverse: {
          teal: "#153A3F",
          ivory: "#F8F6F1",
          gold: "#D6A84F",
          ink: "#102A2F",
          mint: "#DDEDEA"
        }
      },
      boxShadow: {
        soft: "0 18px 45px rgba(21, 58, 63, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
