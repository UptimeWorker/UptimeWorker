// Cloudflare Pages Scheduled Handler (CRON)
// Ce worker s'exécute automatiquement toutes les 5 minutes

/// <reference types="@cloudflare/workers-types" />

interface Env {
  KV_STATUS_PAGE: KVNamespace
}

type PagesFunction<T = unknown> = (context: { env: T }) => Promise<Response>

interface Monitor {
  id: string
  name: string
  description?: string
  url: string
  method?: string
  acceptedStatusCodes?: string[] // e.g. ["200-299", "301", "302"] or ["200", "204"]
  expectStatus?: number // Deprecated: use acceptedStatusCodes instead
  followRedirect?: boolean
  linkable?: boolean
  acceptCloudflareChallenge?: boolean
}

// Import monitors and branding
import monitorsData from '../monitors.json'
import { branding } from '../src/config/branding'
const monitors: Monitor[] = monitorsData as Monitor[]

// Helper: Check if status code is in accepted range
function isStatusAccepted(status: number, acceptedCodes?: string[]): boolean {
  // Default: accept 2xx if no config provided
  if (!acceptedCodes || acceptedCodes.length === 0) {
    return status >= 200 && status < 300
  }

  for (const code of acceptedCodes) {
    // Range format: "200-299"
    if (code.includes('-')) {
      const [min, max] = code.split('-').map(Number)
      if (status >= min && status <= max) return true
    }
    // Exact match: "200", "301", etc.
    else if (status === Number(code)) {
      return true
    }
  }
  return false
}

async function checkMonitor(monitor: Monitor): Promise<{
  operational: boolean
  lastCheck: string
  responseTime?: number
  uptime?: number
}> {
  const startTime = Date.now()

  try {
    const response = await fetch(monitor.url, {
      method: monitor.method || 'GET',
      redirect: monitor.followRedirect ? 'follow' : 'manual',
      headers: {
        'User-Agent': branding.userAgent || 'UptimeWorker-Monitor/1.0',
      },
      // Timeout after 10 seconds
      signal: AbortSignal.timeout(10000),
    })

    const responseTime = Date.now() - startTime

    // Check if status is accepted (using new acceptedStatusCodes or legacy expectStatus)
    let operational: boolean
    if (monitor.acceptedStatusCodes) {
      operational = isStatusAccepted(response.status, monitor.acceptedStatusCodes)
    } else {
      // Legacy support for expectStatus
      const expectedStatus = monitor.expectStatus || 200
      operational = response.status === expectedStatus
    }

    return {
      operational,
      lastCheck: new Date().toISOString(),
      responseTime,
      uptime: operational ? 99.9 : 0, // TODO: Calculate real uptime
    }
  } catch (error) {
    console.error(`Failed to check ${monitor.name}:`, error)
    return {
      operational: false,
      lastCheck: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      uptime: 0,
    }
  }
}

export const onScheduled: PagesFunction<Env> = async (context) => {
  const { KV_STATUS_PAGE } = context.env

  console.log('🔍 Starting monitor checks...')

  // Check all monitors in parallel
  const results = await Promise.all(
    monitors.map(async (monitor) => {
      const result = await checkMonitor(monitor)
      console.log(`✓ ${monitor.name}: ${result.operational ? 'OK' : 'FAIL'} (${result.responseTime}ms)`)
      return { id: monitor.id, ...result }
    })
  )

  // Build monitors object
  const monitorsData: Record<string, any> = {}
  results.forEach((result) => {
    const { id, ...data } = result
    monitorsData[id] = data
  })

  // Save to KV
  await KV_STATUS_PAGE.put('monitors', JSON.stringify(monitorsData))
  await KV_STATUS_PAGE.put('lastUpdate', new Date().toISOString())

  console.log('✅ Monitor checks completed and saved to KV')

  return new Response('OK', { status: 200 })
}
