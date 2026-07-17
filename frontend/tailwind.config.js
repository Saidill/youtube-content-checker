/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        yt: { red: '#FF0000', dark: '#0F0F0F', card: '#1F1F1F', border: '#3F3F3F', text: '#AAAAAA' },
      },
    },
  },
  plugins: [],
}
