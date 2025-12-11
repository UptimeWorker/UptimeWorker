import { cn } from '@/lib/utils'
import { Language, getTranslations } from '../i18n/translations'

interface MonitorDetailsProps {
  uptime: number
  responseTime?: number
  lastCheck: string
  operational: boolean
  language: Language
}

export default function MonitorDetails({
  uptime,
  responseTime,
  lastCheck,
  operational,
  language,
}: MonitorDetailsProps) {
  const t = getTranslations(language)

  // Simulated stats for different periods
  // TODO: Replace with real historical data from KV
  const stats = [
    { period: '24h', label: t.last24Hours, uptime: operational ? 100 : uptime },
    { period: '7d', label: t.last7Days, uptime: uptime },
    { period: '30d', label: t.last30Days, uptime: uptime },
    { period: '90d', label: t.last90Days, uptime: uptime - 0.01 },
  ]

  return (
    <div className="px-6 py-4 bg-muted/30 border-t border-border">
      {/* Overall Uptime Stats */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-foreground mb-3">
          {t.overallUptime}
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <div key={stat.period} className="bg-card border border-border rounded-lg p-3">
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {stat.uptime.toFixed(2)}%
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">
            {t.lastChecked}
          </div>
          <div className="text-sm font-medium text-foreground">
            {new Date(lastCheck).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>

        {responseTime !== undefined && (
          <div className="bg-card border border-border rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-1">
              {t.responseTime}
            </div>
            <div className="text-sm font-medium text-foreground">
              {responseTime}ms
            </div>
          </div>
        )}
      </div>

      {/* Recent Events */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">
          {t.recentEvents}
        </h4>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-start gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full mt-1.5",
              operational ? "bg-green-500" : "bg-red-500"
            )} />
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground">
                {operational ? t.running : t.offline}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {new Date(lastCheck).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-2 text-center">
          {t.showingLastEvents}
        </div>
      </div>
    </div>
  )
}
