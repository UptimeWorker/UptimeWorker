import { getSettings } from '../config/env'

export interface Monitor {
  id: string
  name: string
  description?: string
  url: string
  method?: string
  acceptedStatusCodes?: string[] // e.g. ["200-299", "301", "302"] or ["200", "204"]
  expectStatus?: number // Deprecated: use acceptedStatusCodes instead
  followRedirect?: boolean
  linkable?: boolean
  acceptCloudflareChallenge?: boolean // If true, Cloudflare challenges are considered operational
  degradedCountsAsDown?: boolean // Default true. Set false to keep degraded checks inside uptime
  tooltip?: string // Optional hover tooltip shown on the monitor name
  statusPageLink?: string // Optional external link (e.g. the monitored service's own page)
}

export interface Settings {
  title: string
  url: string
  logo: string
  daysInHistogram: number
  collectResponseTimes: boolean
  allmonitorsOperational: string
  notAllmonitorsOperational: string
  monitorLabelOperational: string
  monitorLabelNotOperational: string
  monitorLabelNoData: string
  dayInHistogramNoData: string
  dayInHistogramOperational: string
  dayInHistogramNotOperational: string
}

// Settings now loaded from environment variables (see .env.example)
export const settings: Settings = getSettings()

// Monitors are loaded from monitors.json at the project root
// Edit monitors.json to add/remove/reorder monitored services
// The order in the JSON file determines the display order
import monitorsData from '../../monitors.json'

export const monitors: Monitor[] = monitorsData as Monitor[]
