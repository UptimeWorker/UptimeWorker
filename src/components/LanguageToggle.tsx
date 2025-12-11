import { Languages } from 'lucide-react'
import { Language, getTranslations } from '../i18n/translations'

interface LanguageToggleProps {
  language: Language
  onToggle: () => void
}

export default function LanguageToggle({ language, onToggle }: LanguageToggleProps) {
  const t = getTranslations(language)

  return (
    <button
      onClick={onToggle}
      className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md border border-border bg-background hover:bg-accent transition-colors"
      title={language === 'en' ? t.switchToFrenchTooltip : t.switchToEnglishTooltip}
    >
      <Languages className="h-4 w-4" />
      <span className="text-sm font-medium">{language === 'en' ? 'FR' : 'EN'}</span>
    </button>
  )
}
