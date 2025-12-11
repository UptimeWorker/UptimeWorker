/**
 * UptimeWorker - Cloudflare Worker Entry Point
 * Gère: Assets (frontend), API, et Cron
 */

import monitorsConfig from '../monitors.json'

interface Env {
  KV_STATUS_PAGE: KVNamespace
  ASSETS: Fetcher
}

interface Monitor {
  id: string
  name: string
  url: string
  method?: string
  acceptedStatusCodes?: string[]
  followRedirect?: boolean
}

const monitors: Monitor[] = monitorsConfig as Monitor[]

// === HELPERS ===

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

async function checkMonitor(monitor: Monitor): Promise<{
  operational: boolean
  status: 'operational' | 'degraded' | 'down'
  lastCheck: string
  responseTime: number
  uptime: number
}> {
  const startTime = Date.now()
  try {
    const response = await fetch(monitor.url, {
      method: monitor.method || 'GET',
      redirect: monitor.followRedirect !== false ? 'follow' : 'manual',
      headers: { 'User-Agent': 'UptimeWorker-Monitor/1.0' },
      signal: AbortSignal.timeout(10000),
    })
    const responseTime = Date.now() - startTime
    const operational = isStatusAccepted(response.status, monitor.acceptedStatusCodes)
    return {
      operational,
      status: operational ? 'operational' : 'down',
      lastCheck: new Date().toISOString(),
      responseTime,
      uptime: operational ? 99.9 : 0,
    }
  } catch {
    return {
      operational: false,
      status: 'down',
      lastCheck: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      uptime: 0,
    }
  }
}

async function runChecks(env: Env): Promise<void> {
  console.log('🔍 Starting monitor checks...')

  const existingData = await env.KV_STATUS_PAGE.get('monitors', { type: 'json' }) as Record<string, any> || {}

  const results = await Promise.all(
    monitors.map(async (monitor) => {
      const result = await checkMonitor(monitor)
      const existing = existingData[monitor.id]
      const startDate = existing?.startDate || new Date().toISOString()
      console.log(`${result.operational ? '✓' : '✗'} ${monitor.name}: ${result.status} (${result.responseTime}ms)`)
      return { id: monitor.id, ...result, startDate }
    })
  )

  const monitorsData: Record<string, any> = {}
  results.forEach(({ id, ...data }) => {
    monitorsData[id] = data
  })

  await env.KV_STATUS_PAGE.put('monitors', JSON.stringify(monitorsData))
  await env.KV_STATUS_PAGE.put('lastUpdate', new Date().toISOString())

  console.log('✅ Monitor checks completed')
}

// === WORKER EXPORT ===

export default {
  // HTTP Requests (API + Assets)
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // API: /api/monitors/status
    if (url.pathname === '/api/monitors/status') {
      try {
        const monitorsData = await env.KV_STATUS_PAGE.get('monitors', { type: 'json' })
        const lastUpdate = await env.KV_STATUS_PAGE.get('lastUpdate')

        return new Response(JSON.stringify({
          monitors: monitorsData || {},
          lastUpdate: lastUpdate || new Date().toISOString(),
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=5',
          },
        })
      } catch (error) {
        return new Response(JSON.stringify({ monitors: {}, error: 'Failed to fetch' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    // Serve static assets (frontend)
    return env.ASSETS.fetch(request)
  },

  // Cron trigger (toutes les 5 minutes)
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    await runChecks(env)
  },
}
