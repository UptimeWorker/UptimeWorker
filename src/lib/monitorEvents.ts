import type { MonitorStatus } from './status'

export type EventPeriod = '1h' | '24h' | '7d' | '30d'

export interface EventRecentCheck {
  t: string
  s: MonitorStatus
}

export interface EventDailyHistoryPoint {
  date: string
  status: MonitorStatus
}

export interface MonitorEvent {
  timestamp: string
  status: MonitorStatus
}

interface GetRecentMonitorEventsInput {
  period: EventPeriod
  lastCheck: string
  currentStatus: MonitorStatus
  recentChecks?: EventRecentCheck[]
  dailyHistory?: EventDailyHistoryPoint[]
  limit?: number
  now?: number
}

interface EventPoint extends MonitorEvent {
  time: number
}

function parsePoint(timestamp: string, status: MonitorStatus): EventPoint | undefined {
  const time = new Date(timestamp).getTime()
  return Number.isFinite(time) ? { timestamp, status, time } : undefined
}

function collapseStatusRuns(points: EventPoint[]): EventPoint[] {
  const runs: EventPoint[] = []

  for (const point of points.sort((left, right) => left.time - right.time)) {
    if (runs[runs.length - 1]?.status !== point.status) {
      runs.push(point)
    }
  }

  return runs
}

function getGranularPoints(checks: EventRecentCheck[], now: number): EventPoint[] {
  return checks.flatMap((check) => {
    const point = parsePoint(check.t, check.s)
    return point && point.time <= now ? [point] : []
  })
}

function getDailyPoints(history: EventDailyHistoryPoint[], now: number): EventPoint[] {
  return history.flatMap((day) => {
    const point = parsePoint(`${day.date}T00:00:00.000Z`, day.status)
    return point && point.time <= now ? [point] : []
  })
}

export function getRecentMonitorEvents({
  period,
  lastCheck,
  currentStatus,
  recentChecks = [],
  dailyHistory = [],
  limit = 5,
  now = Date.now(),
}: GetRecentMonitorEventsInput): MonitorEvent[] {
  if (limit <= 0) return []

  const currentPoint = parsePoint(lastCheck, currentStatus)
  if (!currentPoint) return []

  const periodMs = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  }[period]
  const cutoff = now - periodMs
  const points = period === '1h' || period === '24h'
    ? getGranularPoints(recentChecks, now)
    : getDailyPoints(dailyHistory, now)
  const runs = collapseStatusRuns(points)
  const transitions = runs
    .slice(1)
    .filter((run) => run.time >= cutoff)
    .reverse()
  const events: MonitorEvent[] = [{ timestamp: currentPoint.timestamp, status: currentStatus }]
  let latestStatus = currentStatus

  for (const transition of transitions) {
    if (events.length >= limit) break
    if (transition.status === latestStatus) continue

    events.push({ timestamp: transition.timestamp, status: transition.status })
    latestStatus = transition.status
  }

  return events
}
