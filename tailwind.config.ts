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
        bv: {
          primary: "#176B62",
          "primary-dark": "#104C47",
          focus: "#0F766E",
          accent: "#A94432",
          gold: "#F2C14E",
          ink: "#1D2433",
          heading: "#17202A",
          text: "#536071",
          "text-muted": "#59645D",
          "text-subtle": "#596477",
          ivory: "#FFFDF8",
          border: "#D8D0C2",
          surface: "#F7F4ED",
          mint: "#E6F3F0",
          "mint-soft": "#EAF5F1",
          muted: "#EAF2EF",
        },
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
