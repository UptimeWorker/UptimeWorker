import { useState, useEffect } from 'react'
import { monitors } from '../data/monitors'
import { getActiveIncidents } from '../data/incidents'
import { getRefreshInterval } from '../config/env'
import MonitorStatusHeader from '../components/MonitorStatusHeader'
import MonitorStatusHeaderSkeleton from '../components/MonitorStatusHeaderSkeleton'
import MonitorCard from '../components/MonitorCard'
import MonitorCardSkeleton from '../components/MonitorCardSkeleton'
import Incident from '../components/Incident'
import Footer from '../components/Footer'
import Header from '../components/Header'
import { Language, detectLanguage, getTranslations } from '../i18n/translations'
import { getMonitorStatus, getOverallStatus, type MonitorStatus } from '../lib/status'

interface RecentCheck {
  t: string // timestamp ISO
  s: MonitorStatus // status
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

type TimelinePeriod = '1h' | '24h' | '7d' | '30d'

export default function StatusPage() {
  const [kvMonitors, setKvMonitors] = useState<KVMonitors>({})
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [language, setLanguage] = useState<Language>(detectLanguage)
  const [period, setPeriod] = useState<TimelinePeriod>('1h')

  const t = getTranslations(language)

  useEffect(() => {
    // Fetch monitor status from API
    const fetchStatus = async () => {
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

          setKvMonitors(data.monitors || {})
          setLastUpdate(data.lastUpdate || new Date().toISOString())
        }
      } catch (error) {
        console.error('Failed to fetch monitor status:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
    // Refresh interval from env (default: 60 seconds)
    const refreshInterval = getRefreshInterval()
    const interval = setInterval(fetchStatus, refreshInterval)
    return () => clearInterval(interval)
  }, [])

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang)
    localStorage.setItem('language', newLang)
  }

  const knownStatuses = Object.values(kvMonitors)
    .map((monitor) => getMonitorStatus(monitor))
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
          {!loading && activeIncidents.length > 0 && (
            <div className="mb-8 space-y-4">
              {activeIncidents.map((incident) => (
                <Incident key={incident.id} incident={incident} language={language} />
              ))}
            </div>
          )}

          {/* Uptime Section */}
          <div className="mb-8">
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-6">
              {t.uptimeTitle}{' '}
              <span className="text-muted-foreground font-normal text-base sm:text-lg">
                {period === '1h' && t.lastHour}
                {period === '24h' && t.last24Hours}
                {period === '7d' && t.last7Days}
                {period === '30d' && t.last30Days}
              </span>
            </h2>

            {/* Monitors List */}
            <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
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
                      data={kvMonitors[monitor.id]}
                      language={language}
                      period={period}
                      onPeriodChange={setPeriod}
                    />
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-8 sm:mt-12 p-4 sm:p-6 bg-muted/30 rounded-lg border border-border">
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
              {t.aboutTitle}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t.aboutDescription}{' '}
              <a
                href={`https://${t.visitWebsite}`}
                className="text-foreground hover:underline font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.visitWebsite}
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
