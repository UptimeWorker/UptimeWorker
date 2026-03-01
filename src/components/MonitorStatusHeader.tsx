import { cn } from '@/lib/utils'
import { Language, getTranslations } from '../i18n/translations'
import { type StatusLike } from '../lib/status'

interface MonitorStatusHeaderProps {
  overallStatus: StatusLike
  lastUpdate?: string
  language: Language
}

export default function MonitorStatusHeader({
  overallStatus,
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
  const isOperational = overallStatus === 'operational'
  const isMaintenance = overallStatus === 'maintenance'
  const isDegraded = overallStatus === 'degraded'
  const isDown = overallStatus === 'down'

  const title = isOperational
    ? t.allOperational
    : isMaintenance
      ? t.maintenance
      : isDegraded
        ? t.degraded
        : isDown
          ? t.notAllOperational
          : t.noData

  return (
    <div className={cn(
      "rounded-lg border-2 p-5 sm:p-6 shadow-sm",
      isOperational && "border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20",
      isMaintenance && "border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/20",
      isDegraded && "border-yellow-200 dark:border-yellow-900 bg-yellow-50/60 dark:bg-yellow-950/20",
      isDown && "border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20",
      overallStatus === 'unknown' && "border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/40"
    )}>
      <div className="flex items-center gap-3 mb-2">
        <span className={cn(
          "w-3 h-3 rounded-full",
          isOperational && "bg-green-500",
          isMaintenance && "bg-blue-500",
          isDegraded && "bg-yellow-500",
          isDown && "bg-red-500",
          overallStatus === 'unknown' && "bg-gray-400"
        )} />
        <h2 className={cn(
          "text-base sm:text-lg font-semibold",
          isOperational && "text-green-900 dark:text-green-100",
          isMaintenance && "text-blue-900 dark:text-blue-100",
          isDegraded && "text-yellow-900 dark:text-yellow-100",
          isDown && "text-red-900 dark:text-red-100",
          overallStatus === 'unknown' && "text-gray-900 dark:text-gray-100"
        )}>
          {title}
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
