/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        campus: {
          dark: '#0B1120',
          darker: '#060A14',
          card: '#111827',
          border: '#1F2937',
          accent: '#2563EB',
          accentLight: '#3B82F6',
          textMuted: '#9CA3AF',
        },
      },
    },
  },
  plugins: [],
}
