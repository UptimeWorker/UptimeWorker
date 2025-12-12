addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

addEventListener('scheduled', event => {
  event.waitUntil(handleScheduled())
})

async function handleRequest(request) {
  const authToken = request.headers.get('X-Cron-Auth')

  if (!authToken || authToken !== CRON_SECRET) {
    return new Response('Access denied', { status: 401 })
  }

  return new Response('OK', { status: 200 })
}

async function handleScheduled() {
  if (typeof SITE_URL === 'undefined' || typeof CRON_SECRET === 'undefined') {
    return
  }

  const userAgent = typeof CRON_USER_AGENT !== 'undefined' ? CRON_USER_AGENT : 'UptimeWorker-Cron/1.0'

  await fetch(`${SITE_URL}/api/cron/check`, {
    method: 'POST',
    headers: {
      'X-Cron-Auth': CRON_SECRET,
      'User-Agent': userAgent
    }
  })
}
