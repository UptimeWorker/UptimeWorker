import { cn } from '@/lib/utils'
import { CheckCircle2, AlertTriangle, XCircle, Wrench, HelpCircle } from 'lucide-react'
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
  const t = getTranslations(language)
  const locale = language === 'fr' ? 'fr-FR' : language === 'uk' ? 'uk-UA' : 'en-US'
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

  // Icône large par statut (modèle UptimeFlare : lecture immédiate du statut global)
  const StatusIcon = isOperational
    ? CheckCircle2
    : isMaintenance
      ? Wrench
      : isDegraded
        ? AlertTriangle
        : isDown
          ? XCircle
          : HelpCircle

  return (
    <div className={cn(
      "rounded-lg border p-5 sm:p-6",
      isOperational && "border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20",
      isMaintenance && "border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/20",
      isDegraded && "border-yellow-200 dark:border-yellow-900 bg-yellow-50/60 dark:bg-yellow-950/20",
      isDown && "border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20",
      overallStatus === 'unknown' && "border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/40"
    )}>
      <div className="flex items-center gap-3 mb-2">
        <StatusIcon className={cn(
          "w-7 h-7 shrink-0",
          isOperational && "text-green-600 dark:text-green-500",
          isMaintenance && "text-blue-600 dark:text-blue-500",
          isDegraded && "text-yellow-600 dark:text-yellow-500",
          isDown && "text-red-600 dark:text-red-500",
          overallStatus === 'unknown' && "text-gray-400"
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
        <p className="text-xs sm:text-sm text-muted-foreground ml-10">
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
