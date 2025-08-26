/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // SUKAMAJU RUN 2025 Colors
        primary: {
          DEFAULT: "#062568",
          50: "#e6e9f3",
          100: "#c0c8e2",
          200: "#96a3cf",
          300: "#6c7ebc",
          400: "#4d62ad",
          500: "#2e469e",
          600: "#253d96",
          700: "#1c328c",
          800: "#132782",
          900: "#062568",
        },
        secondary: {
          DEFAULT: "#b6ef7b",
          50: "#f5fded",
          100: "#e8fad2",
          200: "#daf7b5",
          300: "#cbf497",
          400: "#c1f281",
          500: "#b6ef7b",
          600: "#9fda5e",
          700: "#7fb648",
          800: "#5f8f35",
          900: "#3f6623",
        },
        accent: "#69a64a",
        "torea-bay": "#0c3a9a",
        "tangaroa": "#041441",
        "midnight-moss": "#091406",
        "waikawa-gray": "#5c7098",
        "ship-cove": "#6b85c0",
        "san-juan": "#304978",
        "east-bay": "#455279",
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
      },
      animation: {
        aurora: "aurora 15s ease infinite",
        float: "float 6s ease-in-out infinite",
        "fade-in": "fadeIn 0.5s ease-out",
        "fade-up": "fadeUp 0.5s ease-out",
        "slide-in": "slideIn 0.5s ease-out",
        "bounce-slow": "bounce 2s infinite",
      },
      keyframes: {
        aurora: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
}