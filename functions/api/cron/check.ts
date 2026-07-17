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
  hasCloudflareChallengeHeaders,
  hasCloudflareTransitHeaders,
  isCloudflareChallengeStatus,
  type MonitorStatus,
} from '../../../src/lib/status'
import {
  fetchMonitorSafely,
  mapWithConcurrency,
  parseCheckInterval,
  readResponseTextPrefix,
} from '../../../src/lib/monitorRequest'

interface Monitor {
  id: string
  name: string
  url: string
  method?: string
  acceptedStatusCodes?: string[]
  followRedirect?: boolean
  degradedCountsAsDown?: boolean
  acceptCloudflareChallenge?: boolean
}

const monitors: Monitor[] = monitorsConfig as Monitor[]
const MAX_CONCURRENT_CHECKS = 5
let checkRunInProgress = false

function cronHeaders(extra: HeadersInit = {}): Headers {
  const headers = new Headers(extra)
  headers.set('Cache-Control', 'no-store')
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
  return headers
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
  try {
    const response = await fetchMonitorSafely(monitor.url, {
      method: monitor.method || 'GET',
      headers: { 'User-Agent': userAgent },
      followRedirect: monitor.followRedirect !== false,
    })
    const responseTime = Date.now() - startTime
    const operational = isStatusAccepted(response.status, monitor.acceptedStatusCodes)
    const contentType = response.headers.get('content-type') || ''

    // Détection challenge Cloudflare : un managed challenge moderne renvoie 403 (donc
    // !accepted) avec marqueurs CF dans les headers. Sans cette détection, on tomberait
    // en 'down' alors que le service est juste protégé.
    const cfChallenge = hasCloudflareChallengeHeaders(response.headers)
    const cfTransit = hasCloudflareTransitHeaders(response.headers)

    // On inspecte le body aussi sur challenge CF (anciens challenges HTTP 200 + page JS,
    // ou managed challenge avec body HTML signature).
    const shouldInspectBody = (
      operational ||
      cfChallenge ||
      (cfTransit && isCloudflareChallengeStatus(response.status))
    ) && (
      contentType.includes('text/html') ||
      contentType.includes('text/plain')
    )
    const responseBody = shouldInspectBody ? await readResponseTextPrefix(response) : undefined
    const status = classifyMonitorStatus({
      accepted: operational,
      responseTime,
      bodyText: responseBody,
      cfChallenge,
      acceptChallenge: monitor.acceptCloudflareChallenge === true,
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
  if (context.request.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: cronHeaders({ Allow: 'POST' }),
    })
  }

  const { KV_STATUS_PAGE, CRON_SECRET, CRON_CHECK_INTERVAL, MONITOR_USER_AGENT } = context.env
  const authHeader = context.request.headers.get('X-Cron-Auth')

  if (!CRON_SECRET || !authHeader || !timingSafeEqualStr(authHeader, CRON_SECRET)) {
    return new Response('Access denied', { status: 401, headers: cronHeaders() })
  }

  const checkInterval = parseCheckInterval(CRON_CHECK_INTERVAL, 1)
  if (!checkInterval) {
    return new Response('Invalid cron configuration', { status: 503, headers: cronHeaders() })
  }
  if (checkRunInProgress) {
    return new Response('Check already running', {
      status: 409,
      headers: cronHeaders({ 'Retry-After': '5' }),
    })
  }

  const maxRecentChecks = getMaxRecentChecks(checkInterval)
  const userAgent = MONITOR_USER_AGENT || 'UptimeWorker-Monitor/1.0'
  checkRunInProgress = true

  try {
    const existingData = await KV_STATUS_PAGE.get('monitors', { type: 'json' }) as Record<string, any> || {}
    const today = getTodayDate()

    const results = await mapWithConcurrency(
      monitors,
      MAX_CONCURRENT_CHECKS,
      async (monitor) => {
        const result = await checkMonitor(monitor, userAgent)
        const existing = existingData[monitor.id]
        const startDate = existing?.startDate || new Date().toISOString()

        // 1. Recent checks: store each check with timestamp + response time
        // (rt, ms) pour les filtres 1h/24h et le futur graphique de latence.
        const previousChecks: Array<{ t: string; s: MonitorStatus; rt?: number }> = existing?.recentChecks || []
        const updatedChecks = [...previousChecks, { t: result.lastCheck, s: result.status, rt: result.responseTime }]
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
      },
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
      headers: cronHeaders({ 'Content-Type': 'application/json; charset=utf-8' })
    })

  } catch (error) {
    console.error('Cron check error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: cronHeaders({ 'Content-Type': 'application/json; charset=utf-8' })
    })
  } finally {
    checkRunInProgress = false
  }
}
