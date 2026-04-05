/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
      colors: {
        brand: {  
          50:  '#f0f4ff',
          100: '#e0e9ff',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        accent: {
          400: '#a78bfa',
          500: '#8b5cf6',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'float':      'float 6s ease-in-out infinite',
        'shimmer':    'shimmer 2s linear infinite',
        'spin-slow':  'spin 3s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%':   { left: '-100%' },
          '100%': { left: '200%' },
        },
      },
    },
  },
  plugins: [],
};
