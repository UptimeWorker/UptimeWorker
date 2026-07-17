import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildTimelineHistory,
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
