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
        'card': '12px',
      },
      boxShadow: {
        'card': '0 1px 2px rgba(15, 23, 42, 0.06), 0 12px 24px rgba(15, 23, 42, 0.06)',
        'card-hover': '0 1px 2px rgba(15, 23, 42, 0.08), 0 16px 30px rgba(15, 23, 42, 0.1)',
        'glow': '0 0 22px rgba(79, 70, 229, 0.2)',
        'glow-lg': '0 0 36px rgba(79, 70, 229, 0.24)',
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