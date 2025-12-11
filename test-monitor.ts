// Test script to verify monitoring logic
import { branding } from './src/config/branding'

interface Monitor {
  id: string
  name: string
  description?: string
  url: string
  method?: string
  expectStatus?: number
  followRedirect?: boolean
  linkable?: boolean
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
      signal: AbortSignal.timeout(10000),
    })

    const responseTime = Date.now() - startTime
    const expectedStatus = monitor.expectStatus || 200
    const operational = response.status === expectedStatus

    return {
      operational,
      lastCheck: new Date().toISOString(),
      responseTime,
      uptime: operational ? 99.9 : 0,
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

const monitors: Monitor[] = [
  {
    id: 'example-website',
    name: 'Example Website',
    description: 'Main website',
    url: 'https://example.com',
    method: 'GET',
    expectStatus: 200,
    followRedirect: true,
    linkable: true,
  },
  {
    id: 'example-api',
    name: 'Example API',
    description: 'REST API endpoint',
    url: 'https://api.example.com/health',
    method: 'GET',
    expectStatus: 200,
    followRedirect: false,
    linkable: false,
  },
  {
    id: 'google',
    name: 'Google',
    description: 'Public test endpoint',
    url: 'https://www.google.com',
    method: 'GET',
    expectStatus: 200,
    linkable: true,
  },
]

async function test() {
  console.log('🔍 Starting monitor checks...\n')

  for (const monitor of monitors) {
    console.log(`Checking ${monitor.name} (${monitor.url})...`)
    const result = await checkMonitor(monitor)

    const status = result.operational ? '✓ OK' : '✗ FAIL'
    const color = result.operational ? '\x1b[32m' : '\x1b[31m'
    const reset = '\x1b[0m'

    console.log(`${color}${status}${reset} ${monitor.name}: ${result.operational ? 'Operational' : 'Down'} (${result.responseTime}ms)`)
    console.log(`   Last check: ${result.lastCheck}`)
    console.log(`   Uptime: ${result.uptime}%\n`)
  }

  console.log('✅ All monitor checks completed!')
}

test()
