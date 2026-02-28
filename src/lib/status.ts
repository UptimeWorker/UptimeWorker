export type MonitorStatus = 'operational' | 'degraded' | 'down'
export type StatusLike = MonitorStatus | 'unknown'

const STATUS_PRIORITY: Record<MonitorStatus, number> = {
  operational: 1,
  degraded: 2,
  down: 3,
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

  return 'operational'
}

export function isStatusAvailable(status: StatusLike): boolean {
  return status === 'operational' || status === 'degraded'
}

export function calculateUptime(statuses: MonitorStatus[], fallbackStatus: StatusLike = 'unknown'): number {
  if (statuses.length === 0) {
    return isStatusAvailable(fallbackStatus) ? 100 : 0
  }

  const availableChecks = statuses.filter((status) => isStatusAvailable(status)).length
  return (availableChecks / statuses.length) * 100
}

export function isCloudflareChallengeResponse(bodyText: string): boolean {
  const normalizedBody = bodyText.toLowerCase()

  return (
    normalizedBody.includes('checking your browser') ||
    normalizedBody.includes('just a moment') ||
    normalizedBody.includes('cf-challenge') ||
    (normalizedBody.includes('ray_id') && normalizedBody.includes('cloudflare'))
  )
}

export function classifyMonitorStatus({
  accepted,
  responseTime,
  bodyText,
  degradedResponseTimeMs = DEFAULT_DEGRADED_RESPONSE_TIME_MS,
}: {
  accepted: boolean
  responseTime: number
  bodyText?: string
  degradedResponseTimeMs?: number
}): MonitorStatus {
  if (!accepted) {
    return 'down'
  }

  if (bodyText && isCloudflareChallengeResponse(bodyText)) {
    return 'degraded'
  }

  if (responseTime >= degradedResponseTimeMs) {
    return 'degraded'
  }

  return 'operational'
}
