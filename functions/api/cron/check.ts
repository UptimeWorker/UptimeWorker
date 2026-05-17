/**
 * Endpoint pour déclencher les checks
 * Appelé par le Worker cron externe via POST avec header X-Cron-Auth
 *
 * POST /api/cron/check
 * Header: X-Cron-Auth: YOUR_SECRET
 */

import monitorsConfig from '../../../monitors.json'
import {
  calculateUptime,
  classifyMonitorStatus,
  getWorstStatus,
  type MonitorStatus,
} from '../../../src/lib/status'

interface Monitor {
  id: string
  name: string
  url: string
  method?: string
  acceptedStatusCodes?: string[]
  followRedirect?: boolean
  degradedCountsAsDown?: boolean
}

const monitors: Monitor[] = monitorsConfig as Monitor[]

function isSafeMonitorUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
    const host = u.hostname.toLowerCase()
    if (host === 'localhost' || host === '0.0.0.0' || host === '::1' || host === '::') return false
    if (/^127\./.test(host)) return false
    if (/^10\./.test(host)) return false
    if (/^192\.168\./.test(host)) return false
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return false
    if (/^169\.254\./.test(host)) return false
    if (host.endsWith('.local') || host.endsWith('.internal')) return false
    if (host.startsWith('[fc') || host.startsWith('[fd')) return false
    return true
  } catch {
    return false
  }
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const aBytes = enc.encode(a)
  const bBytes = enc.encode(b)
  const len = Math.max(aBytes.byteLength, bBytes.byteLength)
  let diff = aBytes.byteLength ^ bBytes.byteLength
  for (let i = 0; i < len; i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0)
  }
  return diff === 0
}

function isStatusAccepted(status: number, acceptedCodes?: string[]): boolean {
  if (!acceptedCodes || acceptedCodes.length === 0) {
    return status >= 200 && status < 300
  }
  for (const code of acceptedCodes) {
    if (code.includes('-')) {
      const [min, max] = code.split('-').map(Number)
      if (status >= min && status <= max) return true
    } else if (status === Number(code)) {
      return true
    }
  }
  return false
}

async function checkMonitor(monitor: Monitor, userAgent: string): Promise<{
  operational: boolean
  status: MonitorStatus
  lastCheck: string
  responseTime: number
}> {
  const startTime = Date.now()
  if (!isSafeMonitorUrl(monitor.url)) {
    return {
      operational: false,
      status: 'down',
      lastCheck: new Date().toISOString(),
      responseTime: 0,
    }
  }
  try {
    const response = await fetch(monitor.url, {
      method: monitor.method || 'GET',
      redirect: monitor.followRedirect !== false ? 'follow' : 'manual',
      headers: { 'User-Agent': userAgent },
      signal: AbortSignal.timeout(10000),
    })
    const responseTime = Date.now() - startTime
    const operational = isStatusAccepted(response.status, monitor.acceptedStatusCodes)
    const contentType = response.headers.get('content-type') || ''
    const shouldInspectBody = operational && (
      contentType.includes('text/html') ||
      contentType.includes('text/plain')
    )
    const responseBody = shouldInspectBody ? await response.text() : undefined
    const status = classifyMonitorStatus({
      accepted: operational,
      responseTime,
      bodyText: responseBody,
    })

    return {
      operational: status === 'operational',
      status,
      lastCheck: new Date().toISOString(),
      responseTime,
    }
  } catch {
    return {
      operational: false,
      status: 'down',
      lastCheck: new Date().toISOString(),
      responseTime: Date.now() - startTime,
    }
  }
}

// Max 30 days of daily history
const MAX_HISTORY_DAYS = 30

// Calculate max recent checks based on interval (24h worth of checks)
function getMaxRecentChecks(intervalMinutes: number): number {
  return Math.ceil((24 * 60) / intervalMinutes)
}

// Get today's date as YYYY-MM-DD
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

export const onRequest = async (context: any) => {
  const { KV_STATUS_PAGE, CRON_SECRET, CRON_CHECK_INTERVAL, MONITOR_USER_AGENT } = context.env
  const checkInterval = parseInt(CRON_CHECK_INTERVAL || '5', 10)
  const maxRecentChecks = getMaxRecentChecks(checkInterval)
  const userAgent = MONITOR_USER_AGENT || 'UptimeWorker-Monitor/1.0'
  const authHeader = context.request.headers.get('X-Cron-Auth')

  // Vérification sécurité: header X-Cron-Auth obligatoire (comparaison timing-safe)
  if (!CRON_SECRET || !authHeader || !timingSafeEqualStr(authHeader, CRON_SECRET)) {
    return new Response('Access denied', { status: 401 })
  }

  try {
    const existingData = await KV_STATUS_PAGE.get('monitors', { type: 'json' }) as Record<string, any> || {}
    const today = getTodayDate()

    const results = await Promise.all(
      monitors.map(async (monitor) => {
        const result = await checkMonitor(monitor, userAgent)
        const existing = existingData[monitor.id]
        const startDate = existing?.startDate || new Date().toISOString()

        // 1. Recent checks: store each check with timestamp (for 1h/24h filters)
        const previousChecks: Array<{ t: string; s: MonitorStatus }> = existing?.recentChecks || []
        const updatedChecks = [...previousChecks, { t: result.lastCheck, s: result.status }]
          .slice(-maxRecentChecks)

        // 2. Daily history: 1 entry per day with worst status (for 3d/7d/30d filters)
        const previousHistory: Array<{ date: string; status: MonitorStatus }> = existing?.dailyHistory || []
        let updatedHistory = [...previousHistory]

        const lastEntry = updatedHistory[updatedHistory.length - 1]
        if (lastEntry && lastEntry.date === today) {
          lastEntry.status = getWorstStatus(lastEntry.status, result.status)
        } else {
          updatedHistory.push({ date: today, status: result.status })
        }
        updatedHistory = updatedHistory.slice(-MAX_HISTORY_DAYS)

        // Calculate uptime from daily history
        const uptime = calculateUptime(
          updatedHistory.map((entry) => entry.status),
          result.status,
          { degradedCountsAsDown: monitor.degradedCountsAsDown !== false }
        )

        return {
          id: monitor.id,
          ...result,
          startDate,
          uptime: parseFloat(uptime.toFixed(3)),
          recentChecks: updatedChecks,
          dailyHistory: updatedHistory
        }
      })
    )

    const monitorsData: Record<string, any> = {}
    results.forEach(({ id, ...data }) => {
      monitorsData[id] = data
    })

    await KV_STATUS_PAGE.put('monitors', JSON.stringify(monitorsData))
    await KV_STATUS_PAGE.put('lastUpdate', new Date().toISOString())

    return new Response(JSON.stringify({
      success: true,
      checked: results.length,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Cron check error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
