import maintenancesConfig from '../../../maintenances.json'
import { isMaintenanceActive, type MaintenanceWindow } from '../../../src/lib/maintenance'

interface KVNamespaceLike {
  get(key: string, options?: { type?: string }): Promise<any>
}

// @ts-ignore - Cloudflare types available in production
interface Env {
  KV_STATUS_PAGE: KVNamespaceLike
}

interface MaintenanceRecord extends MaintenanceWindow {
  id: string
  title: string | { en: string; fr?: string; uk?: string }
  message: string | { en: string; fr?: string; uk?: string }
  affectedServices: string[]
}

const maintenances: MaintenanceRecord[] = maintenancesConfig as MaintenanceRecord[]

// @ts-ignore - Cloudflare types available in production
export const onRequest: PagesFunction<Env> = async (context) => {
  const request = context.request
  const url = new URL(request.url)
  const userAgent = request.headers.get('User-Agent') || ''
  const origin = request.headers.get('Origin')
  const referer = request.headers.get('Referer')
  const secFetchSite = request.headers.get('Sec-Fetch-Site')
  const secFetchMode = request.headers.get('Sec-Fetch-Mode')
  const secFetchDest = request.headers.get('Sec-Fetch-Dest')
  const accept = request.headers.get('Accept') || ''

  const isSuspiciousUA = /curl|wget|python|httpie|postman|insomnia|axios|node-fetch|got\/|scrapy|selenium|phantomjs|headless/i.test(userAgent)
  if (isSuspiciousUA) {
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/404',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    })
  }

  const hasBrowserHeaders = secFetchSite !== null && secFetchMode !== null
  if (!hasBrowserHeaders) {
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/404',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    })
  }

  const isNavigating = secFetchMode === 'navigate'
  const isDirectNavigation = secFetchDest === 'document' ||
    (isNavigating && accept.includes('text/html')) ||
    (isNavigating && (secFetchDest === 'empty' || !secFetchDest))

  if (isDirectNavigation) {
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/404',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    })
  }

  if (secFetchSite !== 'same-origin') {
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/404',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    })
  }

  const allowedOrigin = url.origin
  if (origin && origin !== allowedOrigin) {
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/404',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    })
  }
  if (referer && !referer.startsWith(allowedOrigin)) {
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/404',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    })
  }

  if (request.method !== 'GET') {
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/404',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    })
  }

  try {
    const { KV_STATUS_PAGE } = context.env

    const monitorsData = await KV_STATUS_PAGE.get('monitors', { type: 'json' })
    const lastUpdate = await KV_STATUS_PAGE.get('lastUpdate')
    const activeMaintenances = maintenances.filter((maintenance) => isMaintenanceActive(maintenance))

    return new Response(
      JSON.stringify({
        monitors: monitorsData || {},
        maintenances: activeMaintenances,
        lastUpdate: lastUpdate || new Date().toISOString(),
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=5',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching monitor status:', error)
    return new Response(
      JSON.stringify({
        monitors: {},
        maintenances: [],
        lastUpdate: new Date().toISOString(),
        error: 'Failed to fetch monitor status',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
