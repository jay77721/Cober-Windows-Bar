/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Segoe UI", "Microsoft YaHei", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glass: "0 18px 50px rgba(0, 0, 0, 0.36), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
        glow: "0 0 36px rgba(65, 168, 255, 0.22)",
      },
    },
  },
  plugins: [],
};
