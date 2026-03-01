import express from 'express'
import cron from 'node-cron'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { isMaintenanceActive } from './src/lib/maintenance.ts'
import { calculateUptime, classifyMonitorStatus, getWorstStatus } from './src/lib/status.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = 3001
const CHECK_INTERVAL_MINUTES = 5
const MAX_HISTORY_DAYS = 30

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

function isStatusAccepted(status, acceptedCodes) {
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

function getMaxRecentChecks(intervalMinutes) {
  return Math.ceil((24 * 60) / intervalMinutes)
}

// Fonction de vérification
async function checkMonitor(monitor) {
  const startTime = Date.now()

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(monitor.url, {
      method: monitor.method || 'GET',
      redirect: monitor.followRedirect !== false ? 'follow' : 'manual',
      headers: { 'User-Agent': branding.userAgent || 'UptimeWorker-Monitor/1.0' },
      signal: controller.signal,
    })

    clearTimeout(timeout)

    const responseTime = Date.now() - startTime
    const accepted = isStatusAccepted(response.status, monitor.acceptedStatusCodes)
    const contentType = response.headers.get('content-type') || ''
    const shouldInspectBody = accepted && (
      contentType.includes('text/html') ||
      contentType.includes('text/plain')
    )
    const responseBody = shouldInspectBody ? await response.text() : undefined
    const status = classifyMonitorStatus({
      accepted,
      responseTime,
      bodyText: responseBody,
    })

    return {
      operational: status === 'operational',
      status,
      lastCheck: new Date().toISOString(),
      responseTime,
    }
  } catch (error) {
    console.error(`Failed to check ${monitor.name}:`, error.message)
    return {
      operational: false,
      status: 'down',
      lastCheck: new Date().toISOString(),
      responseTime: Date.now() - startTime,
    }
  }
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
  const maxRecentChecks = getMaxRecentChecks(CHECK_INTERVAL_MINUTES)

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
        .slice(-maxRecentChecks)

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
  cron.schedule(`*/${CHECK_INTERVAL_MINUTES} * * * *`, runChecks)

  console.log(`⏱️  Monitoring checks every ${CHECK_INTERVAL_MINUTES} minutes`)
})
