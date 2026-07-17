import { cn } from '@/lib/utils'
import { Language, getTranslations } from '../i18n/translations'
import { type MonitorStatus } from '../lib/status'
import {
  getRecentMonitorEvents,
  type EventDailyHistoryPoint,
  type EventPeriod,
  type EventRecentCheck,
} from '../lib/monitorEvents'

interface MonitorDetailsProps {
  responseTime?: number
  lastCheck: string
  status: MonitorStatus
  language: Language
  period: EventPeriod
  recentChecks?: EventRecentCheck[]
  dailyHistory?: EventDailyHistoryPoint[]
}

export default function MonitorDetails({
  responseTime,
  lastCheck,
  status,
  language,
  period,
  recentChecks,
  dailyHistory,
}: MonitorDetailsProps) {
  const t = getTranslations(language)
  const locale = language === 'fr' ? 'fr-FR' : language === 'uk' ? 'uk-UA' : 'en-US'
  const events = getRecentMonitorEvents({
    period,
    lastCheck,
    currentStatus: status,
    recentChecks,
    dailyHistory,
  })

  const getStatusLabel = (eventStatus: MonitorStatus) => eventStatus === 'operational'
    ? t.running
    : eventStatus === 'maintenance'
      ? t.maintenance
      : eventStatus === 'degraded'
        ? t.degraded
        : t.offline

  return (
    <div className="border-t border-border bg-muted/20">
      <dl className="grid grid-cols-1 divide-y divide-border border-b border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div className="px-4 py-4 sm:px-6 sm:py-5">
          <dt className="mb-1 text-xs font-medium text-muted-foreground">
            {t.lastChecked}
          </dt>
          <dd className="text-sm font-medium text-foreground">
            {new Date(lastCheck).toLocaleString(locale, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </dd>
        </div>

        {responseTime !== undefined && (
          <div className="px-4 py-4 sm:px-6 sm:py-5">
            <dt className="mb-1 text-xs font-medium text-muted-foreground">
              {t.responseTime}
            </dt>
            <dd className="text-sm font-medium text-foreground tabular-nums">
              {responseTime}ms
            </dd>
          </div>
        )}
      </dl>

      <section className="py-5">
        <h4 className="mb-2 px-4 text-sm font-semibold text-foreground sm:px-6">
          {t.recentEvents}
        </h4>
        {events.length > 0 ? (
          <div className="divide-y divide-border border-y border-border">
            {events.map((event) => (
              <div key={`${event.timestamp}-${event.status}`} className="flex items-start gap-2.5 px-4 py-3 sm:px-6">
                <div className={cn(
                  "w-2 h-2 rounded-full mt-1.5 shrink-0",
                  event.status === 'operational' && "bg-green-500",
                  event.status === 'maintenance' && "bg-blue-500",
                  event.status === 'degraded' && "bg-yellow-500",
                  event.status === 'down' && "bg-red-500"
                )} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-5 text-foreground">
                    {getStatusLabel(event.status)}
                  </div>
                  <div className="mt-0.5 text-xs leading-4 text-muted-foreground">
                    {new Date(event.timestamp).toLocaleString(locale, {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-y border-border px-4 py-3 text-sm text-muted-foreground sm:px-6">
            {t.noRecentEvents}
          </div>
        )}
      </section>
    </div>
  )
}
