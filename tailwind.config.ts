import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        chalk: '#131722',
        ink: '#F8FAFC',
        steel: '#94A3B8',
        line: '#202637',
        dark: {
          950: '#08090C',
          900: '#11141B',
          850: '#171B26',
          800: '#202637',
          700: '#2D364D',
        },
        plate: {
          orange: '#FF5500',
          blue: '#FF5500',
          cyan: '#00B4D8',
          red: '#EF4444',
          yellow: '#F59E0B',
          green: '#10B981',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-orange': '0 0 25px -4px rgba(255, 85, 0, 0.35)',
        'glow-cyan': '0 0 25px -4px rgba(0, 180, 216, 0.35)',
        'plate': '0 4px 20px -2px rgba(0, 0, 0, 0.6)',
      },
    },
  },
  plugins: [],
} satisfies Config
