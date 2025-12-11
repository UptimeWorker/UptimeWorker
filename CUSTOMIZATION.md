# Customization Guide

Guide to customize your UptimeWorker instance.

[Version francaise](./CUSTOMIZATION.fr.md)

---

## Quick Start (3 minutes)

### 3 files to edit:

#### 1. Edit `src/config/branding.ts`

```typescript
export const branding: BrandingConfig = {
  companyName: 'YourCompany',
  projectName: 'YourCompany Status',
  websiteUrl: 'https://yourcompany.com',
  // ...
}
```

#### 2. Edit `.env`

```bash
cp .env.example .env

# Edit values
VITE_STATUS_TITLE="YourCompany Status"
VITE_STATUS_LOGO_DARK="/logo-dark.webp"
VITE_STATUS_LOGO_LIGHT="/logo-light.webp"
STATUS_URL="https://status.yourcompany.com"
```

#### 3. Add your logos

```
public/
├── logo-dark.webp   # Dark theme (dark text)
├── logo-light.webp  # Light theme (light text)
└── favicon.ico
```

Run `npm run dev:full` to see changes.

---

## Branding Configuration

### File: `src/config/branding.ts`

| Property | Description | Example |
|----------|-------------|---------|
| `companyName` | Company name | "ACME Corp" |
| `projectName` | Project name | "ACME Status" |
| `projectDescription` | Short description | "Real-time monitoring" |
| `websiteUrl` | Main website URL | "https://acme.com" |
| `websiteDomain` | Domain (display) | "acme.com" |
| `supportEmail` | Support email | "support@acme.com" |
| `githubUrl` | GitHub URL | "https://github.com/acme" |
| `userAgent` | User-Agent for monitoring | "ACME-Monitor/1.0" |

### Footer Links

```typescript
links: {
  about: 'https://acme.com/about',
  terms: 'https://acme.com/terms',
  privacy: 'https://acme.com/privacy',
}
```

---

## Environment Variables

### File: `.env`

```bash
# FRONTEND (PUBLIC)
VITE_STATUS_TITLE="My Status Page"
VITE_STATUS_LOGO_DARK="/logo-dark.webp"
VITE_STATUS_LOGO_LIGHT="/logo-light.webp"
VITE_REFRESH_INTERVAL=60

# BACKEND (PRIVATE)
STATUS_URL="https://status.example.com"
CRON_CHECK_INTERVAL=5
```

---

## Logos

### Theme-Aware System

- **Dark mode** → Uses `VITE_STATUS_LOGO_DARK`
- **Light mode** → Uses `VITE_STATUS_LOGO_LIGHT`

### Recommended Formats

- **WebP** (recommended) - Best compression
- **PNG** - Alternative with transparency
- **SVG** - Scalable

### Single Logo (no theme switching)

```bash
VITE_STATUS_LOGO_DARK="/my-logo.webp"
VITE_STATUS_LOGO_LIGHT="/my-logo.webp"
```

---

## Monitors Configuration

### File: `monitors.json`

```json
[
  {
    "id": "my-service",
    "name": "My Service",
    "url": "https://example.com",
    "method": "GET",
    "acceptedStatusCodes": ["200-299"],
    "followRedirect": true,
    "linkable": true
  }
]
```

---

## Incidents

### File: `src/data/incidents.ts`

```typescript
export const incidents: IncidentData[] = [
  {
    id: 'maintenance-2025',
    type: 'warning',
    title: {
      en: 'Scheduled maintenance',
      fr: 'Maintenance planifiee'
    },
    message: {
      en: 'Maintenance from 02:00 to 04:00 UTC.',
      fr: 'Maintenance de 02h00 a 04h00 UTC.'
    },
    timestamp: '2025-12-10T10:00:00.000Z',
    affectedServices: ['my-service']
  }
]
```

---

## Security

### Never expose with `VITE_`:
- API secrets
- Auth tokens
- Internal URLs
- Credentials

### Safe for `VITE_`:
- Public title
- Logo paths
- Refresh intervals
- UI config

---

## Support

- **Issues:** [GitHub Issues](https://github.com/slymb/UptimeWorker/issues)
- **FR Guide:** [CUSTOMIZATION.fr.md](./CUSTOMIZATION.fr.md)
