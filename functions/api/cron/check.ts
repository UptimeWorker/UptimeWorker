/**
 * Endpoint pour déclencher les checks
 * Appelé par le Worker cron externe via POST avec header X-Cron-Auth
 *
 * POST /api/cron/check
 * Header: X-Cron-Auth: YOUR_SECRET
 */

import monitorsConfig from '../../../monitors.json'

interface Monitor {
  id: string
  name: string
  url: string
  method?: string
  acceptedStatusCodes?: string[]
  followRedirect?: boolean
}

const monitors: Monitor[] = monitorsConfig as Monitor[]

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

export const onRequest = async (context: any) => {
  const { KV_STATUS_PAGE, CRON_SECRET } = context.env
  const authHeader = context.request.headers.get('X-Cron-Auth')

  // Vérification sécurité: header X-Cron-Auth obligatoire
  if (!CRON_SECRET || authHeader !== CRON_SECRET) {
    return new Response('Access denied', { status: 401 })
  }

  try {
    console.log('🔍 Starting monitor checks...')

    const existingData = await KV_STATUS_PAGE.get('monitors', { type: 'json' }) as Record<string, any> || {}

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

    await KV_STATUS_PAGE.put('monitors', JSON.stringify(monitorsData))
    await KV_STATUS_PAGE.put('lastUpdate', new Date().toISOString())

    console.log('✅ Monitor checks completed')

    return new Response(JSON.stringify({
      success: true,
      checked: results.length,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
