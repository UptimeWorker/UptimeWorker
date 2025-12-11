import { useState, useEffect } from 'react'
import { settings } from '../data/monitors'
import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'
import { Language } from '../i18n/translations'

interface HeaderProps {
  language: Language
  onLanguageToggle: () => void
}

export default function Header({ language, onLanguageToggle }: HeaderProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    // Detect initial theme
    const isDark = document.documentElement.classList.contains('dark')
    setTheme(isDark ? 'dark' : 'light')

    // Listen for theme changes
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark')
      setTheme(isDark ? 'dark' : 'light')
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [])

  // Get logo based on current theme
  const logoDark = import.meta.env.VITE_STATUS_LOGO_DARK
  const logoLight = import.meta.env.VITE_STATUS_LOGO_LIGHT
  const logoPath = theme === 'dark' ? logoDark : logoLight

  return (
    <header className="border-b border-border/10 bg-background/95 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            {logoPath ? (
              <img
                src={logoPath}
                alt={settings.title}
                className="h-10 w-auto max-w-[200px] object-contain"
              />
            ) : (
              <h1 className="text-lg sm:text-xl font-semibold text-foreground">
                {settings.title}
              </h1>
            )}
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle language={language} onToggle={onLanguageToggle} />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}
