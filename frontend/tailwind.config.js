/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#fef9ec",
          100: "#fdf0c4",
          200: "#fbe08a",
          300: "#f8c94a",
          400: "#f5b020",
          500: "#e89208",
          600: "#cc7004",
          700: "#a84e07",
          800: "#893d0d",
          900: "#71320e",
        },
      },
    },
  },
  plugins: [],
};
