/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./crm.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        admin: {
          primary: "#2563eb",
          primaryDark: "#1d4ed8",
          surface: "#ffffff",
          muted: "#f1f5f9",
          border: "#e2e8f0",
          text: "#0f172a",
          textMuted: "#64748b",
        },
      },
    },
  },
  plugins: [],
}