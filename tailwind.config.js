/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
   
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/api/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bocado-green': '#316559',
        'bocado-green-light': '#6E9277',
        'bocado-gray': '#9DB3C1',
        'bocado-dark-gray': '#374F59',
        'bocado-dark-green': '#2C4F40',
        'bocado-background': '#F9F7F2',
        'bocado-text': '#252423',
      },
      fontFamily: {
        sans: ['Verdana', 'sans-serif'],
      },
    },
  },
  plugins: [],
}