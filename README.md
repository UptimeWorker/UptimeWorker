# UptimeWorker

**Modern status page monitoring system** powered by Cloudflare Workers, Pages, and KV.

[![Deploy to Cloudflare](https://img.shields.io/badge/Deploy-Cloudflare-orange?logo=cloudflare)](https://dash.cloudflare.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vitejs.dev/)

[Version francaise](./README.fr.md) | [Customization Guide](./CUSTOMIZATION.md)

---

## Features

- **Real-time monitoring** - Automatic checks every 5 minutes
- **Visual timeline** - 90 bars with zoom levels (1h, 24h, 3d, 7d, 30d)
- **Flexible HTTP detection** - Status code ranges support (200-299, 301, etc.)
- **Tri-state status** - Operational / Degraded / Down
- **Secure** - Monitor URLs never exposed to client
- **Multilingual** - EN/FR support
- **Responsive** - Mobile/desktop/tablet
- **Customizable** - Logo, title, colors

---

## Quick Start

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

## Deployment

### Cloudflare Pages

1. Create KV namespace:
```bash
wrangler kv:namespace create KV_STATUS_PAGE
```

2. Build and deploy:
```bash
npm run build
npm run deploy
```

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
├── functions/           # Cloudflare Workers
├── public/              # Static assets
├── monitors.json        # Your services (gitignored)
└── monitors.json.example
```

---

## Security

- `VITE_*` variables = PUBLIC (exposed to frontend)
- Other variables = PRIVATE (server-side only)
- Monitor URLs in `monitors.json` are never exposed to client

---

## Tech Stack

- **Frontend:** React 19, TypeScript 5.8, Vite 6, TailwindCSS
- **Backend:** Cloudflare Workers, Pages Functions
- **Storage:** Cloudflare KV

---

## License

MIT License - see [LICENSE](LICENSE)

---

## Support

- **Issues:** [GitHub Issues](https://github.com/slymb/UptimeWorker/issues)
- **Customization:** [CUSTOMIZATION.md](./CUSTOMIZATION.md)
