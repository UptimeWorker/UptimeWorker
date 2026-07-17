import { type MonitorStatus } from './status'

export interface RecentCheck {
  t: string
  s: MonitorStatus
  rt?: number
}

export interface DailyHistoryPoint {
  date: string
  status: MonitorStatus
}

export interface MonitorData {
  operational: boolean
  status?: MonitorStatus
  degraded?: boolean
  lastCheck: string
  responseTime?: number
  uptime?: number
  startDate?: string
  recentChecks?: RecentCheck[]
  dailyHistory?: DailyHistoryPoint[]
}

const MONITOR_STATUSES = new Set<MonitorStatus>(['operational', 'maintenance', 'degraded', 'down'])

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value

  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  const parsed = parseJson(value)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined
  return parsed as Record<string, unknown>
}

function isValidTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(new Date(value).getTime())
}

function isMonitorStatus(value: unknown): value is MonitorStatus {
  return typeof value === 'string' && MONITOR_STATUSES.has(value as MonitorStatus)
}

function normalizeRecentChecks(value: unknown): RecentCheck[] | undefined {
  const parsed = parseJson(value)
  if (!Array.isArray(parsed)) return undefined

  return parsed.flatMap((entry) => {
    const record = asRecord(entry)
    if (!record || !isValidTimestamp(record.t) || !isMonitorStatus(record.s)) return []

    return [{
      t: record.t,
      s: record.s,
      ...(typeof record.rt === 'number' && Number.isFinite(record.rt) ? { rt: record.rt } : {}),
    }]
  })
}

function normalizeDailyHistory(value: unknown): DailyHistoryPoint[] | undefined {
  const parsed = parseJson(value)
  if (!Array.isArray(parsed)) return undefined

  return parsed.flatMap((entry) => {
    const record = asRecord(entry)
    const date = record?.date
    if (!record || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !isMonitorStatus(record.status)) {
      return []
    }

    return [{ date, status: record.status }]
  })
}

export function normalizeMonitorData(value: unknown): MonitorData | undefined {
  const record = asRecord(value)
  if (!record || !isValidTimestamp(record.lastCheck)) return undefined

  const recentChecks = normalizeRecentChecks(record.recentChecks)
  const dailyHistory = normalizeDailyHistory(record.dailyHistory)

  return {
    operational: record.operational === true,
    ...(isMonitorStatus(record.status) ? { status: record.status } : {}),
    ...(record.degraded === true ? { degraded: true } : {}),
    lastCheck: record.lastCheck,
    ...(typeof record.responseTime === 'number' && Number.isFinite(record.responseTime)
      ? { responseTime: record.responseTime }
      : {}),
    ...(typeof record.uptime === 'number' && Number.isFinite(record.uptime) ? { uptime: record.uptime } : {}),
    ...(isValidTimestamp(record.startDate) ? { startDate: record.startDate } : {}),
    ...(recentChecks ? { recentChecks } : {}),
    ...(dailyHistory ? { dailyHistory } : {}),
  }
}

export function normalizeMonitorCollection(value: unknown): Record<string, MonitorData> {
  const records = asRecord(value)
  if (!records) return {}

  return Object.fromEntries(
    Object.entries(records).flatMap(([id, monitor]) => {
      const normalized = normalizeMonitorData(monitor)
      return normalized ? [[id, normalized]] : []
    }),
  )
}
