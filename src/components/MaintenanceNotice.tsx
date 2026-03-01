import { Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Language, getTranslations } from '../i18n/translations'
import { getMaintenanceDate, type MaintenanceWindow } from '../lib/maintenance'

export type LocalizedText = string | { en: string; fr?: string; uk?: string }

export interface MaintenanceData extends MaintenanceWindow {
  id: string
  title: LocalizedText
  message: LocalizedText
  affectedServices: string[]
}

interface MaintenanceNoticeProps {
  maintenance: MaintenanceData
  language: Language
}

function getLocalizedText(text: LocalizedText, language: Language): string {
  if (typeof text === 'string') {
    return text
  }

  return text[language] || text.en
}

export default function MaintenanceNotice({ maintenance, language }: MaintenanceNoticeProps) {
  const t = getTranslations(language)
  const locale = language === 'fr' ? 'fr-FR' : language === 'uk' ? 'uk-UA' : 'en-US'

  const start = getMaintenanceDate(maintenance, 'start')
  const end = getMaintenanceDate(maintenance, 'end')

  const windowLabel = start
    ? end
      ? `${start.toLocaleString(locale, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })} - ${end.toLocaleString(locale, {
          hour: '2-digit',
          minute: '2-digit',
        })}`
      : start.toLocaleString(locale, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
    : ''

  return (
    <div className="rounded-lg p-4 sm:p-5 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <Wrench className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              {getLocalizedText(maintenance.title, language)}
            </h3>
            <span className="text-xs whitespace-nowrap opacity-70 text-blue-700 dark:text-blue-300">
              {windowLabel}
            </span>
          </div>

          <p className="text-xs sm:text-sm leading-relaxed mb-2 text-blue-700 dark:text-blue-300">
            {getLocalizedText(maintenance.message, language)}
          </p>

          {maintenance.affectedServices.length > 0 && (
            <p className={cn('text-xs opacity-75 text-blue-700 dark:text-blue-300')}>
              {t.affectedServices} {maintenance.affectedServices.join(', ')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
