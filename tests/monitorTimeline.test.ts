import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateUptime } from '../src/lib/status'
import {
  buildTimelineHistory,
  filterDailyHistoryInPeriod,
  getEffectiveBucketCount,
  getTimelineMinutesAgo,
  TIMELINE_BUCKET_COUNT,
} from '../src/lib/monitorTimeline'

const NOW = Date.parse('2026-07-16T18:00:00.000Z')
const MINUTE = 60 * 1000

function checksEveryMinute() {
  return Array.from({ length: TIMELINE_BUCKET_COUNT }, (_, index) => ({
    t: new Date(NOW - (TIMELINE_BUCKET_COUNT - index - 0.5) * MINUTE).toISOString(),
    s: 'degraded' as const,
  }))
}

function countDataBuckets(history: string[]) {
  return history.filter((status) => status !== 'unknown').length
}

test('1h keeps all 60 pill positions filled continuously', () => {
  const history = buildTimelineHistory({
    period: '1h',
    currentStatus: 'degraded',
    startDate: new Date(NOW - 60 * MINUTE).toISOString(),
    recentChecks: checksEveryMinute(),
    now: NOW,
  })

  assert.equal(history.length, 60)
  assert.equal(countDataBuckets(history), 60)
})

test('1h gives each pill a unique minute from 0 to 59', () => {
  assert.equal(getTimelineMinutesAgo(59, '1h'), 0)
  assert.equal(getTimelineMinutesAgo(58, '1h'), 1)
  assert.equal(getTimelineMinutesAgo(57, '1h'), 2)
  assert.equal(getTimelineMinutesAgo(0, '1h'), 59)
})

test('24h keeps its 24-minute bucket counting', () => {
  assert.equal(getTimelineMinutesAgo(59, '24h'), 0)
  assert.equal(getTimelineMinutesAgo(58, '24h'), 24)
})

test('getEffectiveBucketCount shrinks 1h/24h pills to match the real check interval', () => {
  assert.equal(getEffectiveBucketCount('1h', 1), 60)
  assert.equal(getEffectiveBucketCount('1h', 10), 6)
  assert.equal(getEffectiveBucketCount('1h', 5), 12)
  assert.equal(getEffectiveBucketCount('24h', 1), 60)
  assert.equal(getEffectiveBucketCount('24h', 48), 30)
})

test('getEffectiveBucketCount never touches 7d/30d (daily granularity, not check-interval-bound)', () => {
  assert.equal(getEffectiveBucketCount('7d', 10), 60)
  assert.equal(getEffectiveBucketCount('30d', 1440), 60)
})

test('1h gives each of its (fewer) pills a slice matching the real check interval', () => {
  assert.equal(getTimelineMinutesAgo(5, '1h', 10), 0)
  assert.equal(getTimelineMinutesAgo(4, '1h', 10), 10)
  assert.equal(getTimelineMinutesAgo(0, '1h', 10), 50)
})

test('1h with a coarse interval builds a shorter, non-duplicated pill array', () => {
  const history = buildTimelineHistory({
    period: '1h',
    currentStatus: 'degraded',
    startDate: new Date(NOW - 60 * MINUTE).toISOString(),
    recentChecks: [
      { t: new Date(NOW - 55 * MINUTE).toISOString(), s: 'operational' },
      { t: new Date(NOW - 45 * MINUTE).toISOString(), s: 'degraded' },
      { t: new Date(NOW - 5 * MINUTE).toISOString(), s: 'down' },
    ],
    intervalMinutes: 10,
    now: NOW,
  })

  assert.equal(history.length, 6)
})

test('buckets before monitoring started remain unknown without shifting positions', () => {
  const history = buildTimelineHistory({
    period: '1h',
    currentStatus: 'operational',
    startDate: new Date(NOW - 10 * MINUTE).toISOString(),
    recentChecks: [{
      t: new Date(NOW - 9.5 * MINUTE).toISOString(),
      s: 'operational',
    }],
    now: NOW,
  })

  assert.equal(countDataBuckets(history), 10)
})

test('30d keeps missing daily history unknown instead of carrying a stale status', () => {
  const history = buildTimelineHistory({
    period: '30d',
    currentStatus: 'down',
    startDate: '2026-06-16T18:00:00.000Z',
    dailyHistory: [{ date: '2026-07-01', status: 'down' }],
    now: NOW,
  })

  assert.equal(history.filter((status) => status === 'incident').length, 2)
  assert.equal(history.filter((status) => status === 'unknown').length, 58)
})

test('7d/30d percentage counts only daily entries inside the calendar window', () => {
  const history = [
    { date: '2026-06-01', status: 'operational' as const },
    { date: '2026-06-02', status: 'operational' as const },
    { date: '2026-07-14', status: 'operational' as const },
    { date: '2026-07-15', status: 'down' as const },
    { date: '2026-07-16', status: 'operational' as const },
  ]

  for (const period of ['7d', '30d'] as const) {
    const inWindow = filterDailyHistoryInPeriod(history, period, NOW)
    assert.deepEqual(inWindow.map((day) => day.date), ['2026-07-14', '2026-07-15', '2026-07-16'])
    assert.equal(calculateUptime(inWindow.map((day) => day.status)).toFixed(2), '66.67')
  }
})

test('7d percentage ignores out-of-window days instead of slicing the last 7 entries', () => {
  const history = [
    { date: '2026-07-02', status: 'down' as const },
    { date: '2026-07-04', status: 'down' as const },
    { date: '2026-07-06', status: 'down' as const },
    { date: '2026-07-13', status: 'operational' as const },
    { date: '2026-07-14', status: 'operational' as const },
    { date: '2026-07-15', status: 'operational' as const },
    { date: '2026-07-16', status: 'operational' as const },
  ]

  // Ancien calcul fautif : slice(-7) comptait 3 jours hors fenêtre => 57.14%.
  assert.equal(calculateUptime(history.slice(-7).map((day) => day.status)).toFixed(2), '57.14')

  const inWindow = filterDailyHistoryInPeriod(history, '7d', NOW)
  assert.deepEqual(inWindow.map((day) => day.date), ['2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16'])
  assert.equal(calculateUptime(inWindow.map((day) => day.status)).toFixed(2), '100.00')
})

test('an empty 7d/30d window yields no percentage instead of the 100% fallback', () => {
  const history = [{ date: '2026-06-01', status: 'operational' as const }]

  assert.equal(filterDailyHistoryInPeriod(history, '7d', NOW).length, 0)
  assert.equal(filterDailyHistoryInPeriod(history, '30d', NOW).length, 0)
  // Sans filtre, calculateUptime([]) renverrait 100% à tort (fallback statut courant).
  assert.equal(calculateUptime([], 'operational'), 100)
})

test('1h/24h keep every bucket unknown when no check landed in the window', () => {
  const history = buildTimelineHistory({
    period: '24h',
    currentStatus: 'operational',
    startDate: new Date(NOW - 60 * MINUTE).toISOString(),
    recentChecks: [],
    now: NOW,
  })

  assert.equal(history.every((status) => status === 'unknown'), true)
})

test('1h does not color buckets before the first real check', () => {
  const history = buildTimelineHistory({
    period: '1h',
    currentStatus: 'operational',
    startDate: new Date(NOW - 60 * MINUTE).toISOString(),
    recentChecks: [{ t: new Date(NOW - 9.5 * MINUTE).toISOString(), s: 'down' }],
    now: NOW,
  })

  assert.equal(history.slice(0, 50).every((status) => status === 'unknown'), true)
  assert.equal(history.at(-1), 'incident')
})

test('a 24h bucket keeps the worst status from its checks', () => {
  const history = buildTimelineHistory({
    period: '24h',
    currentStatus: 'operational',
    startDate: new Date(NOW - 24 * 60 * MINUTE).toISOString(),
    recentChecks: [
      { t: new Date(NOW - 10 * MINUTE).toISOString(), s: 'operational' },
      { t: new Date(NOW - 8 * MINUTE).toISOString(), s: 'down' },
    ],
    now: NOW,
  })

  assert.equal(history.at(-1), 'incident')
})
