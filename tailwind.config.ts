import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--color-primary-rgb) / <alpha-value>)',
        primaryDark: 'var(--color-primary-dark)',
        primaryLight: 'var(--color-primary-light)',
        primaryLighter: 'var(--color-primary-lighter)',
        secondary: 'rgb(var(--color-secondary-rgb) / <alpha-value>)',
        secondaryDark: 'var(--color-secondary-dark)',
        background: 'var(--color-bg-dark)',
        card: 'var(--color-bg-dark-secondary)',
        'text-primary': 'var(--color-text-dark)',
        'text-secondary': 'var(--color-text-dark-secondary)',
        'text-muted': 'var(--color-text-dark-tertiary)',
        danger: 'rgb(var(--color-danger-rgb) / <alpha-value>)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        info: 'var(--color-info)',
        glass: 'rgba(255, 255, 255, 0.05)',
        glassBorder: 'rgba(255, 255, 255, 0.1)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'card': '16px',
      },
      boxShadow: {
        'card': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'glow': '0 0 40px rgba(79, 70, 229, 0.3)',
        'glow-lg': '0 0 60px rgba(79, 70, 229, 0.4)',
      },
      backgroundImage: {
        'gradient-primary':
          'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-secondary) 42%, var(--color-primary) 100%)',
      },
    },
  },
  plugins: [],
}

export default config