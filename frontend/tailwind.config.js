/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdf2ef",
          100: "#fbe4de",
          500: "#f25c38", // The primary orange from Figma
          600: "#e04925",
          700: "#bc391a",
        },
        dashboard: {
          sidebar: "#111111", // Dark charcoal sidebar
          bg: "#CACACA",      // Updated to requested grey
          card: "#ffffff",
        }
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
