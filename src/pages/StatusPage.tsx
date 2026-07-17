import { useState, useEffect, useCallback, useRef } from 'react'
import { monitors } from '../data/monitors'
import { getActiveIncidents } from '../data/incidents'
import { getRefreshInterval } from '../config/env'
import MonitorStatusHeader from '../components/MonitorStatusHeader'
import MonitorStatusHeaderSkeleton from '../components/MonitorStatusHeaderSkeleton'
import MonitorCard from '../components/MonitorCard'
import MonitorCardSkeleton from '../components/MonitorCardSkeleton'
import Incident from '../components/Incident'
import MaintenanceNotice, { MaintenanceData } from '../components/MaintenanceNotice'
import Footer from '../components/Footer'
import Header from '../components/Header'
import { Language, detectLanguage, getTranslations } from '../i18n/translations'
import { getMonitorStatus, getOverallStatus, type MonitorStatus } from '../lib/status'
import { normalizeMonitorCollection } from '../lib/monitorData'

interface RecentCheck {
  t: string // timestamp ISO
  s: MonitorStatus // status
  rt?: number // response time (ms), optionnel
}

interface DailyHistoryPoint {
  date: string // YYYY-MM-DD
  status: MonitorStatus
}

interface MonitorData {
  operational: boolean
  status?: MonitorStatus
  degraded?: boolean
  lastCheck: string
  responseTime?: number
  uptime?: number
  startDate?: string
  recentChecks?: RecentCheck[] // Last 24h of checks (for 1h/24h filters)
  dailyHistory?: DailyHistoryPoint[] // Daily history from KV (max 30 days)
}

interface KVMonitors {
  [key: string]: MonitorData
}

export default function StatusPage() {
  const [kvMonitors, setKvMonitors] = useState<KVMonitors>({})
  const [activeMaintenances, setActiveMaintenances] = useState<MaintenanceData[]>([])
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [checkIntervalMinutes, setCheckIntervalMinutes] = useState<number>(1)
  const [loading, setLoading] = useState(true)
  const [language, setLanguage] = useState<Language>('en')

  const t = getTranslations(language)

  // Ref miroir de lastUpdate pour le check de fraîcheur dans le handler visibilitychange
  // (évite une closure périmée sans re-attacher le listener à chaque update).
  const lastUpdateRef = useRef('')
  useEffect(() => {
    lastUpdateRef.current = lastUpdate
  }, [lastUpdate])

  useEffect(() => {
    // Detect language on mount
    const detectedLang = detectLanguage()
    setLanguage(detectedLang)
  }, [])

  const fetchStatus = useCallback(async () => {
    const startTime = Date.now()

    try {
      const response = await fetch('/api/monitors/status')
      if (response.ok) {
        const data = await response.json()

        // Minimum loading time to prevent flash (300ms)
        const elapsed = Date.now() - startTime
        const minDelay = 300

        if (elapsed < minDelay) {
          await new Promise(resolve => setTimeout(resolve, minDelay - elapsed))
        }

        setKvMonitors(normalizeMonitorCollection(data.monitors))
        setActiveMaintenances(data.maintenances || [])
        setLastUpdate(data.lastUpdate || new Date().toISOString())
        setCheckIntervalMinutes(data.checkIntervalMinutes || 1)
      }
    } catch (error) {
      console.error('Failed to fetch monitor status:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    // Refresh interval from env (default: 60 seconds)
    const refreshInterval = getRefreshInterval()
    const interval = setInterval(fetchStatus, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchStatus])

  // Auto-refresh au retour sur l'onglet si la donnée est périmée (> 1 min).
  // Les onglets en arrière-plan throttlent setInterval : au refocus, la donnée
  // peut être très ancienne. On refetch immédiatement (SPA-friendly, pas de reload
  // d'assets) au lieu d'attendre le prochain tick.
  useEffect(() => {
    const STALE_MS = 60 * 1000
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      const last = lastUpdateRef.current
      if (!last || Date.now() - new Date(last).getTime() > STALE_MS) {
        fetchStatus()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [fetchStatus])

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang)
    localStorage.setItem('language', newLang)
  }

  const monitorsInMaintenance = new Set(activeMaintenances.flatMap((maintenance) => maintenance.affectedServices))
  const fallbackTimestamp = lastUpdate || new Date().toISOString()

  const getDisplayMonitorData = (monitorId: string): MonitorData | undefined => {
    const monitorData = kvMonitors[monitorId]

    if (!monitorsInMaintenance.has(monitorId)) {
      return monitorData
    }

    return {
      ...(monitorData || {}),
      operational: false,
      status: 'maintenance',
      lastCheck: monitorData?.lastCheck || fallbackTimestamp,
    }
  }

  const knownStatuses = monitors
    .map((monitor) => getMonitorStatus(getDisplayMonitorData(monitor.id)))
    .filter((status): status is MonitorStatus => status !== 'unknown')

  const overallStatus = getOverallStatus(knownStatuses)
  const activeIncidents = getActiveIncidents()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <Header language={language} onLanguageChange={handleLanguageChange} />

      {/* Main Content */}
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
          {/* Status Header */}
          <div className="mb-8">
            {loading ? (
              <MonitorStatusHeaderSkeleton />
            ) : (
              <MonitorStatusHeader
                overallStatus={overallStatus}
                lastUpdate={lastUpdate}
                language={language}
              />
            )}
          </div>

          {/* Active Incidents */}
          {!loading && activeMaintenances.length > 0 && (
            <div className="mb-8 space-y-4">
              {activeMaintenances.map((maintenance) => (
                <MaintenanceNotice key={maintenance.id} maintenance={maintenance} language={language} />
              ))}
            </div>
          )}

          {!loading && activeIncidents.length > 0 && (
            <div className="mb-8 space-y-4">
              {activeIncidents.map((incident) => (
                <Incident key={incident.id} incident={incident} language={language} />
              ))}
            </div>
          )}

          {/* Uptime Section */}
          <div className="mb-8">
            <h2 className="mb-5 text-lg font-semibold text-foreground sm:text-xl">
              {t.uptimeTitle}
            </h2>

            {/* Monitors List */}
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              {loading ? (
                <>
                  {monitors.map((monitor) => (
                    <MonitorCardSkeleton key={monitor.id} />
                  ))}
                </>
              ) : (
                <>
                  {monitors.map((monitor) => (
                    <MonitorCard
                      key={monitor.id}
                      monitor={monitor}
                      data={getDisplayMonitorData(monitor.id)}
                      language={language}
                      checkIntervalMinutes={checkIntervalMinutes}
                    />
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-8 border-t border-border pt-6 sm:mt-10">
            <h3 className="mb-2 text-base font-semibold text-foreground">
              {t.aboutTitle}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {language === 'en'
                ? 'For more information, documentation and contributions, visit the public repo: '
                : 'Pour plus d\'informations, documentation et contributions, visitez le repo public : '}
              <a
                href="https://github.com/UptimeWorker/UptimeWorker"
                className="text-foreground hover:underline font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                github.com/UptimeWorker/UptimeWorker
              </a>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer language={language} />
    </div>
  )
}
