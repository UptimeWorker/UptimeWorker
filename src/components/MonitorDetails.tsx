import { cn } from '@/lib/utils'
import { Language, getTranslations } from '../i18n/translations'
import { type MonitorStatus } from '../lib/status'

interface MonitorDetailsProps {
  responseTime?: number
  lastCheck: string
  status: MonitorStatus
  language: Language
}

export default function MonitorDetails({
  responseTime,
  lastCheck,
  status,
  language,
}: MonitorDetailsProps) {
  const t = getTranslations(language)
  const isOperational = status === 'operational'
  const isDegraded = status === 'degraded'

  const statusLabel = isOperational ? t.running : isDegraded ? t.degraded : t.offline

  return (
    <div className="px-6 py-4 bg-muted/30 border-t border-border">
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
              isOperational && "bg-green-500",
              isDegraded && "bg-yellow-500",
              status === 'down' && "bg-red-500"
            )} />
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground">
                {statusLabel}
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
