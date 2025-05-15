/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--bg-main) / <alpha-value>)',
        card: 'rgb(var(--bg-card) / <alpha-value>)',
        primary: {
          text: 'rgb(var(--text-primary) / <alpha-value>)',
        },
        secondary: {
          text: 'rgb(var(--text-secondary) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
};