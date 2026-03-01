import { useState } from 'react'
import { Monitor } from '../data/monitors'
import { cn } from '@/lib/utils'
import { Language, getTranslations } from '../i18n/translations'
import MonitorDetails from './MonitorDetails'
import { ChevronDown } from 'lucide-react'
import {
  calculateUptime,
  getMonitorStatus,
  type MonitorStatus,
} from '../lib/status'

type TimelinePeriod = '1h' | '24h' | '7d' | '30d'

interface DailyHistoryPoint {
  date: string // YYYY-MM-DD
  status: MonitorStatus
}

interface RecentCheck {
  t: string // timestamp ISO
  s: MonitorStatus // status
}

interface MonitorData {
  operational: boolean
  status?: MonitorStatus
  degraded?: boolean
  lastCheck: string
  responseTime?: number
  uptime?: number
  startDate?: string
  recentChecks?: RecentCheck[] // Last 24h of checks (granular, every 5 min)
  dailyHistory?: DailyHistoryPoint[] // Daily history (1 entry per day)
}

interface MonitorCardProps {
  monitor: Monitor
  data?: MonitorData
  language: Language
  period: TimelinePeriod
  onPeriodChange: (period: TimelinePeriod) => void
}

// Fixed 60 bars for all periods
const BAR_COUNT = 60

export default function MonitorCard({ monitor, data, language, period, onPeriodChange }: MonitorCardProps) {
  const t = getTranslations(language)
  const [expanded, setExpanded] = useState(false)
  const hasData = data !== undefined

  // Determine status with tri-state support
  const status = getMonitorStatus(data)
  const isOperational = status === 'operational'
  const isMaintenance = status === 'maintenance'
  const isDegraded = status === 'degraded'
  const isDown = status === 'down'
  const isUnknown = status === 'unknown'

  // Calculate uptime for the selected period
  const calculateUptimeFromChecks = (checks: RecentCheck[], hoursBack: number): number => {
    if (!hasData) return 0

    const cutoff = Date.now() - hoursBack * 60 * 60 * 1000
    const relevantChecks = checks.filter((c) => new Date(c.t).getTime() >= cutoff)

    return calculateUptime(relevantChecks.map((check) => check.s), status)
  }

  const calculateUptimeFromHistory = (history: DailyHistoryPoint[], daysBack: number): number => {
    if (!hasData) return 0

    const relevantHistory = history.slice(-daysBack)
    return calculateUptime(relevantHistory.map((day) => day.status), status)
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
      case '7d':
        return calculateUptimeFromHistory(dailyHistory, 7)
      case '30d':
        return calculateUptimeFromHistory(dailyHistory, 30)
      default:
        return data.uptime || 0
    }
  })()

  const getStatusText = () => {
    if (!hasData || isUnknown) return t.noData
    if (isOperational) return t.operational
    if (isMaintenance) return t.maintenance
    if (isDegraded) return t.degraded
    return t.down
  }

  // Generate timeline based on selected period
  // All periods use startDate as reference point for consistency
  // - 1h = 60 bars, if monitoring started 30min ago → ~50% filled
  // - 24h = 60 bars, if monitoring started 6h ago → ~25% filled
  // - 7d = 60 bars, if monitoring started 6h ago → ~3.5% filled
  // - 30d = 60 bars, if monitoring started 6h ago → ~0.8% filled
  const generateHistory = () => {
    const mapStatusToBar = (value: MonitorStatus) => (
      value === 'operational'
        ? 'operational'
        : value === 'maintenance'
          ? 'maintenance'
          : value === 'degraded'
            ? 'degraded'
            : 'incident'
    )

    const currentStatus = isOperational
      ? 'operational'
      : isMaintenance
        ? 'maintenance'
        : isDegraded
          ? 'degraded'
          : 'incident'

    if (!hasData) {
      return Array(BAR_COUNT).fill('unknown')
    }

    const recentChecks = data.recentChecks || []
    const dailyHistory = data.dailyHistory || []
    const startDate = data.startDate ? new Date(data.startDate).getTime() : null

    // Calculate period duration in ms
    const periodMs = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    }[period] || 24 * 60 * 60 * 1000

    const now = Date.now()
    const cutoff = now - periodMs
    const slotDuration = periodMs / BAR_COUNT

    // Use startDate as the reference for when monitoring began
    // If no startDate, fall back to earliest check/history
    let monitoringStart = startDate

    if (!monitoringStart) {
      if (recentChecks.length > 0) {
        monitoringStart = Math.min(...recentChecks.map(c => new Date(c.t).getTime()))
      } else if (dailyHistory.length > 0) {
        const sortedDates = dailyHistory.map(d => d.date).sort()
        monitoringStart = new Date(sortedDates[0]).getTime()
      } else {
        return [...Array(BAR_COUNT - 1).fill('unknown'), currentStatus]
      }
    }

    // For 1h and 24h: use recentChecks (granular data)
    if (period === '1h' || period === '24h') {
      const relevantChecks = recentChecks.filter(c => new Date(c.t).getTime() >= cutoff)
      const bars: string[] = []
      let lastKnownStatus = relevantChecks.length > 0 ? mapStatusToBar(relevantChecks[0].s) : currentStatus

      for (let i = 0; i < BAR_COUNT; i++) {
        const slotStart = cutoff + (i * slotDuration)
        const slotEnd = slotStart + slotDuration

        // Before monitoring started = unknown (gray)
        if (slotEnd <= monitoringStart) {
          bars.push('unknown')
          continue
        }

        // Find checks in this slot
        const slotChecks = relevantChecks.filter(c => {
          const checkTime = new Date(c.t).getTime()
          return checkTime >= slotStart && checkTime < slotEnd
        })

        if (slotChecks.length > 0) {
          const hasDown = slotChecks.some(c => c.s === 'down')
          const hasDegraded = slotChecks.some(c => c.s === 'degraded')
          lastKnownStatus = hasDown ? 'incident' : hasDegraded ? 'degraded' : 'operational'
        }
        bars.push(lastKnownStatus)
      }

      if (currentStatus === 'maintenance' && bars.length > 0) {
        bars[BAR_COUNT - 1] = 'maintenance'
      }

      return bars
    }

    // For 7d and 30d: use dailyHistory but still reference startDate
    const historyMap = new Map<string, string>()
    for (const day of dailyHistory) {
      historyMap.set(day.date, mapStatusToBar(day.status))
    }

    const bars: string[] = []
    let lastKnownStatus = dailyHistory.length > 0 ? mapStatusToBar(dailyHistory[0].status) : currentStatus

    for (let i = 0; i < BAR_COUNT; i++) {
      const slotStart = cutoff + (i * slotDuration)
      const slotEnd = slotStart + slotDuration

      // Before monitoring started = unknown (gray)
      if (slotEnd <= monitoringStart) {
        bars.push('unknown')
        continue
      }

      // Get the date for this slot
      const barDate = new Date(slotStart).toISOString().split('T')[0]
      const dayStatus = historyMap.get(barDate)
      if (dayStatus) {
        lastKnownStatus = dayStatus
      }
      bars.push(lastKnownStatus)
    }

    if (currentStatus === 'maintenance' && bars.length > 0) {
      bars[BAR_COUNT - 1] = 'maintenance'
    }

    return bars
  }

  const history = generateHistory()

  // Format date for tooltip based on period
  const getBarTooltip = (index: number) => {
    const now = new Date()
    const locale = language === 'fr' ? 'fr-FR' : language === 'uk' ? 'uk-UA' : 'en-US'

    if (period === '1h') {
      const minutesAgo = (BAR_COUNT - 1 - index)
      return `${minutesAgo} min ago`
    } else if (period === '24h') {
      const minutesPerBar = (24 * 60) / BAR_COUNT // 24 min per bar
      const minutesAgo = Math.round((BAR_COUNT - 1 - index) * minutesPerBar)
      const hoursAgo = Math.floor(minutesAgo / 60)
      return hoursAgo > 0 ? `${hoursAgo}h ago` : `${minutesAgo}m ago`
    } else {
      const daysToShow = period === '7d' ? 7 : 30
      const msPerBar = (daysToShow * 24 * 60 * 60 * 1000) / BAR_COUNT
      const barTime = now.getTime() - (BAR_COUNT - 1 - index) * msPerBar
      const barDate = new Date(barTime)
      return barDate.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric'
      })
    }
  }

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
                isMaintenance && "text-blue-600 dark:text-blue-500",
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
                    barStatus === 'maintenance' && "status-timeline-day-maintenance",
                    barStatus === 'degraded' && "status-timeline-day-degraded",
                    barStatus === 'incident' && "status-timeline-day-incident",
                    barStatus === 'unknown' && "status-timeline-day-unknown"
                  )}
                  title={getBarTooltip(index)}
                />
              ))}
            </div>

            {/* Period filters directly under timeline */}
            <div className="flex gap-1">
              {(['1h', '24h', '7d', '30d'] as TimelinePeriod[]).map((p) => (
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
              isMaintenance && "bg-blue-500",
              isDegraded && "bg-yellow-500",
              isDown && "bg-red-500"
            )} />
            <span className={cn(
              "text-sm font-medium",
              !hasData && "text-muted-foreground",
              isOperational && "text-green-600 dark:text-green-500",
              isMaintenance && "text-blue-600 dark:text-blue-500",
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
                  isMaintenance && "bg-blue-500",
                  isDegraded && "bg-yellow-500",
                  isDown && "bg-red-500"
                )} />
                <span className={cn(
                  "text-sm font-medium",
                  !hasData && "text-muted-foreground",
                  isOperational && "text-green-600 dark:text-green-500",
                  isMaintenance && "text-blue-600 dark:text-blue-500",
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
                  isMaintenance && "text-blue-600 dark:text-blue-500",
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
                    barStatus === 'maintenance' && "status-timeline-day-maintenance",
                    barStatus === 'degraded' && "status-timeline-day-degraded",
                    barStatus === 'incident' && "status-timeline-day-incident",
                    barStatus === 'unknown' && "status-timeline-day-unknown"
                  )}
                  title={getBarTooltip(index)}
                />
              ))}
            </div>

            {/* Period filters */}
            <div className="flex gap-1">
              {(['1h', '24h', '7d', '30d'] as TimelinePeriod[]).map((p) => (
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
          status={status === 'unknown' ? 'down' : status}
          language={language}
        />
      )}
    </div>
  )
}
