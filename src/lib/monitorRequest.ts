const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])

export const MAX_MONITOR_REDIRECTS = 5
export const MAX_MONITOR_BODY_BYTES = 64 * 1024

function isPrivateIpv4(host: string): boolean {
  const parts = host.split('.')
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return false

  const octets = parts.map(Number)
  if (octets.some((octet) => octet < 0 || octet > 255)) return true

  const [a, b] = octets
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  )
}

function isPrivateIpv6(host: string): boolean {
  if (!host.includes(':')) return false

  const normalized = host.replace(/^\[|\]$/g, '').toLowerCase()
  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('::ffff:') ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith('ff')
  )
}

export function isSafeMonitorUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
    if (url.username || url.password) return false

    const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
    if (!host) return false
    if (host === 'localhost' || host.endsWith('.localhost')) return false
    if (host.endsWith('.local') || host.endsWith('.internal')) return false
    if (isPrivateIpv4(host) || isPrivateIpv6(host)) return false

    return true
  } catch {
    return false
  }
}

interface SafeFetchOptions {
  method: string
  headers?: HeadersInit
  followRedirect: boolean
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

export async function fetchMonitorSafely(rawUrl: string, {
  method,
  headers,
  followRedirect,
  timeoutMs = 10_000,
  fetchImpl = fetch,
}: SafeFetchOptions): Promise<Response> {
  let currentUrl = new URL(rawUrl)
  const signal = AbortSignal.timeout(timeoutMs)

  for (let redirectCount = 0; redirectCount <= MAX_MONITOR_REDIRECTS; redirectCount++) {
    if (!isSafeMonitorUrl(currentUrl.toString())) {
      throw new Error('Unsafe monitor URL')
    }

    const response = await fetchImpl(currentUrl.toString(), {
      method,
      headers,
      redirect: 'manual',
      signal,
    })

    if (!followRedirect || !REDIRECT_STATUSES.has(response.status)) return response

    const location = response.headers.get('location')
    if (!location) return response
    if (redirectCount === MAX_MONITOR_REDIRECTS) throw new Error('Too many monitor redirects')

    const nextUrl = new URL(location, currentUrl)
    if (currentUrl.protocol === 'https:' && nextUrl.protocol !== 'https:') {
      throw new Error('Monitor redirect downgrade blocked')
    }
    if (!isSafeMonitorUrl(nextUrl.toString())) throw new Error('Unsafe monitor redirect')
    currentUrl = nextUrl
  }

  throw new Error('Too many monitor redirects')
}

export async function readResponseTextPrefix(
  response: Response,
  maxBytes = MAX_MONITOR_BODY_BYTES,
): Promise<string> {
  if (!response.body || maxBytes <= 0) return ''

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0
  let finished = false

  try {
    while (totalBytes < maxBytes) {
      const { done, value } = await reader.read()
      if (done) {
        finished = true
        break
      }
      if (!value) continue

      const remaining = maxBytes - totalBytes
      const chunk = value.byteLength > remaining ? value.subarray(0, remaining) : value
      chunks.push(chunk)
      totalBytes += chunk.byteLength
    }
  } finally {
    if (!finished) {
      try {
        await reader.cancel()
      } catch {
        // The response may already be closed by the runtime.
      }
    }
  }

  const merged = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(merged)
}

export function parseCheckInterval(value: string | undefined, fallback = 1): number | undefined {
  const rawValue = value === undefined || value.trim() === '' ? String(fallback) : value
  const parsed = Number(rawValue)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 1440 ? parsed : undefined
}

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let nextIndex = 0

  const workers = Array.from(
    { length: Math.min(Math.max(1, concurrency), items.length) },
    async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++
        results[index] = await mapper(items[index], index)
      }
    },
  )

  await Promise.all(workers)
  return results
}
