/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: '#B32821', // Nepali Crimson
        background: '#FFFFFF',
        surface: '#F8F9FA',
      }
    },
  },
  plugins: [],
}