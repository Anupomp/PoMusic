/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#f4f1e8',
        ink: '#111111',
        lime: '#e8ff47',
        coral: '#ff4757',
        blue: '#4a7fff',
        paper: '#ffffff',
        smoke: '#666666',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
      },
      boxShadow: {
        brut: '4px 4px 0 #111111',
        'brut-sm': '2px 2px 0 #111111',
        'brut-lg': '6px 6px 0 #111111',
        'brut-lime': '4px 4px 0 #e8ff47',
      },
    },
  },
  plugins: [],
};
