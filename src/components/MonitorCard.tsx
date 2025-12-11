import { useState } from 'react'
import { Monitor } from '../data/monitors'
import { cn } from '@/lib/utils'
import { Language, getTranslations } from '../i18n/translations'
import MonitorDetails from './MonitorDetails'
import { ChevronDown } from 'lucide-react'

type TimelinePeriod = '1h' | '24h' | '3d' | '7d' | '30d'

interface MonitorData {
  operational: boolean
  status?: 'operational' | 'degraded' | 'down'
  degraded?: boolean
  lastCheck: string
  responseTime?: number
  uptime?: number
  startDate?: string // When monitoring started for this service
}

interface MonitorCardProps {
  monitor: Monitor
  data?: MonitorData
  language: Language
  period: TimelinePeriod
  onPeriodChange: (period: TimelinePeriod) => void
}

export default function MonitorCard({ monitor, data, language, period, onPeriodChange }: MonitorCardProps) {
  const t = getTranslations(language)
  const [expanded, setExpanded] = useState(false)
  const hasData = data !== undefined

  // Determine status with tri-state support
  const status = data?.status || (data?.operational ? 'operational' : 'down')
  const isOperational = status === 'operational'
  const isDegraded = status === 'degraded'
  const isDown = status === 'down'

  const getStatusText = () => {
    if (!hasData) return t.noData
    if (isOperational) return t.operational
    if (isDegraded) return t.degraded
    return t.down
  }

  // Get number of bars - fixed at 90 for all periods like UptimeRobot
  const getBarCount = () => {
    return 90 // Same number of bars for all periods for visual consistency
  }

  // Progressive fill: bars fill from right to left as time passes
  // TODO: Implement real historical data storage in KV to show actual uptime/downtime over time
  const generateHistory = () => {
    const barCount = getBarCount()

    if (!hasData) {
      return Array.from({ length: barCount }, () => 'unknown')
    }

    // If we have a startDate, use it for future real-time calculation
    // For now, use fixed percentages per period
    if (data.startDate) {
      // ZOOM LOGIC INVERSÉ: 1h = tout visible, 30d = zoom out minimal
      const periodFillMapping = {
        '1h': 1.00,   // 100% = 90 barres (zoom max)
        '24h': 0.60,  // 60% = ~54 barres
        '3d': 0.40,   // 40% = ~36 barres
        '7d': 0.25,   // 25% = ~22 barres
        '30d': 0.10,  // 10% = ~9 barres (zoom min)
      }[period] || 1.00

      let filledBars = Math.floor(barCount * periodFillMapping)

      // Minimum 1 barre
      if (filledBars < 1 && hasData) {
        filledBars = 1
      }

      // Generate bars: unknown on left (old/before monitoring), status on right (recent)
      return Array.from({ length: barCount }, (_, index) => {
        if (index < barCount - filledBars) {
          return 'unknown' // Before monitoring started
        }
        if (isOperational) return 'operational'
        if (isDegraded) return 'degraded'
        return 'incident'
      })
    }

    // Fallback without startDate: simulate progressive fill using lastCheck
    // Assume monitoring started recently (simulate 10% fill for now)
    const simulatedFillRatio = 0.10 // Show only 10% filled
    const simulatedFilledBars = Math.floor(barCount * simulatedFillRatio)

    return Array.from({ length: barCount }, (_, index) => {
      if (index < barCount - simulatedFilledBars) {
        return 'unknown' // Old data (before monitoring)
      }
      if (isOperational) return 'operational'
      if (isDegraded) return 'degraded'
      return 'incident'
    })
  }

  const history = generateHistory()

  return (
    <div className="border-b border-border last:border-0">
      <div className="px-4 sm:px-6 py-4 sm:py-5">
        {/* Desktop layout: Name | % | Timeline | Status */}
        <div className="hidden sm:flex items-start gap-3 sm:gap-6">
          {/* Left: Name + Description with arrow (clickable) */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="min-w-[120px] sm:min-w-[160px] pt-1 text-left hover:opacity-70 transition-opacity"
          >
            <div className="flex items-center gap-1">
              <h3 className="font-medium text-foreground text-sm">
                {monitor.name}
              </h3>
              <ChevronDown
                className={cn(
                  "w-3 h-3 text-muted-foreground transition-transform flex-shrink-0",
                  expanded && "rotate-180"
                )}
              />
            </div>
            {monitor.description && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {monitor.description}
              </p>
            )}
          </button>

          {/* Uptime percentage */}
          {data?.uptime !== undefined && (
            <div className="min-w-[55px] text-right pt-1">
              <span className={cn(
                "text-sm font-medium",
                isOperational && "text-green-600 dark:text-green-500",
                isDegraded && "text-yellow-600 dark:text-yellow-500",
                isDown && "text-red-600 dark:text-red-500"
              )}>
                {data.uptime}%
              </span>
            </div>
          )}

          {/* Timeline + Filters wrapper */}
          <div className="flex-1 min-w-0">
            {/* Timeline bars */}
            <div className="status-timeline mb-2">
              {history.map((barStatus, index) => (
                <div
                  key={index}
                  className={cn(
                    "status-timeline-day",
                    barStatus === 'operational' && "status-timeline-day-operational",
                    barStatus === 'degraded' && "status-timeline-day-degraded",
                    barStatus === 'incident' && "status-timeline-day-incident",
                    barStatus === 'unknown' && "status-timeline-day-unknown"
                  )}
                  title={`${period === '30d' ? 'Day' : 'Hour'} ${history.length - index}`}
                />
              ))}
            </div>

            {/* Period filters directly under timeline */}
            <div className="flex gap-1">
              {(['1h', '24h', '3d', '7d', '30d'] as TimelinePeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => onPeriodChange(p)}
                  className={cn(
                    "px-2 py-0.5 text-[10px] rounded transition-colors",
                    period === p
                      ? "bg-foreground text-background font-medium"
                      : "bg-muted/50 hover:bg-muted text-muted-foreground"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Status badge */}
          <div className="flex items-center gap-1.5 min-w-[90px] justify-end pt-1">
            <span className={cn(
              "w-2 h-2 rounded-full",
              !hasData && "bg-gray-400",
              isOperational && "bg-green-500",
              isDegraded && "bg-yellow-500",
              isDown && "bg-red-500"
            )} />
            <span className={cn(
              "text-sm font-medium",
              !hasData && "text-muted-foreground",
              isOperational && "text-green-600 dark:text-green-500",
              isDegraded && "text-yellow-600 dark:text-yellow-500",
              isDown && "text-red-600 dark:text-red-500"
            )}>
              {getStatusText()}
            </span>
          </div>
        </div>

        {/* Mobile layout: Vertical stack */}
        <div className="sm:hidden space-y-3">
          {/* Header: Name + Status */}
          <div className="flex items-start justify-between gap-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex-1 text-left hover:opacity-70 transition-opacity"
            >
              <div className="flex items-center gap-1">
                <h3 className="font-medium text-foreground text-sm">
                  {monitor.name}
                </h3>
                <ChevronDown
                  className={cn(
                    "w-3 h-3 text-muted-foreground transition-transform flex-shrink-0",
                    expanded && "rotate-180"
                  )}
                />
              </div>
              {monitor.description && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {monitor.description}
                </p>
              )}
            </button>

            {/* Status badge + Uptime */}
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  !hasData && "bg-gray-400",
                  isOperational && "bg-green-500",
                  isDegraded && "bg-yellow-500",
                  isDown && "bg-red-500"
                )} />
                <span className={cn(
                  "text-sm font-medium",
                  !hasData && "text-muted-foreground",
                  isOperational && "text-green-600 dark:text-green-500",
                  isDegraded && "text-yellow-600 dark:text-yellow-500",
                  isDown && "text-red-600 dark:text-red-500"
                )}>
                  {getStatusText()}
                </span>
              </div>
              {data?.uptime !== undefined && (
                <span className={cn(
                  "text-xs font-medium",
                  isOperational && "text-green-600 dark:text-green-500",
                  isDegraded && "text-yellow-600 dark:text-yellow-500",
                  isDown && "text-red-600 dark:text-red-500"
                )}>
                  {data.uptime}%
                </span>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="w-full">
            <div className="status-timeline mb-2">
              {history.map((barStatus, index) => (
                <div
                  key={index}
                  className={cn(
                    "status-timeline-day",
                    barStatus === 'operational' && "status-timeline-day-operational",
                    barStatus === 'degraded' && "status-timeline-day-degraded",
                    barStatus === 'incident' && "status-timeline-day-incident",
                    barStatus === 'unknown' && "status-timeline-day-unknown"
                  )}
                  title={`${period === '30d' ? 'Day' : 'Hour'} ${history.length - index}`}
                />
              ))}
            </div>

            {/* Period filters */}
            <div className="flex gap-1">
              {(['1h', '24h', '3d', '7d', '30d'] as TimelinePeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => onPeriodChange(p)}
                  className={cn(
                    "px-2 py-0.5 text-[10px] rounded transition-colors",
                    period === p
                      ? "bg-foreground text-background font-medium"
                      : "bg-muted/50 hover:bg-muted text-muted-foreground"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Expandable details section */}
      {expanded && hasData && (
        <MonitorDetails
          uptime={data.uptime || 0}
          responseTime={data.responseTime}
          lastCheck={data.lastCheck}
          operational={isOperational}
          language={language}
        />
      )}
    </div>
  )
}
