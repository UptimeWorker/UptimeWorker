import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useState, useEffect } from 'react'
import { Language, detectLanguage } from '../i18n/translations'

export default function NotFound() {
  const [language, setLanguage] = useState<Language>('en')

  useEffect(() => {
    const detectedLang = detectLanguage()
    setLanguage(detectedLang)
  }, [])

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'fr' : 'en'
    setLanguage(newLang)
    localStorage.setItem('language', newLang)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header language={language} onLanguageToggle={toggleLanguage} />

      <main className="flex-1 flex items-center justify-center">
        <div className="text-center px-4">
          <h1 className="text-8xl font-bold text-muted-foreground/30 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            {language === 'en' ? 'Page not found' : 'Page introuvable'}
          </h2>
          <p className="text-muted-foreground mb-8">
            {language === 'en'
              ? "The page you're looking for doesn't exist."
              : "La page que vous recherchez n'existe pas."}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            {language === 'en' ? 'Back to status page' : 'Retour au statut'}
          </Link>
        </div>
      </main>

      <Footer language={language} />
    </div>
  )
}
