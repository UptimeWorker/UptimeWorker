export const onRequest: PagesFunction = async (context) => {
  const response = await context.next()

  // Add security headers
  const headers = new Headers(response.headers)
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()')

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
