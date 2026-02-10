/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bocado: {
          green: '#316559',
          'green-light': '#6E9277',
          'green-hover': '#2A574D',
          'dark-green': '#2C4F40',
          gray: '#9DB3C1',
          'dark-gray': '#374F59',
          background: '#F9F7F2',
          cream: '#F5F3EE',
          border: '#E8E6E1',
          text: '#252423',
        }
      },
      fontFamily: {
        sans: ['Verdana', 'Geneva', 'sans-serif'],
      },
      fontSize: {
        // Sistema tipográfico consistente
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],  // 10px - Labels pequeños
        'xs': ['0.75rem', { lineHeight: '1rem' }],        // 12px - Labels, captions
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],    // 14px - Texto secundario
        'base': ['1rem', { lineHeight: '1.5rem' }],       // 16px - Texto body
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],    // 18px - Subtítulos
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],     // 20px - Títulos pantalla
      },
      maxWidth: {
        'mobile': '480px',
        'app': '480px',
        'app-lg': '560px',
        'app-xl': '640px',
      },
      spacing: {
        18: '4.5rem',
        88: '22rem',
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
