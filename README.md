# UptimeWorker

**Modern status page monitoring system** powered by Cloudflare Pages + Workers.

[![Deploy to Cloudflare](https://img.shields.io/badge/Deploy-Cloudflare-orange?logo=cloudflare)](https://dash.cloudflare.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vitejs.dev/)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/UptimeWorker/UptimeWorker)

[🌐 Live Demo](https://uptimeworker.net) | [📖 Detailed Documentation](https://deepwiki.com/UptimeWorker/UptimeWorker) | [Version francaise](./README.fr.md) | [Customization Guide](./CUSTOMIZATION.md)

---

## Screenshots

<p align="center">
  <img src=".github/uptimeworker-screen-1.webp" alt="UptimeWorker Dashboard" width="350" style="border-radius: 12px;">
  <img src=".github/uptimeworker-screen-2.webp" alt="UptimeWorker Status Page" width="350" style="border-radius: 12px;">
</p>

---

## Features

- **Real-time monitoring** - Automatic checks every minute (configurable)
- **Visual timeline** - Zoom levels (1h, 24h, 7d, 30d), up to 60 bars for 1h/24h scaled to your check interval so each bar reflects a real check
- **History storage** - 24h granular data + 30 days daily history in KV
- **Flexible HTTP detection** - Status code ranges support (200-299, 301, etc.)
- **Tri-state status** - Operational / Degraded / Down
- **Degraded logic** - A monitor is marked as `Degraded` when the HTTP status is accepted but the response is abnormal (currently Cloudflare challenge detection on HTML/plain-text responses, or response time >= 4000ms)
- **Planned maintenance** - Active maintenance windows with dedicated blue status
- **Secure** - Monitor URLs never exposed to client
- **Multilingual** - EN/FR/UK support with extensible i18n system
- **Responsive** - Mobile/desktop/tablet
- **Customizable** - Logo, title, colors

---

## Architecture

UptimeWorker uses a **two-component architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Pages                         │
│  (Frontend + API)                                           │
│                                                             │
│  • React frontend (status page UI)                          │
│  • /api/monitors/status - Returns KV data to frontend       │
│  • /api/cron/check - Protected endpoint for monitor checks  │
│  • KV binding: KV_STATUS_PAGE                               │
└─────────────────────────────────────────────────────────────┘
                           ▲
                           │ POST /api/cron/check
                           │ Header: X-Cron-Auth
                           │
┌─────────────────────────────────────────────────────────────┐
│                 Cloudflare Worker (Cron)                    │
│  (worker-cron/)                                             │
│                                                             │
│  • Cron trigger every minute                               │
│  • Calls Pages /api/cron/check endpoint                     │
│  • Env vars: SITE_URL, CRON_SECRET                          │
└─────────────────────────────────────────────────────────────┘
```

**Why this architecture?**
- Cloudflare Pages doesn't support cron triggers
- Separate Worker handles scheduled tasks
- Secure communication via shared secret (X-Cron-Auth header)

---

## Quick Start (Local Development)

### 1. Install

```bash
git clone https://github.com/UptimeWorker/UptimeWorker.git
cd UptimeWorker
npm install
```

### 2. Configure

```bash
cp monitors.json.example monitors.json
cp maintenances.json.example maintenances.json
cp .env.example .env
```

Edit `monitors.json`:
```json
[
  {
    "id": "my-website",
    "name": "My Website",
    "url": "https://example.com",
    "method": "GET",
    "acceptedStatusCodes": ["200-299"],
    "followRedirect": true,
    "linkable": true
  }
]
```

Optional monitor behavior:
- `degradedCountsAsDown: true` (default) makes `degraded` lower the uptime percentage
- `degradedCountsAsDown: false` keeps `degraded` inside the uptime percentage for that monitor

Important uptime behavior:
- By default, `degraded` and `down` reduce the uptime percentage
- Set `degradedCountsAsDown: false` only if your uptime policy treats degraded checks as available
- Gray / empty timeline bars are `unknown` / `no data` placeholders and do not reduce uptime
- Uptime is calculated only from real recorded checks, not from periods before monitoring data exists

### 3. Run

```bash
npm run dev:full
```

Open http://localhost:4000

---

## Planned Maintenance

Planned maintenance is configured manually in `maintenances.json`.

How it works:
- The API reads `maintenances.json`
- Only maintenance windows active **right now** are returned to the frontend
- Each active entry shows a blue maintenance banner
- Any monitor listed in `affectedServices` is forced to the `maintenance` status (blue)

Important behavior:
- If the maintenance has not started yet, nothing is displayed
- If the maintenance has already ended, nothing is displayed
- If `affectedServices` contains an unknown monitor id, the banner can still appear, but no monitor card will switch to blue
- Local dev and Cloudflare production use the same maintenance parsing logic, so behavior stays aligned

Recommended format:
- Use `YYYY-MM-DD` for dates
- Use `HH:mm` for times
- Times are interpreted in **UTC**

Example:
```json
[
  {
    "id": "maintenance-api",
    "title": {
      "en": "API maintenance in progress",
      "fr": "Maintenance API en cours",
      "uk": "Технічні роботи API тривають"
    },
    "message": {
      "en": "Planned maintenance is in progress. Some services may be temporarily unavailable.",
      "fr": "Une maintenance planifiee est en cours. Certains services peuvent etre temporairement indisponibles.",
      "uk": "Технічні роботи тривають. Деякі сервіси можуть бути тимчасово недоступні."
    },
    "startDate": "2026-03-01",
    "startHour": "02:00",
    "endDate": "2026-03-01",
    "endHour": "04:00",
    "affectedServices": ["google"]
  }
]
```

Backward compatibility:
- `startTime` / `endTime` in full ISO format are still supported
- `YYYY/MM/DD` is also accepted, but `YYYY-MM-DD` is the recommended format

---

## Production Deployment

### Step 1: Create KV Namespace

In Cloudflare Dashboard:
1. Go to **Workers & Pages > KV**
2. Click **Create a namespace**
3. Name it (e.g., `uptimeworker-status`)

### Step 2: Deploy Pages Project

1. **Connect GitHub repo** to Cloudflare Pages
2. **Build settings:**
   - Build command: `npm run build`
   - Build output directory: `dist`
3. **Environment variables** (Settings > Environment variables):
   - `CRON_SECRET` = your-secret-key (use a strong random string)
   - `VITE_*` variables as needed (see `.env.example`)
4. **KV binding** (Settings > Functions > KV namespace bindings):
   - Variable name: `KV_STATUS_PAGE`
   - KV namespace: select your namespace

### Step 3: Deploy Cron Worker

1. Go to **Workers & Pages > Create > Create Worker**
2. Name it (e.g., `uptimeworker-cron`)
3. **Paste code** from `worker-cron/worker.js`
4. **Environment variables** (Settings > Variables):
   - `SITE_URL` = your Pages URL (e.g., `https://status.example.com`)
   - `CRON_SECRET` = same secret as Pages project
   - `CRON_USER_AGENT` = (optional) custom User-Agent for WAF compatibility
5. **Add Cron Trigger** (Settings > Triggers > Cron):
   - Use **Scheduling** tab, set to **1 minute**
   - Or use expression: `* * * * *`

### Step 4: Verify

1. Wait for next cron execution (max 5 min)
2. Check Worker logs for `scheduled` events
3. Visit your Pages URL - monitors should show data

---

## Customization

Edit 3 files:

1. **`src/config/branding.ts`** - Company name, URLs
2. **`.env`** - Title, logo paths
3. **`public/`** - Your logo files

See [CUSTOMIZATION.md](./CUSTOMIZATION.md) for details.

---

## Internationalization (i18n)

UptimeWorker supports multiple languages with an extensible i18n system.

### Supported Languages

- 🇬🇧 **English** (en)
- 🇫🇷 **French** (fr)
- 🇺🇦 **Ukrainian** (uk)

### Configure Languages

Edit `.env`:
```bash
# Enable specific languages (comma-separated)
VITE_ALLOWED_LANGS="en,fr,uk"

# Or just English and French
VITE_ALLOWED_LANGS="en,fr"
```

### Add a New Language

1. **Create locale file** `src/i18n/locales/XX.ts` (XX = ISO 639-1 code):
```typescript
import { Translations } from '../translations'

export const xx: Translations = {
  statusPage: 'Your Translation',
  // ... copy from en.ts and translate all fields
}
```

2. **Import in** `src/i18n/translations.ts`:
```typescript
import { xx } from './locales/xx'
const ALL_LOCALES = { en, fr, uk, xx }
```

3. **Enable in** `.env`:
```bash
VITE_ALLOWED_LANGS="en,fr,uk,xx"
```

### Language Selector

- **≤2 languages**: Simple toggle button
- **>2 languages**: Dropdown menu with native names

### Popular Languages Available

ISO 639-1 codes for additional translations:
- `es` - Spanish (Español)
- `de` - German (Deutsch)
- `it` - Italian (Italiano)
- `pt` - Portuguese (Português)
- `ja` - Japanese (日本語)
- `zh` - Chinese (中文)
- `ar` - Arabic (العربية)
- `ru` - Russian (Русский)

---

## Project Structure

```
uptimeworker/
├── src/
│   ├── components/       # React components
│   ├── config/          # Branding config
│   ├── data/            # Incidents data
│   └── i18n/            # Translations
├── functions/           # Cloudflare Pages Functions
│   └── api/
│       ├── cron/check.ts    # Protected cron endpoint
│       └── monitors/status.ts
├── worker-cron/         # Separate Cron Worker
│   ├── worker.js        # Cron worker code
│   ├── wrangler.toml    # Worker config
│   └── .env.example
├── public/              # Static assets
├── monitors.json        # Your services (gitignored)
├── monitors.json.example
├── maintenances.json        # Planned maintenance windows (optional)
└── maintenances.json.example
```

---

## Security

- `VITE_*` variables = PUBLIC (exposed to frontend)
- `CRON_SECRET` = PRIVATE (protects /api/cron/check endpoint)
- Monitor URLs in `monitors.json` are never exposed to client
- Cron endpoint requires `X-Cron-Auth` header matching `CRON_SECRET`

### API Protection (Production)

If your status page gets significant public traffic, you may want to protect the `/api/monitors/status` endpoint from external abuse (bots, scripts, scrapers).

Add this protection to `functions/api/monitors/status.ts`:

```typescript
const userAgent = request.headers.get('User-Agent') || ''
const secFetchSite = request.headers.get('Sec-Fetch-Site')
const secFetchMode = request.headers.get('Sec-Fetch-Mode')
const secFetchDest = request.headers.get('Sec-Fetch-Dest')
const accept = request.headers.get('Accept') || ''

// Block external access (curl, scripts, other sites, direct URL navigation)
const hasBrowserHeaders = secFetchSite !== null && secFetchMode !== null
const isSuspiciousUA = /curl|wget|python|httpie|postman|insomnia|axios|node-fetch|got\//i.test(userAgent)
const isNavigating = secFetchMode === 'navigate'
const isDirectNavigation = secFetchDest === 'document' ||
  (isNavigating && accept.includes('text/html')) ||
  (isNavigating && (secFetchDest === 'empty' || !secFetchDest))
const isSameOriginFetch = secFetchSite === 'same-origin' && !isDirectNavigation

if (!hasBrowserHeaders || isSuspiciousUA || !isSameOriginFetch) {
  return new Response(JSON.stringify({ error: 'Access denied' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

**What it blocks:**
- `curl`, `wget`, scripts → No browser headers
- Direct URL in browser → `Sec-Fetch-Dest: document`
- Cross-site requests → `Sec-Fetch-Site: cross-site`

**What it allows:**
- Your frontend `fetch()` → Same-origin XHR requests

---

## Tech Stack

- **Frontend:** React 19, TypeScript 5.8, Vite 6, TailwindCSS
- **Backend:** Cloudflare Pages Functions + Workers
- **Storage:** Cloudflare KV
- **Cron:** Cloudflare Worker Cron Triggers

---

## License

Apache-2.0 - see [LICENSE](LICENSE)

---

## Support

- **Issues:** [GitHub Issues](https://github.com/UptimeWorker/UptimeWorker/issues)
- **Customization:** [CUSTOMIZATION.md](./CUSTOMIZATION.md)
