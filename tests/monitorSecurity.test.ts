import assert from 'node:assert/strict'
import test from 'node:test'
import {
  fetchMonitorSafely,
  isSafeMonitorUrl,
  parseCheckInterval,
  readResponseTextPrefix,
} from '../src/lib/monitorRequest'
import {
  classifyMonitorStatus,
  hasCloudflareChallengeHeaders,
  hasCloudflareTransitHeaders,
  isCloudflareChallengeStatus,
} from '../src/lib/status'

test('only an explicit Cloudflare mitigation header is trusted as a challenge', () => {
  assert.equal(hasCloudflareChallengeHeaders({ server: 'cloudflare', 'cf-ray': 'abc' }), false)
  assert.equal(hasCloudflareTransitHeaders({ server: 'cloudflare', 'cf-ray': 'abc' }), true)
  assert.equal(hasCloudflareChallengeHeaders({ 'cf-mitigated': 'challenge' }), true)
  assert.equal(isCloudflareChallengeStatus(429), false)
  assert.equal(isCloudflareChallengeStatus(503), true)
})

test('generic Cloudflare origin errors stay down', () => {
  const status = classifyMonitorStatus({
    accepted: false,
    responseTime: 100,
    cfChallenge: hasCloudflareChallengeHeaders({ server: 'cloudflare', 'cf-ray': 'abc' }),
    acceptChallenge: true,
  })

  assert.equal(status, 'down')
})

test('a generic just-a-moment error body is not trusted as a challenge', () => {
  const status = classifyMonitorStatus({
    accepted: false,
    responseTime: 100,
    bodyText: 'Just a moment while the upstream service recovers.',
    acceptChallenge: true,
  })

  assert.equal(status, 'down')
})

test('explicit Cloudflare challenges can still be accepted', () => {
  const status = classifyMonitorStatus({
    accepted: false,
    responseTime: 100,
    cfChallenge: hasCloudflareChallengeHeaders({ 'cf-mitigated': 'challenge' }),
    acceptChallenge: true,
  })

  assert.equal(status, 'operational')
})

test('monitor URL validation blocks local and private destinations', () => {
  const blocked = [
    'http://localhost/',
    'http://127.0.0.1/',
    'http://10.0.0.1/',
    'http://169.254.169.254/',
    'http://[::1]/',
    'http://[fe80::1]/',
    'http://[::ffff:127.0.0.1]/',
    'https://user:password@example.com/',
  ]

  for (const url of blocked) assert.equal(isSafeMonitorUrl(url), false, url)
  assert.equal(isSafeMonitorUrl('https://example.com/health'), true)
  assert.equal(isSafeMonitorUrl('https://[2606:4700:4700::1111]/'), true)
})

test('redirect targets are validated before they are fetched', async () => {
  const requested: string[] = []
  const fetchImpl = async (url: string | URL | Request) => {
    requested.push(String(url))
    return new Response(null, { status: 302, headers: { location: 'https://127.0.0.1/admin' } })
  }

  await assert.rejects(
    fetchMonitorSafely('https://example.com/', {
      method: 'GET',
      followRedirect: true,
      fetchImpl: fetchImpl as typeof fetch,
    }),
    /Unsafe monitor redirect/,
  )
  assert.deepEqual(requested, ['https://example.com/'])
})

test('HTTPS monitor redirects cannot downgrade to HTTP', async () => {
  const fetchImpl = async () => new Response(null, {
    status: 302,
    headers: { location: 'http://example.com/health' },
  })

  await assert.rejects(
    fetchMonitorSafely('https://example.com/', {
      method: 'GET',
      followRedirect: true,
      fetchImpl: fetchImpl as typeof fetch,
    }),
    /redirect downgrade blocked/,
  )
})

test('response inspection is capped to a bounded prefix', async () => {
  const body = 'x'.repeat(100_000)
  const prefix = await readResponseTextPrefix(new Response(body), 1024)
  assert.equal(prefix.length, 1024)
})

test('check interval accepts only bounded positive integers', () => {
  assert.equal(parseCheckInterval('5'), 5)
  assert.equal(parseCheckInterval(undefined, 1), 1)
  assert.equal(parseCheckInterval('0'), undefined)
  assert.equal(parseCheckInterval('-1'), undefined)
  assert.equal(parseCheckInterval('1.5'), undefined)
  assert.equal(parseCheckInterval('invalid'), undefined)
})
