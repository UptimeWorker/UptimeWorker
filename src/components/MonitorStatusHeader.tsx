import { cn } from '@/lib/utils'
import { Language, getTranslations } from '../i18n/translations'

interface MonitorStatusHeaderProps {
  allOperational: boolean
  lastUpdate?: string
  language: Language
}

export default function MonitorStatusHeader({
  allOperational,
  lastUpdate,
  language,
}: MonitorStatusHeaderProps) {
  const localeMap: Record<Language, string> = {
    en: 'en-US',
    fr: 'fr-FR',
    uk: 'uk-UA',
  }

  const t = getTranslations(language)
  const locale = localeMap[language] || 'en-US'

  return (
    <div className={cn(
      "rounded-lg border-2 p-5 sm:p-6 shadow-sm",
      allOperational
        ? "border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20"
        : "border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20"
    )}>
      <div className="flex items-center gap-3 mb-2">
        <span className={cn(
          "w-3 h-3 rounded-full",
          allOperational ? "bg-green-500" : "bg-red-500"
        )} />
        <h2 className={cn(
          "text-base sm:text-lg font-semibold",
          allOperational
            ? "text-green-900 dark:text-green-100"
            : "text-red-900 dark:text-red-100"
        )}>
          {allOperational
            ? t.allOperational
            : t.notAllOperational}
        </h2>
      </div>
      {lastUpdate && (
        <p className="text-xs sm:text-sm text-muted-foreground ml-6">
          {t.lastChecked} {new Date(lastUpdate).toLocaleString(locale, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      )}
    </div>
  )
}
