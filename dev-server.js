import express from 'express'
import cron from 'node-cron'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = 3001

// Load branding config
const brandingModule = await import('./src/config/branding.ts')
const branding = brandingModule.branding

// Simule le KV Storage avec un fichier JSON
const KV_FILE = join(__dirname, 'local-kv.json')

// Initialiser le fichier KV si inexistant
if (!existsSync(KV_FILE)) {
  writeFileSync(KV_FILE, JSON.stringify({ monitors: {}, lastUpdate: null }))
}

// Helper pour lire/écrire KV
const KV = {
  get: (key) => {
    const data = JSON.parse(readFileSync(KV_FILE, 'utf-8'))
    return data[key]
  },
  put: (key, value) => {
    const data = JSON.parse(readFileSync(KV_FILE, 'utf-8'))
    data[key] = typeof value === 'string' ? value : JSON.stringify(value)
    writeFileSync(KV_FILE, JSON.stringify(data, null, 2))
  }
}

// Monitors config (example monitors for dev)
const monitors = [
  {
    id: 'example-website',
    name: 'Example Website',
    url: 'https://example.com',
    method: 'GET',
    expectStatus: 200,
    followRedirect: true,
  },
  {
    id: 'example-api',
    name: 'Example API',
    url: 'https://api.example.com/health',
    method: 'GET',
    expectStatus: 200,
    followRedirect: false,
  },
  {
    id: 'google',
    name: 'Google',
    url: 'https://www.google.com',
    method: 'GET',
    expectStatus: 200,
  },
]

// Fonction de vérification
async function checkMonitor(monitor) {
  const startTime = Date.now()

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(monitor.url, {
      method: monitor.method || 'GET',
      redirect: monitor.followRedirect ? 'follow' : 'manual',
      headers: { 'User-Agent': branding.userAgent || 'UptimeWorker-Monitor/1.0' },
      signal: controller.signal,
    })

    clearTimeout(timeout)

    const responseTime = Date.now() - startTime
    const expectedStatus = monitor.expectStatus || 200

    // Check if response has expected status
    const hasCorrectStatus = response.status === expectedStatus

    // Detect Cloudflare challenge by checking response content
    let status = 'down' // Default: down
    let isCloudflareChallenge = false

    if (hasCorrectStatus) {
      const text = await response.text()

      // Detect Cloudflare challenge patterns
      isCloudflareChallenge =
        text.includes('Checking your browser') ||
        text.includes('Just a moment') ||
        text.includes('cf-challenge') ||
        text.includes('ray_id') && text.includes('cloudflare') ||
        response.headers.get('server')?.toLowerCase().includes('cloudflare') && text.length < 5000

      if (isCloudflareChallenge) {
        // Challenge detected: degraded (site up but not accessible)
        status = 'degraded'
      } else {
        // Normal response: operational
        status = 'operational'
      }
    }

    // Calculate uptime percentage
    const uptime = status === 'operational' ? 99.9 :
                   status === 'degraded' ? 95.0 : 0

    return {
      operational: status === 'operational', // For backward compatibility
      status, // New: operational | degraded | down
      lastCheck: new Date().toISOString(),
      responseTime,
      uptime,
      degraded: isCloudflareChallenge,
    }
  } catch (error) {
    console.error(`Failed to check ${monitor.name}:`, error.message)
    return {
      operational: false,
      status: 'down',
      lastCheck: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      uptime: 0,
      degraded: false,
    }
  }
}

// Fonction CRON
async function runChecks() {
  console.log('🔍 Starting monitor checks...')

  // Get existing data to preserve startDate
  const existingData = KV.get('monitors') || {}

  const results = await Promise.all(
    monitors.map(async (monitor) => {
      const result = await checkMonitor(monitor)

      // Log with appropriate emoji based on status
      const emoji = result.status === 'operational' ? '✓' :
                    result.status === 'degraded' ? '⚠' : '✗'
      const statusLabel = result.status === 'operational' ? 'OK' :
                          result.status === 'degraded' ? 'DEGRADED (Cloudflare Challenge)' :
                          'DOWN'

      console.log(`${emoji} ${monitor.name}: ${statusLabel} (${result.responseTime}ms)`)

      // Preserve startDate if it exists, otherwise set it now
      const existing = existingData[monitor.id]
      const startDate = existing?.startDate || new Date().toISOString()

      return { id: monitor.id, ...result, startDate }
    })
  )

  const monitorsData = {}
  results.forEach(({ id, ...data }) => {
    monitorsData[id] = data
  })

  KV.put('monitors', monitorsData)
  KV.put('lastUpdate', new Date().toISOString())

  console.log('✅ Checks completed and saved\n')
}

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  next()
})

// API Endpoint: /api/monitors/status
app.get('/api/monitors/status', (req, res) => {
  const monitors = KV.get('monitors') || {}
  const lastUpdate = KV.get('lastUpdate') || new Date().toISOString()

  res.json({
    monitors: typeof monitors === 'string' ? JSON.parse(monitors) : monitors,
    lastUpdate,
  })
})

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`\n🚀 Dev server running on http://localhost:${PORT}`)
  console.log(`📊 API endpoint: http://localhost:${PORT}/api/monitors/status\n`)

  // Lancer immédiatement
  runChecks()

  // CRON: Toutes les 5 minutes (évite de surcharger les sites)
  cron.schedule('*/5 * * * *', runChecks)

  console.log('⏱️  Monitoring checks every 5 minutes')
})
