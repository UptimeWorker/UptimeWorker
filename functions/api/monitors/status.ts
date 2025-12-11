interface Env {
  KV_STATUS_PAGE: KVNamespace
}

export const onRequest: PagesFunction<Env> = async (context) => {
  try {
    const { KV_STATUS_PAGE } = context.env

    // Get all monitor data from KV
    const monitorsData = await KV_STATUS_PAGE.get('monitors', { type: 'json' })
    const lastUpdate = await KV_STATUS_PAGE.get('lastUpdate')

    return new Response(
      JSON.stringify({
        monitors: monitorsData || {},
        lastUpdate: lastUpdate || new Date().toISOString(),
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=5',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching monitor status:', error)
    return new Response(
      JSON.stringify({
        monitors: {},
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
