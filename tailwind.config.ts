import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        chalk: '#F2F3EF',
        ink: '#15181D',
        steel: '#6B7078',
        line: '#E1E3DE',
        plate: {
          blue: '#1D4ED8',
          red: '#E5322D',
          yellow: '#F5B700',
          green: '#1F9D55',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
