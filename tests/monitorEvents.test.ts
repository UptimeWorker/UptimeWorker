import assert from 'node:assert/strict'
import test from 'node:test'
import { getRecentMonitorEvents } from '../src/lib/monitorEvents'

const NOW = Date.parse('2026-07-16T12:00:00.000Z')

test('1h keeps only status transitions inside the last hour', () => {
  const events = getRecentMonitorEvents({
    period: '1h',
    now: NOW,
    lastCheck: '2026-07-16T12:00:00.000Z',
    currentStatus: 'operational',
    recentChecks: [
      { t: '2026-07-16T09:00:00.000Z', s: 'down' },
      { t: '2026-07-16T11:10:00.000Z', s: 'down' },
      { t: '2026-07-16T11:20:00.000Z', s: 'down' },
      { t: '2026-07-16T11:30:00.000Z', s: 'degraded' },
      { t: '2026-07-16T11:50:00.000Z', s: 'degraded' },
      { t: '2026-07-16T12:00:00.000Z', s: 'operational' },
    ],
  })

  assert.deepEqual(events, [
    { timestamp: '2026-07-16T12:00:00.000Z', status: 'operational' },
    { timestamp: '2026-07-16T11:30:00.000Z', status: 'degraded' },
  ])
})

test('24h includes transitions excluded by the 1h filter', () => {
  const input = {
    now: NOW,
    lastCheck: '2026-07-16T12:00:00.000Z',
    currentStatus: 'operational' as const,
    recentChecks: [
      { t: '2026-07-15T13:00:00.000Z', s: 'operational' as const },
      { t: '2026-07-16T02:00:00.000Z', s: 'down' as const },
      { t: '2026-07-16T11:30:00.000Z', s: 'degraded' as const },
      { t: '2026-07-16T12:00:00.000Z', s: 'operational' as const },
    ],
  }

  assert.deepEqual(
    getRecentMonitorEvents({ ...input, period: '1h' }).map((event) => event.status),
    ['operational', 'degraded'],
  )
  assert.deepEqual(
    getRecentMonitorEvents({ ...input, period: '24h' }).map((event) => event.status),
    ['operational', 'degraded', 'down'],
  )
})

test('7d and 30d use daily history instead of granular checks', () => {
  const input = {
    now: NOW,
    lastCheck: '2026-07-16T12:00:00.000Z',
    currentStatus: 'degraded' as const,
    recentChecks: [{ t: '2026-07-16T11:59:00.000Z', s: 'operational' as const }],
    dailyHistory: [
      { date: '2026-06-20', status: 'operational' as const },
      { date: '2026-06-25', status: 'down' as const },
      { date: '2026-07-10', status: 'operational' as const },
      { date: '2026-07-14', status: 'down' as const },
      { date: '2026-07-16', status: 'degraded' as const },
    ],
  }

  assert.deepEqual(
    getRecentMonitorEvents({ ...input, period: '7d' }).map((event) => event.status),
    ['degraded', 'down', 'operational'],
  )
  assert.deepEqual(
    getRecentMonitorEvents({ ...input, period: '30d' }).map((event) => event.status),
    ['degraded', 'down', 'operational', 'down'],
  )
})

test('events are capped at five entries', () => {
  const events = getRecentMonitorEvents({
    period: '24h',
    now: NOW,
    lastCheck: '2026-07-16T12:00:00.000Z',
    currentStatus: 'operational',
    recentChecks: Array.from({ length: 10 }, (_, index) => ({
      t: new Date(NOW - (10 - index) * 60 * 60 * 1000).toISOString(),
      s: index % 2 === 0 ? 'operational' as const : 'down' as const,
    })),
  })

  assert.equal(events.length, 5)
})

test('a stable status keeps the current event only', () => {
  const events = getRecentMonitorEvents({
    period: '1h',
    now: NOW,
    lastCheck: '2026-07-16T12:00:00.000Z',
    currentStatus: 'degraded',
    recentChecks: [
      { t: '2026-07-16T11:00:00.000Z', s: 'degraded' },
      { t: '2026-07-16T11:30:00.000Z', s: 'degraded' },
      { t: '2026-07-16T12:00:00.000Z', s: 'degraded' },
    ],
  })

  assert.deepEqual(events, [
    { timestamp: '2026-07-16T12:00:00.000Z', status: 'degraded' },
  ])
})
