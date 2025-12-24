/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./Client/index.html",
    "./Client/src/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        minecraft: {
          green: '#5D8C3E',
          brown: '#8B5A2B',
          dirt: '#7A5C3D',
          stone: '#7F7F7F',
          grass: '#5D8C3E',
        }
      }
    },
  },
  plugins: [],
}
