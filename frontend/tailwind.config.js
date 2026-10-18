/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#6C47FF",      // purple
        secondary: "#00C896",    // teal/green
        accent: "#FF6B35",       // orange
        // Theme color placeholders (handled dynamically or via static classes)
        bgDark: "#0F0F1A",
        bgLight: "#F5F5F5",
        cardDark: "#1A1A2E",
        cardLight: "#FFFFFF"
      }
    },
  },
  plugins: [],
}
