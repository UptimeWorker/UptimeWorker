import express from 'express'
import cron from 'node-cron'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { isMaintenanceActive } from './src/lib/maintenance.ts'

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

// Monitors config - Load from monitors.json
const MONITORS_FILE = join(__dirname, 'monitors.json')
const MAINTENANCES_FILE = join(__dirname, 'maintenances.json')
let monitors = []

// Load monitors from file
if (existsSync(MONITORS_FILE)) {
  try {
    monitors = JSON.parse(readFileSync(MONITORS_FILE, 'utf-8'))
    console.log(`✅ Loaded ${monitors.length} monitor(s) from monitors.json`)
  } catch (error) {
    console.error('❌ Error loading monitors.json:', error.message)
    monitors = []
  }
} else {
  console.warn('⚠️  monitors.json not found, using empty monitors list')
}

function getActiveMaintenances() {
  if (!existsSync(MAINTENANCES_FILE)) {
    return []
  }

  try {
    const data = JSON.parse(readFileSync(MAINTENANCES_FILE, 'utf-8'))
    if (!Array.isArray(data)) {
      return []
    }

    return data.filter((maintenance) => isMaintenanceActive(maintenance))
  } catch (error) {
    console.error('❌ Error loading maintenances.json:', error.message)
    return []
  }
}

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

// Max 30 days of daily history
const MAX_HISTORY_DAYS = 30

// Calculate max recent checks (24h worth at 5min intervals)
const MAX_RECENT_CHECKS = Math.ceil((24 * 60) / 5)

// Get worst status (down > degraded > operational)
function getWorstStatus(current, newStatus) {
  const priority = { down: 3, degraded: 2, operational: 1 }
  return (priority[newStatus] || 0) > (priority[current] || 0) ? newStatus : current
}

// Get today's date as YYYY-MM-DD
function getTodayDate() {
  return new Date().toISOString().split('T')[0]
}

// Fonction CRON
async function runChecks() {
  console.log('🔍 Starting monitor checks...')

  // Get existing data to preserve startDate and history
  const existingData = KV.get('monitors') || {}
  const today = getTodayDate()

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

      // 1. Recent checks: store each check with timestamp (for 1h/24h filters)
      const previousChecks = existing?.recentChecks || []
      const updatedChecks = [...previousChecks, { t: result.lastCheck, s: result.status }]
        .slice(-MAX_RECENT_CHECKS)

      // 2. Daily history: 1 entry per day with worst status (for 3d/7d/30d filters)
      const previousHistory = existing?.dailyHistory || []
      let updatedHistory = [...previousHistory]

      const lastEntry = updatedHistory[updatedHistory.length - 1]
      if (lastEntry && lastEntry.date === today) {
        lastEntry.status = getWorstStatus(lastEntry.status, result.status)
      } else {
        updatedHistory.push({ date: today, status: result.status })
      }
      updatedHistory = updatedHistory.slice(-MAX_HISTORY_DAYS)

      // Calculate uptime from daily history
      const operationalDays = updatedHistory.filter(d => d.status === 'operational').length
      const uptime = updatedHistory.length > 0 ? (operationalDays / updatedHistory.length) * 100 : 100

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
  const maintenances = getActiveMaintenances()

  res.json({
    monitors: typeof monitors === 'string' ? JSON.parse(monitors) : monitors,
    maintenances,
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
