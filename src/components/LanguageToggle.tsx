import { useState, useRef, useEffect } from 'react'
import { Languages, Check, ChevronDown } from 'lucide-react'
import {
  Language,
  getTranslations,
  getNextLanguage,
  ENABLED_LANGUAGES,
  NATIVE_NAMES
} from '../i18n/translations'

interface LanguageToggleProps {
  language: Language
  onChange: (lang: Language) => void
}

export default function LanguageToggle({ language, onChange }: LanguageToggleProps) {
  const t = getTranslations(language)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (ENABLED_LANGUAGES.length <= 2) {
    return (
      <button
      onClick={() => onChange(getNextLanguage(language))}
      className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md border border-border bg-background hover:bg-accent transition-colors"
      title={t.changeLanguageTooltip}
      >
      <Languages className="h-4 w-4" />
      <span className="text-sm font-medium">{t.languageCode}</span>
      </button>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
    <button
    onClick={() => setIsOpen(!isOpen)}
    className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md border border-border bg-background hover:bg-accent transition-colors w-full"
    title={t.changeLanguageTooltip}
    >
    <Languages className="h-4 w-4" />
    <span className="text-sm font-medium">{t.languageCode}</span>
    <ChevronDown className={`h-3 w-3 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>

    {isOpen && (
      <div className="absolute right-0 top-full mt-1 w-40 rounded-md border border-border bg-popover shadow-md py-1 z-50">
      {ENABLED_LANGUAGES.map((langCode) => (
        <button
        key={langCode}
        onClick={() => {
          onChange(langCode)
          setIsOpen(false)
        }}
        className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-accent hover:text-accent-foreground
          ${language === langCode ? 'bg-accent/50 font-medium' : ''}
          `}
          >
          <span>{NATIVE_NAMES[langCode]}</span>
          {language === langCode && <Check className="h-3.5 w-3.5" />}
          </button>
      ))}
      </div>
    )}
    </div>
  )
}
