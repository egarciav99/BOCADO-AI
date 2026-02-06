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
        // Paleta principal Bocado
        'bocado-green': '#316559',
        'bocado-green-light': '#6E9277',
        'bocado-gray': '#9DB3C1',
        'bocado-dark-gray': '#374F59',
        'bocado-dark-green': '#2C4F40',
        'bocado-background': '#F9F7F2',
        'bocado-text': '#252423',
        
        // Variantes útiles para estados
        'bocado-green-hover': '#2A574D',
        'bocado-cream': '#F5F3EE',
        'bocado-border': '#E8E6E1',
      },
      fontFamily: {
        sans: ['Verdana', 'Geneva', 'sans-serif'],
      },
      maxWidth: {
        'mobile': '480px',
        'app': '480px', // Bocado está optimizado para mobile-first
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'bocado': '0 4px 20px -2px rgba(49, 101, 89, 0.15)',
        'bocado-lg': '0 10px 40px -4px rgba(49, 101, 89, 0.2)',
      }
    },
  },
  plugins: [],
}