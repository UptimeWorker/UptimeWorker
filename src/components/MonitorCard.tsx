import { useState } from 'react'
import { Monitor } from '../data/monitors'
import { cn } from '@/lib/utils'
import { Language, getTranslations } from '../i18n/translations'
import MonitorDetails from './MonitorDetails'
import { ChevronDown } from 'lucide-react'

type TimelinePeriod = '1h' | '24h' | '3d' | '7d' | '30d'

interface DailyHistoryPoint {
  date: string // YYYY-MM-DD
  status: 'operational' | 'degraded' | 'down'
}

interface RecentCheck {
  t: string // timestamp ISO
  s: 'operational' | 'degraded' | 'down' // status
}

interface MonitorData {
  operational: boolean
  status?: 'operational' | 'degraded' | 'down'
  degraded?: boolean
  lastCheck: string
  responseTime?: number
  uptime?: number
  startDate?: string
  recentChecks?: RecentCheck[] // Last 24h of checks (for 1h/24h filters)
  dailyHistory?: DailyHistoryPoint[] // Daily history from KV (max 30 days)
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

  // Calculate uptime for the selected period
  const calculateUptimeFromChecks = (checks: RecentCheck[], hoursBack: number): number => {
    if (!hasData) return 0
    if (checks.length === 0) return status === 'operational' ? 100 : 0

    const cutoff = Date.now() - hoursBack * 60 * 60 * 1000
    const relevantChecks = checks.filter((c) => new Date(c.t).getTime() >= cutoff)

    if (relevantChecks.length === 0) return status === 'operational' ? 100 : 0

    const operationalCount = relevantChecks.filter((c) => c.s === 'operational').length
    return (operationalCount / relevantChecks.length) * 100
  }

  const calculateUptimeFromHistory = (history: DailyHistoryPoint[], daysBack: number): number => {
    if (!hasData) return 0
    if (history.length === 0) return status === 'operational' ? 100 : 0

    const relevantHistory = history.slice(-daysBack)
    if (relevantHistory.length === 0) return status === 'operational' ? 100 : 0

    const operationalDays = relevantHistory.filter((d) => d.status === 'operational').length
    return (operationalDays / relevantHistory.length) * 100
  }

  const uptimeForPeriod = (() => {
    if (!hasData) return 0

    const recentChecks = data.recentChecks || []
    const dailyHistory = data.dailyHistory || []

    switch (period) {
      case '1h':
        return calculateUptimeFromChecks(recentChecks, 1)
      case '24h':
        return calculateUptimeFromChecks(recentChecks, 24)
      case '3d':
        return calculateUptimeFromHistory(dailyHistory, 3)
      case '7d':
        return calculateUptimeFromHistory(dailyHistory, 7)
      case '30d':
        return calculateUptimeFromHistory(dailyHistory, 30)
      default:
        return data.uptime || 0
    }
  })()

  const getStatusText = () => {
    if (!hasData) return t.noData
    if (isOperational) return t.operational
    if (isDegraded) return t.degraded
    return t.down
  }

  // Fixed 60 bars for all periods
  const BAR_COUNT = 60

  // Generate timeline based on selected period
  const generateHistory = () => {
    if (!hasData) {
      return Array.from({ length: BAR_COUNT }, () => 'unknown')
    }

    const recentChecks = data.recentChecks || []
    const dailyHistory = data.dailyHistory || []

    // For 1h/24h: use recentChecks (granular data)
    if (period === '1h' || period === '24h') {
      const now = Date.now()
      const periodMs = period === '1h' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000
      const cutoff = now - periodMs

      // Filter checks within the period
      const relevantChecks = recentChecks.filter(c => new Date(c.t).getTime() >= cutoff)

      if (relevantChecks.length === 0) {
        const currentBar = isOperational ? 'operational' : isDegraded ? 'degraded' : 'incident'
        return [...Array(BAR_COUNT - 1).fill('unknown'), currentBar]
      }

      // Divide period into BAR_COUNT slots and get worst status per slot
      const slotDuration = periodMs / BAR_COUNT
      const bars: string[] = []

      for (let i = 0; i < BAR_COUNT; i++) {
        const slotStart = cutoff + (i * slotDuration)
        const slotEnd = slotStart + slotDuration
        const slotChecks = relevantChecks.filter(c => {
          const t = new Date(c.t).getTime()
          return t >= slotStart && t < slotEnd
        })

        if (slotChecks.length === 0) {
          bars.push('unknown')
        } else {
          // Get worst status in slot
          const hasDown = slotChecks.some(c => c.s === 'down')
          const hasDegraded = slotChecks.some(c => c.s === 'degraded')
          bars.push(hasDown ? 'incident' : hasDegraded ? 'degraded' : 'operational')
        }
      }
      return bars
    }

    // For 3d/7d/30d: use dailyHistory (aggregated daily data)
    const daysToShow = period === '3d' ? 3 : period === '7d' ? 7 : 30
    const relevantHistory = dailyHistory.slice(-daysToShow)

    if (relevantHistory.length === 0) {
      const currentBar = isOperational ? 'operational' : isDegraded ? 'degraded' : 'incident'
      return [...Array(BAR_COUNT - 1).fill('unknown'), currentBar]
    }

    // Map days to bars (spread days across BAR_COUNT bars)
    const bars: string[] = []
    const barsPerDay = BAR_COUNT / daysToShow

    for (const day of relevantHistory) {
      const barStatus = day.status === 'operational' ? 'operational'
        : day.status === 'degraded' ? 'degraded' : 'incident'
      for (let i = 0; i < barsPerDay; i++) {
        bars.push(barStatus)
      }
    }

    // Pad with unknown if needed
    const paddingCount = Math.max(0, BAR_COUNT - bars.length)
    return [...Array(paddingCount).fill('unknown'), ...bars]
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
          {hasData && (
            <div className="min-w-[55px] text-right pt-1">
              <span className={cn(
                "text-sm font-medium",
                isOperational && "text-green-600 dark:text-green-500",
                isDegraded && "text-yellow-600 dark:text-yellow-500",
                isDown && "text-red-600 dark:text-red-500"
              )}>
                {uptimeForPeriod.toFixed(2)}%
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
              {hasData && (
                <span className={cn(
                  "text-xs font-medium",
                  isOperational && "text-green-600 dark:text-green-500",
                  isDegraded && "text-yellow-600 dark:text-yellow-500",
                  isDown && "text-red-600 dark:text-red-500"
                )}>
                  {uptimeForPeriod.toFixed(2)}%
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
          responseTime={data.responseTime}
          lastCheck={data.lastCheck}
          operational={isOperational}
          language={language}
        />
      )}
    </div>
  )
}
