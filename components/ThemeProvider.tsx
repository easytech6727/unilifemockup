'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Get saved theme or default to light
    const savedTheme = localStorage.getItem('theme') as Theme | null
    const initialTheme = savedTheme || 'light'
    
    setTheme(initialTheme)
    
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', initialTheme)
    document.body.className = `${initialTheme}-mode`
    
    // Load corresponding CSS file
    const linkId = 'theme-styles'
    let link = document.getElementById(linkId) as HTMLLinkElement | null
    
    if (!link) {
      link = document.createElement('link')
      link.id = linkId
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
    
    link.href = initialTheme === 'dark' ? '/dark.css' : '/light.css'
    
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    document.body.className = `${newTheme}-mode`
    
    // Swap CSS file
    const link = document.getElementById('theme-styles') as HTMLLinkElement | null
    if (link) {
      link.href = newTheme === 'dark' ? '/dark.css' : '/light.css'
    }
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}