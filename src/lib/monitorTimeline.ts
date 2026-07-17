import type { MonitorStatus } from './status'

export type TimelinePeriod = '1h' | '24h' | '7d' | '30d'
export type TimelineBarStatus = 'operational' | 'maintenance' | 'degraded' | 'incident' | 'unknown'

export const TIMELINE_BUCKET_COUNT = 60

interface TimelineRecentCheck {
  t: string
  s: MonitorStatus
}

interface TimelineDailyHistoryPoint {
  date: string
  status: MonitorStatus
}

interface BuildTimelineHistoryOptions {
  period: TimelinePeriod
  currentStatus: MonitorStatus
  startDate?: string
  recentChecks?: TimelineRecentCheck[]
  dailyHistory?: TimelineDailyHistoryPoint[]
  now?: number
  intervalMinutes?: number
}

const PERIOD_MS: Record<TimelinePeriod, number> = {
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
}

// Pour 1h/24h, une pill par check réel : si l'intervalle est plus large que
// 1 pill/60, on réduit le nombre de pills au lieu de dupliquer le même check
// sur plusieurs pills. 7j/30j restent à 60 (granularité journalière, pas liée
// à l'intervalle de check).
export function getEffectiveBucketCount(
  period: TimelinePeriod,
  intervalMinutes = 1,
): number {
  if (period !== '1h' && period !== '24h') return TIMELINE_BUCKET_COUNT
  const periodMinutes = PERIOD_MS[period] / (60 * 1000)
  return Math.max(1, Math.min(TIMELINE_BUCKET_COUNT, Math.floor(periodMinutes / intervalMinutes)))
}

function mapStatusToBar(status: MonitorStatus): TimelineBarStatus {
  if (status === 'down') return 'incident'
  return status
}

function aggregateChecks(checks: TimelineRecentCheck[]): Exclude<TimelineBarStatus, 'unknown'> {
  const statuses = checks.map((check) => mapStatusToBar(check.s))
  if (statuses.includes('incident')) return 'incident'
  if (statuses.includes('degraded')) return 'degraded'
  if (statuses.includes('maintenance')) return 'maintenance'
  return 'operational'
}

function toTimestamp(value?: string): number | undefined {
  if (!value) return undefined
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : undefined
}

export function buildTimelineHistory({
  period,
  currentStatus,
  startDate,
  recentChecks = [],
  dailyHistory = [],
  now = Date.now(),
  intervalMinutes = 1,
}: BuildTimelineHistoryOptions): TimelineBarStatus[] {
  const periodMs = PERIOD_MS[period]
  const cutoff = now - periodMs
  const validChecks = recentChecks.filter((check) => toTimestamp(check.t) !== undefined)
  const validStartDate = toTimestamp(startDate)
  const firstCheck = validChecks.length > 0
    ? Math.min(...validChecks.map((check) => toTimestamp(check.t)!))
    : undefined
  const firstDailyPoint = dailyHistory.length > 0
    ? toTimestamp([...dailyHistory].sort((a, b) => a.date.localeCompare(b.date))[0].date)
    : undefined
  const monitoringStart = validStartDate ?? firstCheck ?? firstDailyPoint

  if (period === '1h' || period === '24h') {
    const bucketCount = getEffectiveBucketCount(period, intervalMinutes)
    const bucketDuration = periodMs / bucketCount

    if (monitoringStart === undefined) {
      return [
        ...Array<TimelineBarStatus>(bucketCount - 1).fill('unknown'),
        mapStatusToBar(currentStatus),
      ]
    }

    const relevantChecks = validChecks.filter((check) => {
      const checkTime = toTimestamp(check.t)!
      return checkTime >= cutoff && checkTime <= now
    })
    const bars = Array.from<TimelineBarStatus>({ length: bucketCount }).fill('unknown')
    let lastKnownStatus = relevantChecks.length > 0
      ? mapStatusToBar(relevantChecks[0].s)
      : mapStatusToBar(currentStatus)

    for (let index = 0; index < bucketCount; index++) {
      const bucketStart = cutoff + index * bucketDuration
      const bucketEnd = bucketStart + bucketDuration
      if (bucketEnd <= monitoringStart) continue

      const bucketChecks = relevantChecks.filter((check) => {
        const checkTime = toTimestamp(check.t)!
        return checkTime >= bucketStart && checkTime < bucketEnd
      })
      if (bucketChecks.length > 0) lastKnownStatus = aggregateChecks(bucketChecks)
      bars[index] = lastKnownStatus
    }

    if (currentStatus === 'maintenance') bars[bucketCount - 1] = 'maintenance'
    return bars
  }

  const bucketDuration = periodMs / TIMELINE_BUCKET_COUNT

  if (monitoringStart === undefined) {
    return [
      ...Array<TimelineBarStatus>(TIMELINE_BUCKET_COUNT - 1).fill('unknown'),
      mapStatusToBar(currentStatus),
    ]
  }

  const historyMap = new Map(
    dailyHistory.map((day) => [day.date, mapStatusToBar(day.status)] as const),
  )
  const bars = Array.from<TimelineBarStatus>({ length: TIMELINE_BUCKET_COUNT }).fill('unknown')
  let lastKnownStatus = dailyHistory.length > 0
    ? mapStatusToBar(dailyHistory[0].status)
    : mapStatusToBar(currentStatus)

  for (let index = 0; index < TIMELINE_BUCKET_COUNT; index++) {
    const bucketStart = cutoff + index * bucketDuration
    const bucketEnd = bucketStart + bucketDuration
    if (bucketEnd <= monitoringStart) continue

    const bucketDate = new Date(bucketStart).toISOString().split('T')[0]
    const dayStatus = historyMap.get(bucketDate)
    if (dayStatus) lastKnownStatus = dayStatus
    bars[index] = lastKnownStatus
  }

  if (currentStatus === 'maintenance') bars[TIMELINE_BUCKET_COUNT - 1] = 'maintenance'
  return bars
}

// Une pill = un check réel (voir getEffectiveBucketCount) : le nombre de minutes
// par pill découle directement du nombre de pills effectif, pas d'un pas fixe.
export function getTimelineMinutesAgo(
  index: number,
  period: Extract<TimelinePeriod, '1h' | '24h'>,
  intervalMinutes = 1,
): number {
  const bucketCount = getEffectiveBucketCount(period, intervalMinutes)
  const periodMinutes = PERIOD_MS[period] / (60 * 1000)
  const bucketMinutes = periodMinutes / bucketCount
  return Math.round((bucketCount - 1 - index) * bucketMinutes)
}
