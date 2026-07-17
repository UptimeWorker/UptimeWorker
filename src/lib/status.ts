export type MonitorStatus = 'operational' | 'maintenance' | 'degraded' | 'down'
export type StatusLike = MonitorStatus | 'unknown'
export interface UptimeOptions {
  degradedCountsAsDown?: boolean
}

const STATUS_PRIORITY: Record<MonitorStatus, number> = {
  operational: 1,
  maintenance: 2,
  degraded: 3,
  down: 4,
}

const DEFAULT_DEGRADED_RESPONSE_TIME_MS = 4000

export function getMonitorStatus(data?: {
  status?: MonitorStatus
  operational?: boolean
}): StatusLike {
  if (!data) {
    return 'unknown'
  }

  if (data.status) {
    return data.status
  }

  return data.operational ? 'operational' : 'down'
}

export function getWorstStatus(current: MonitorStatus, next: MonitorStatus): MonitorStatus {
  return STATUS_PRIORITY[next] > STATUS_PRIORITY[current] ? next : current
}

export function getOverallStatus(statuses: MonitorStatus[]): StatusLike {
  if (statuses.length === 0) {
    return 'unknown'
  }

  if (statuses.some((status) => status === 'down')) {
    return 'down'
  }

  if (statuses.some((status) => status === 'degraded')) {
    return 'degraded'
  }

  if (statuses.some((status) => status === 'maintenance')) {
    return 'maintenance'
  }

  return 'operational'
}

export function isStatusAvailable(status: StatusLike, options: UptimeOptions = {}): boolean {
  if (status === 'degraded') {
    const degradedCountsAsDown = options.degradedCountsAsDown ?? true
    return !degradedCountsAsDown
  }

  return status === 'operational' || status === 'maintenance'
}

export function calculateUptime(
  statuses: MonitorStatus[],
  fallbackStatus: StatusLike = 'unknown',
  options: UptimeOptions = {},
): number {
  if (statuses.length === 0) {
    return isStatusAvailable(fallbackStatus, options) ? 100 : 0
  }

  const availableChecks = statuses.filter((status) => isStatusAvailable(status, options)).length
  return (availableChecks / statuses.length) * 100
}

export function isCloudflareChallengeResponse(bodyText: string): boolean {
  const normalizedBody = bodyText.toLowerCase()

  return (
    normalizedBody.includes('checking your browser') ||
    normalizedBody.includes('cf-challenge') ||
    normalizedBody.includes('cf-turnstile') ||
    (normalizedBody.includes('just a moment') && normalizedBody.includes('cloudflare')) ||
    (normalizedBody.includes('ray_id') && normalizedBody.includes('cloudflare'))
  )
}

// Only statuses that may legitimately carry a challenge body are inspected.
// Rate limits and origin errors must never be promoted to an available status.
const CLOUDFLARE_CHALLENGE_STATUS_CODES = new Set([403, 503])

export function isCloudflareChallengeStatus(status: number): boolean {
  return CLOUDFLARE_CHALLENGE_STATUS_CODES.has(status)
}

type HeaderLike = Headers | Record<string, string | undefined> | null

function readHeader(headers: HeaderLike, name: string): string | null {
  if (!headers) return null
  if (typeof (headers as Headers).get === 'function') {
    return (headers as Headers).get(name)
  }
  const obj = headers as Record<string, string | undefined>
  return obj[name] ?? obj[name.toLowerCase()] ?? null
}

// Only Cloudflare's explicit mitigation marker is authoritative. Generic
// server/cf-ray headers merely prove transit through Cloudflare, not a challenge.
export function hasCloudflareChallengeHeaders(headers: HeaderLike): boolean {
  const cfMitigated = readHeader(headers, 'cf-mitigated')
  return !!(cfMitigated && cfMitigated.toLowerCase().includes('challenge'))
}

export function hasCloudflareTransitHeaders(headers: HeaderLike): boolean {
  const cfRay = readHeader(headers, 'cf-ray')
  const server = readHeader(headers, 'server')
  return !!(cfRay && server?.toLowerCase().includes('cloudflare'))
}

export function classifyMonitorStatus({
  accepted,
  responseTime,
  bodyText,
  cfChallenge = false,
  acceptChallenge = false,
  degradedResponseTimeMs = DEFAULT_DEGRADED_RESPONSE_TIME_MS,
}: {
  accepted: boolean
  responseTime: number
  bodyText?: string
  cfChallenge?: boolean
  acceptChallenge?: boolean
  degradedResponseTimeMs?: number
}): MonitorStatus {
  // Un challenge CF est détecté soit par marqueur explicite (status code + headers),
  // soit par signature dans le body. On le traite AVANT le check `!accepted` car
  // un managed challenge moderne renvoie 403 (donc accepted=false sans cette logique).
  const challengeDetected = cfChallenge || (bodyText ? isCloudflareChallengeResponse(bodyText) : false)

  if (challengeDetected) {
    // acceptChallenge=true : le service est protégé par CF et un challenge = vivant.
    // sinon : on signale visuellement (orange) sans casser l'alerte rouge.
    return acceptChallenge ? 'operational' : 'degraded'
  }

  if (!accepted) {
    return 'down'
  }

  if (responseTime >= degradedResponseTimeMs) {
    return 'degraded'
  }

  return 'operational'
}
