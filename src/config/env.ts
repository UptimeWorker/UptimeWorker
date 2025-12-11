import { Settings } from '../data/monitors'

// Get settings from environment or defaults
export function getSettings(): Settings {
  return {
    title: import.meta.env.VITE_STATUS_TITLE || 'UptimeWorker',
    url: 'https://status.example.com', // Not from VITE_ (backend only)
    logo: import.meta.env.VITE_STATUS_LOGO || '/logo.webp',
    daysInHistogram: parseInt(import.meta.env.VITE_HISTORY_DAYS) || 90,
    collectResponseTimes: true,
    allmonitorsOperational: 'All Systems Operational',
    notAllmonitorsOperational: 'Not All Systems Operational',
    monitorLabelOperational: 'Operational',
    monitorLabelNotOperational: 'Not Operational',
    monitorLabelNoData: 'No data',
    dayInHistogramNoData: 'No data',
    dayInHistogramOperational: 'All good',
    dayInHistogramNotOperational: ' incident(s)',
  }
}

// Get refresh interval from env
export function getRefreshInterval(): number {
  const interval = import.meta.env.VITE_REFRESH_INTERVAL
  return interval ? parseInt(interval) * 1000 : 60000 // Convert seconds to ms, default 60s
}
