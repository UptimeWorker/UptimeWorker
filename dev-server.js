import express from 'express'
import cron from 'node-cron'
import { readFileSync, writeFileSync, existsSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { loadEnv } from 'vite'
import { isMaintenanceActive } from './src/lib/maintenance.ts'
import { calculateUptime, classifyMonitorStatus, getWorstStatus, hasCloudflareChallengeHeaders, hasCloudflareTransitHeaders, isCloudflareChallengeStatus } from './src/lib/status.ts'
import { fetchMonitorSafely, mapWithConcurrency, parseCheckInterval, readResponseTextPrefix } from './src/lib/monitorRequest.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const localEnv = loadEnv('development', __dirname, '')
const app = express()
// Port API dev dédié (4001) : évite les collisions avec d'autres projets locaux
// qui squattent souvent 3000/3001 (l'auto-fallback prend le relais si occupé).
const DEFAULT_API_PORT = parseInt(process.env.API_PORT || localEnv.API_PORT || '4001', 10)
const MAX_PORT_FALLBACK_ATTEMPTS = 10
// Même variable que le worker Cloudflare pour éviter une cadence locale différente.
const CHECK_INTERVAL_MINUTES = parseCheckInterval(
  process.env.CRON_CHECK_INTERVAL || localEnv.CRON_CHECK_INTERVAL,
  1,
)
if (!CHECK_INTERVAL_MINUTES) throw new Error('CRON_CHECK_INTERVAL must be an integer between 1 and 1440')
const MAX_HISTORY_DAYS = 30
const MAX_CONCURRENT_CHECKS = 5

// Load branding config
const brandingModule = await import('./src/config/branding.ts')
const branding = brandingModule.branding

// Simule le KV Storage avec un fichier JSON
const KV_FILE = join(__dirname, 'local-kv.json')

// Initialiser le fichier KV si inexistant
if (!existsSync(KV_FILE)) {
  writeFileSync(KV_FILE, JSON.stringify({ monitors: {}, lastUpdate: null }))
}

// Helper pour lire/écrire KV.
// Mime l'API Cloudflare KV : get(key, { type: 'json' }) parse la valeur stockée,
// exactement comme KV_STATUS_PAGE.get('monitors', { type: 'json' }) en prod. Ça
// évite le piège "valeur stockée en string non reparsée" qui écrasait l'historique.
const KV = {
  get: (key, options) => {
    const data = JSON.parse(readFileSync(KV_FILE, 'utf-8'))
    const value = data[key]
    if (options?.type === 'json' && typeof value === 'string') {
      return JSON.parse(value)
    }
    return value
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

function getTodayDate() {
  return new Date().toISOString().split('T')[0]
}

// Fonction de vérification
async function checkMonitor(monitor) {
  const startTime = Date.now()

  try {
    const response = await fetchMonitorSafely(monitor.url, {
      method: monitor.method || 'GET',
      headers: { 'User-Agent': branding.userAgent || 'UptimeWorker-Monitor/1.0' },
      followRedirect: monitor.followRedirect !== false,
    })

    const responseTime = Date.now() - startTime
    const accepted = isStatusAccepted(response.status, monitor.acceptedStatusCodes)
    const contentType = response.headers.get('content-type') || ''

    // Détection challenge Cloudflare (managed challenge 403, etc.) avant de classer en down.
    const cfChallenge = hasCloudflareChallengeHeaders(response.headers)
    const cfTransit = hasCloudflareTransitHeaders(response.headers)

    const shouldInspectBody = (
      accepted ||
      cfChallenge ||
      (cfTransit && isCloudflareChallengeStatus(response.status))
    ) && (
      contentType.includes('text/html') ||
      contentType.includes('text/plain')
    )
    const responseBody = shouldInspectBody ? await readResponseTextPrefix(response) : undefined
    const status = classifyMonitorStatus({
      accepted,
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

// Fonction CRON
async function runChecks() {
  console.log('🔍 Starting monitor checks...')

  // Get existing data to preserve startDate + accumuler recentChecks.
  // { type: 'json' } parse la valeur stockée (comme la prod CF), sinon
  // existingData[monitor.id] serait undefined et on écraserait l'historique.
  const existingData = KV.get('monitors', { type: 'json' }) || {}
  const today = getTodayDate()
  const maxRecentChecks = getMaxRecentChecks(CHECK_INTERVAL_MINUTES)

  const results = await mapWithConcurrency(
    monitors,
    MAX_CONCURRENT_CHECKS,
    async (monitor) => {
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
      const previousChecks = existing?.recentChecks || []
      const updatedChecks = [...previousChecks, { t: result.lastCheck, s: result.status, rt: result.responseTime }]
        .slice(-maxRecentChecks)

      const previousHistory = existing?.dailyHistory || []
      let updatedHistory = [...previousHistory]
      const lastEntry = updatedHistory[updatedHistory.length - 1]

      if (lastEntry && lastEntry.date === today) {
        lastEntry.status = getWorstStatus(lastEntry.status, result.status)
      } else {
        updatedHistory.push({ date: today, status: result.status })
      }

      updatedHistory = updatedHistory.slice(-MAX_HISTORY_DAYS)

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
        dailyHistory: updatedHistory,
      }
    },
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
  const monitors = KV.get('monitors', { type: 'json' }) || {}
  const lastUpdate = KV.get('lastUpdate') || new Date().toISOString()
  const maintenances = getActiveMaintenances()

  res.json({
    monitors,
    maintenances,
    lastUpdate,
    checkIntervalMinutes: CHECK_INTERVAL_MINUTES,
  })
})

// Démarrer le serveur avec auto-fallback de port (EADDRINUSE -> port+1)
function listenWithFallback(startPort, attempts) {
  return new Promise((resolve, reject) => {
    const tryPort = (port, remaining) => {
      const server = app.listen(port)
      server.once('listening', () => resolve({ server, port }))
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE' && remaining > 1) {
          tryPort(port + 1, remaining - 1)
        } else {
          reject(err)
        }
      })
    }
    tryPort(startPort, attempts)
  })
}

;(async () => {
  try {
    const { port } = await listenWithFallback(DEFAULT_API_PORT, MAX_PORT_FALLBACK_ATTEMPTS)

    // Écrit le port effectif pour que vite.config s'aligne au prochain démarrage.
    const portFile = join(__dirname, '.dev-api-port')
    try {
      writeFileSync(portFile, String(port))
    } catch {}

    // Nettoie le handshake à l'arrêt (Ctrl+C / SIGTERM de concurrently) pour ne
    // jamais laisser un port stale que vite.config lirait au prochain démarrage
    // (sinon proxy /api vers le mauvais port -> ECONNREFUSED).
    let cleanedUp = false
    const cleanup = () => {
      if (cleanedUp) return
      cleanedUp = true
      try { rmSync(portFile, { force: true }) } catch {}
    }
    process.on('exit', cleanup)
    process.on('SIGINT', () => { cleanup(); process.exit(0) })
    process.on('SIGTERM', () => { cleanup(); process.exit(0) })

    if (port !== DEFAULT_API_PORT) {
      console.log(`\n⚠️  Port ${DEFAULT_API_PORT} occupé, fallback automatique sur ${port}`)
      console.log(`⚠️  Si le proxy Vite est désynchronisé : relance \`npm run dev:full\` ou \`API_PORT=${port} npm run dev:full\``)
    }
    console.log(`\n🚀 Dev server running on http://localhost:${port}`)
    console.log(`📊 API endpoint: http://localhost:${port}/api/monitors/status\n`)

    // Lancer immédiatement
    runChecks()

    // CRON: cadence configurable via CRON_CHECK_INTERVAL, 1 minute par défaut.
    cron.schedule(`*/${CHECK_INTERVAL_MINUTES} * * * *`, runChecks)

    console.log(`⏱️  Monitoring checks every ${CHECK_INTERVAL_MINUTES} minutes`)
  } catch (err) {
    console.error(`\n❌ Impossible de démarrer le dev server : ${err.message}`)
    process.exit(1)
  }
})()
