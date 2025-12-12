# UptimeWorker

**Modern status page monitoring system** powered by Cloudflare Pages + Workers.

[![Deploy to Cloudflare](https://img.shields.io/badge/Deploy-Cloudflare-orange?logo=cloudflare)](https://dash.cloudflare.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vitejs.dev/)

[Version francaise](./README.fr.md) | [Customization Guide](./CUSTOMIZATION.md)

---

## Features

- **Real-time monitoring** - Automatic checks every 5 minutes (configurable)
- **Visual timeline** - 60 bars with zoom levels (1h, 24h, 7d, 30d)
- **History storage** - 24h granular data + 30 days daily history in KV
- **Flexible HTTP detection** - Status code ranges support (200-299, 301, etc.)
- **Tri-state status** - Operational / Degraded / Down
- **Secure** - Monitor URLs never exposed to client
- **Multilingual** - EN/FR support
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
│  • Cron trigger every 5 minutes                             │
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
git clone https://github.com/slymb/UptimeWorker.git
cd UptimeWorker
npm install
```

### 2. Configure

```bash
cp monitors.json.example monitors.json
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

### 3. Run

```bash
npm run dev:full
```

Open http://localhost:3000

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
   - Use **Scheduling** tab, set to **5 minutes**
   - Or use expression: `*/5 * * * *`

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
└── monitors.json.example
```

---

## Security

- `VITE_*` variables = PUBLIC (exposed to frontend)
- `CRON_SECRET` = PRIVATE (protects /api/cron/check endpoint)
- Monitor URLs in `monitors.json` are never exposed to client
- Cron endpoint requires `X-Cron-Auth` header matching `CRON_SECRET`

---

## Tech Stack

- **Frontend:** React 19, TypeScript 5.8, Vite 6, TailwindCSS
- **Backend:** Cloudflare Pages Functions + Workers
- **Storage:** Cloudflare KV
- **Cron:** Cloudflare Worker Cron Triggers

---

## License

MIT License - see [LICENSE](LICENSE)

---

## Support

- **Issues:** [GitHub Issues](https://github.com/slymb/UptimeWorker/issues)
- **Customization:** [CUSTOMIZATION.md](./CUSTOMIZATION.md)
