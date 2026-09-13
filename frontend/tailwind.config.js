/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Each step reads a CSS custom property holding an "R G B"
        // triple (space-separated, no commas — required by Tailwind's
        // <alpha-value> substitution). Defaults for these variables
        // live in index.css's :root, and BrandingContext.jsx
        // overwrites them at runtime from the admin's chosen
        // primary_color — so every bg-brand-500 / text-brand-600 /
        // border-brand-500 / focus:ring-brand-500/25 class etc.
        // across the whole app follows Branding settings, not just
        // the couple of spots that read var(--color-primary) directly.
        brand: {
          50:  "rgb(var(--brand-50) / <alpha-value>)",
          100: "rgb(var(--brand-100) / <alpha-value>)",
          200: "rgb(var(--brand-200) / <alpha-value>)",
          300: "rgb(var(--brand-300) / <alpha-value>)",
          400: "rgb(var(--brand-400) / <alpha-value>)",
          500: "rgb(var(--brand-500) / <alpha-value>)",
          600: "rgb(var(--brand-600) / <alpha-value>)",
          700: "rgb(var(--brand-700) / <alpha-value>)",
          800: "rgb(var(--brand-800) / <alpha-value>)",
          900: "rgb(var(--brand-900) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
};