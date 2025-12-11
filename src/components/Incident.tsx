import { AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Language, getTranslations } from '../i18n/translations'

export type IncidentType = 'info' | 'warning' | 'error' | 'resolved'

export interface IncidentData {
  id: string
  type: IncidentType
  title: string | { en: string; fr: string }
  message: string | { en: string; fr: string }
  timestamp: string
  affectedServices?: string[] // IDs des monitors affectés
}

interface IncidentProps {
  incident: IncidentData
  language: Language
}

const incidentStyles = {
  info: {
    container: 'bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800',
    icon: 'text-gray-600 dark:text-gray-400',
    title: 'text-gray-900 dark:text-gray-100',
    text: 'text-gray-700 dark:text-gray-300',
    Icon: Info,
  },
  warning: {
    container: 'bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900',
    icon: 'text-yellow-600 dark:text-yellow-500',
    title: 'text-yellow-900 dark:text-yellow-100',
    text: 'text-yellow-700 dark:text-yellow-300',
    Icon: AlertTriangle,
  },
  error: {
    container: 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900',
    icon: 'text-red-600 dark:text-red-400',
    title: 'text-red-900 dark:text-red-100',
    text: 'text-red-700 dark:text-red-300',
    Icon: AlertCircle,
  },
  resolved: {
    container: 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900',
    icon: 'text-green-600 dark:text-green-400',
    title: 'text-green-900 dark:text-green-100',
    text: 'text-green-700 dark:text-green-300',
    Icon: CheckCircle,
  },
}

export default function Incident({ incident, language }: IncidentProps) {
  const t = getTranslations(language)
  const style = incidentStyles[incident.type]
  const IconComponent = style.Icon

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    const locale = language === 'fr' ? 'fr-FR' : 'en-US'
    return date.toLocaleString(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Get translated text (support both string and { en, fr } format)
  const getTranslatedText = (text: string | { en: string; fr: string }): string => {
    if (typeof text === 'string') return text
    return language === 'fr' ? text.fr : text.en
  }

  return (
    <div className={cn('rounded-lg p-4 sm:p-5', style.container)}>
      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          <IconComponent className={cn('h-5 w-5', style.icon)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title + Timestamp */}
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <h3 className={cn('text-sm font-semibold', style.title)}>
              {getTranslatedText(incident.title)}
            </h3>
            <span className={cn('text-xs whitespace-nowrap opacity-70', style.text)}>
              {formatDate(incident.timestamp)}
            </span>
          </div>

          {/* Message */}
          <p className={cn('text-xs sm:text-sm leading-relaxed mb-2', style.text)}>
            {getTranslatedText(incident.message)}
          </p>

          {/* Affected Services */}
          {incident.affectedServices && incident.affectedServices.length > 0 && (
            <p className={cn('text-xs opacity-60', style.text)}>
              {t.affectedServices}{' '}
              {incident.affectedServices.join(', ')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
