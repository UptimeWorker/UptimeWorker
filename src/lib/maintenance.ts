export interface MaintenanceWindow {
  startTime?: string
  endTime?: string
  startDate?: string
  startHour?: string
  endDate?: string
  endHour?: string
}

function parseDatePart(value: string): { year: number; month: number; day: number } | null {
  const match = value.trim().match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/)

  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null
  }

  return { year, month, day }
}

function parseHourPart(value: string): { hour: number; minute: number } | null {
  const match = value.trim().match(/^(\d{2}):(\d{2})$/)

  if (!match) {
    return null
  }

  const hour = Number(match[1])
  const minute = Number(match[2])

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null
  }

  return { hour, minute }
}

export function getMaintenanceTimestamp(
  maintenance: MaintenanceWindow,
  mode: 'start' | 'end'
): number | null {
  const timeKey = mode === 'start' ? 'startTime' : 'endTime'
  const dateKey = mode === 'start' ? 'startDate' : 'endDate'
  const hourKey = mode === 'start' ? 'startHour' : 'endHour'

  const isoValue = maintenance[timeKey]
  if (isoValue) {
    const timestamp = new Date(isoValue).getTime()
    return Number.isNaN(timestamp) ? null : timestamp
  }

  const dateValue = maintenance[dateKey]
  if (!dateValue) {
    return null
  }

  const parsedDate = parseDatePart(dateValue)
  if (!parsedDate) {
    return null
  }

  const defaultHour = mode === 'start' ? '00:00' : '23:59'
  const parsedHour = parseHourPart(maintenance[hourKey] || defaultHour)
  if (!parsedHour) {
    return null
  }

  return Date.UTC(
    parsedDate.year,
    parsedDate.month - 1,
    parsedDate.day,
    parsedHour.hour,
    parsedHour.minute
  )
}

export function getMaintenanceDate(
  maintenance: MaintenanceWindow,
  mode: 'start' | 'end'
): Date | null {
  const timestamp = getMaintenanceTimestamp(maintenance, mode)
  return timestamp === null ? null : new Date(timestamp)
}

export function isMaintenanceActive(maintenance: MaintenanceWindow, now = Date.now()): boolean {
  const startTime = getMaintenanceTimestamp(maintenance, 'start')
  const endTime = getMaintenanceTimestamp(maintenance, 'end')

  if (startTime === null || now < startTime) {
    return false
  }

  if (endTime !== null && now > endTime) {
    return false
  }

  return true
}
