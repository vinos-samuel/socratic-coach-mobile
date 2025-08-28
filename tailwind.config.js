/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: '#E8E3DC',
        foreground: '#3D3D39',
        primary: '#3D3D39',
        secondary: '#6B6B65',
        accent: '#9B6CDB',
        surface: '#FFFFFF',
      },
    },
  },
  plugins: [],
}