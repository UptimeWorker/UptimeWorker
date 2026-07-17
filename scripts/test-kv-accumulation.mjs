#!/usr/bin/env node
/**
 * Test de non-régression : vérifie que le dev-server accumule recentChecks
 * au lieu de les écraser.
 *
 * Régression historique : KV.put stocke 'monitors' en string JSON. Si un lecteur
 * (runChecks) ne reparse pas cette string, existingData[monitorId] est undefined,
 * previousChecks = [], et chaque check écrase l'historique -> recentChecks reste
 * bloqué à 1 entrée. Ce test seed N checks, lance UN cycle de check via le
 * dev-server, et asserte que recentChecks contient N+1 entrées.
 *
 * Usage : node scripts/test-kv-accumulation.mjs
 * Exit 0 si OK, 1 si régression détectée.
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync, rmSync } from 'fs'
import { spawn } from 'child_process'
import { createServer } from 'http'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const KV_FILE = join(root, 'local-kv.json')
const BACKUP = join(root, 'local-kv.json.testbak')
const MONITORS_FILE = join(root, 'monitors.json')
const MONITORS_BACKUP = join(root, 'monitors.json.testbak')

const SEED_COUNT = 5
const MONITOR_ID = 'uptimeworker-status'
const TARGET_PORT = 3998
const API_PORT = 3999

function seed() {
  const now = Date.now()
  const checks = []
  for (let i = SEED_COUNT; i >= 1; i--) {
    checks.push({ t: new Date(now - i * 60000).toISOString(), s: i % 2 === 0 ? 'operational' : 'degraded' })
  }
  const mon = {
    [MONITOR_ID]: {
      operational: false, status: 'degraded',
      lastCheck: checks[checks.length - 1].t, responseTime: 50,
      startDate: checks[0].t, uptime: 0,
      recentChecks: checks,
      dailyHistory: [{ date: new Date(now).toISOString().split('T')[0], status: 'degraded' }],
    },
  }
  writeFileSync(KV_FILE, JSON.stringify({ monitors: JSON.stringify(mon), lastUpdate: checks[checks.length - 1].t }, null, 2))
}

function readChecks() {
  const data = JSON.parse(readFileSync(KV_FILE, 'utf-8'))
  const monitors = JSON.parse(data.monitors)
  return monitors[MONITOR_ID]?.recentChecks ?? []
}

async function main() {
  // Sauvegarde les fichiers locaux pour les restaurer après le test.
  const hadKv = existsSync(KV_FILE)
  const hadMonitors = existsSync(MONITORS_FILE)
  if (hadKv) copyFileSync(KV_FILE, BACKUP)
  if (hadMonitors) copyFileSync(MONITORS_FILE, MONITORS_BACKUP)

  let child
  const target = createServer((_, response) => {
    response.writeHead(200, { 'content-type': 'text/plain' })
    response.end('ok')
  })

  try {
    await new Promise((resolve, reject) => {
      target.once('error', reject)
      target.listen(TARGET_PORT, '127.0.0.1', resolve)
    })
    writeFileSync(MONITORS_FILE, JSON.stringify([{
      id: MONITOR_ID,
      name: 'KV accumulation test',
      url: `http://127.0.0.1:${TARGET_PORT}/health`,
      method: 'GET',
      acceptedStatusCodes: ['200'],
    }], null, 2))

    seed()
    const before = readChecks().length
    if (before !== SEED_COUNT) {
      throw new Error(`Seed raté : attendu ${SEED_COUNT}, obtenu ${before}`)
    }

    // Lance le dev-server : runChecks() s'exécute une fois au démarrage.
    child = spawn('node', ['dev-server.js'], {
      cwd: root,
      env: { ...process.env, CRON_CHECK_INTERVAL: '59', API_PORT: String(API_PORT) },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let output = ''
    child.stdout.on('data', (chunk) => { output += chunk.toString() })
    child.stderr.on('data', (chunk) => { output += chunk.toString() })

    const deadline = Date.now() + 10000
    let after = before
    while (Date.now() < deadline && after < before + 1) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      after = readChecks().length
    }

    if (!output.includes('Monitoring checks every 59 minutes')) {
      throw new Error('CRON_CHECK_INTERVAL n\'est pas appliqué par le serveur local')
    }

    if (after >= before + 1) {
      console.log(`✓ Accumulation OK : ${before} seedés -> ${after} après 1 check (pas d'écrasement)`)
      process.exitCode = 0
    } else {
      console.error(`✗ Aucun contrôle ajouté : ${before} seedés -> ${after}.`)
      if (output.trim()) console.error(output.trim())
      process.exitCode = 1
    }
  } catch (error) {
    console.error(`✗ Test KV impossible : ${error.message}`)
    process.exitCode = 1
  } finally {
    child?.kill()
    await new Promise((resolve) => target.close(resolve))

    // Restaure les fichiers d'origine.
    if (hadKv) {
      copyFileSync(BACKUP, KV_FILE)
      rmSync(BACKUP, { force: true })
    } else if (existsSync(KV_FILE)) {
      rmSync(KV_FILE, { force: true })
    }

    if (hadMonitors) {
      copyFileSync(MONITORS_BACKUP, MONITORS_FILE)
      rmSync(MONITORS_BACKUP, { force: true })
    } else if (existsSync(MONITORS_FILE)) {
      rmSync(MONITORS_FILE, { force: true })
    }

    // Nettoie le handshake de port écrit par le dev-server du test.
    const portFile = join(root, '.dev-api-port')
    if (existsSync(portFile)) rmSync(portFile, { force: true })
  }
}

main()
