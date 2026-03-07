/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'accent-cyan': '#56d6e0',
        'accent-rose': '#e879a8',
        'accent-green': '#4ade80',
        'accent-blue': '#60a5fa',
        'accent-yellow': '#fbbf24',
        'accent-red': '#fb7185',
        'warm': {
          50: '#faf8f4',
          100: '#f5f0e8',
          200: '#e8e0d0',
          300: '#d9cebf',
          400: '#c4b5a0',
        },
        'dark-bg': {
          900: '#0c0f18',
          800: '#111724',
          700: '#171f30',
          600: '#1d2742',
          500: '#243254',
        },
      },
      boxShadow: {
        'glow-primary-sm': '0 0 8px rgba(86, 214, 224, 0.3)',
        'glow-primary': '0 0 20px rgba(86, 214, 224, 0.4), 0 0 40px rgba(86, 214, 224, 0.15)',
        'glow-success-sm': '0 0 8px rgba(74, 222, 128, 0.3)',
        'glow-success': '0 0 20px rgba(74, 222, 128, 0.4), 0 0 40px rgba(74, 222, 128, 0.15)',
        'glow-accent-sm': '0 0 8px rgba(232, 121, 168, 0.3)',
        'glow-accent': '0 0 20px rgba(232, 121, 168, 0.4), 0 0 40px rgba(232, 121, 168, 0.15)',
        'glow-warning-sm': '0 0 8px rgba(251, 191, 36, 0.3)',
        'glow-warning': '0 0 20px rgba(251, 191, 36, 0.4), 0 0 40px rgba(251, 191, 36, 0.15)',
        'glow-danger-sm': '0 0 8px rgba(251, 113, 133, 0.3)',
        'glow-danger': '0 0 20px rgba(251, 113, 133, 0.4), 0 0 40px rgba(251, 113, 133, 0.15)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.3), 0 0 1px rgba(86, 214, 224, 0.1)',
        'card-hover': '0 4px 16px rgba(0, 0, 0, 0.4), 0 0 8px rgba(86, 214, 224, 0.15)',
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'glow-breathe': 'glow-breathe 3s ease-in-out infinite',
        'border-glow': 'border-glow 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.2s ease-out',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'glow-breathe': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(86, 214, 224, 0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(86, 214, 224, 0.5)' },
        },
        'border-glow': {
          '0%, 100%': { borderColor: 'rgba(86, 214, 224, 0.3)' },
          '50%': { borderColor: 'rgba(86, 214, 224, 0.7)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
