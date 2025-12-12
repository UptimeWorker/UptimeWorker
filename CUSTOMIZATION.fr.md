# Guide de Personnalisation

Guide pour personnaliser votre instance UptimeWorker.

[English version](./CUSTOMIZATION.md)

---

## Demarrage Rapide (3 minutes)

### 3 fichiers a editer:

#### 1. Editer `src/config/branding.ts`

```typescript
export const branding: BrandingConfig = {
  companyName: 'VotreEntreprise',
  projectName: 'VotreEntreprise Status',
  websiteUrl: 'https://votreentreprise.com',
  // ...
}
```

#### 2. Editer `.env`

```bash
cp .env.example .env

# Modifier les valeurs
VITE_STATUS_TITLE="VotreEntreprise Status"
VITE_STATUS_LOGO_DARK="/logo-dark.webp"
VITE_STATUS_LOGO_LIGHT="/logo-light.webp"
STATUS_URL="https://status.votreentreprise.com"
```

#### 3. Ajouter vos logos

```
public/
├── logo-dark.webp   # Theme sombre (texte fonce)
├── logo-light.webp  # Theme clair (texte blanc)
└── favicon.ico
```

Lancer `npm run dev:full` pour voir les changements.

---

## Configuration du Branding

### Fichier: `src/config/branding.ts`

| Propriete | Description | Exemple |
|-----------|-------------|---------|
| `companyName` | Nom entreprise | "ACME Corp" |
| `projectName` | Nom projet | "ACME Status" |
| `projectDescription` | Description courte | "Monitoring temps reel" |
| `websiteUrl` | URL site principal | "https://acme.com" |
| `websiteDomain` | Domaine (affichage) | "acme.com" |
| `supportEmail` | Email support | "support@acme.com" |
| `githubUrl` | URL GitHub | "https://github.com/acme" |
| `userAgent` | User-Agent pour monitoring | "ACME-Monitor/1.0" |

### Liens Footer

```typescript
links: {
  about: 'https://acme.com/about',
  terms: 'https://acme.com/terms',
  privacy: 'https://acme.com/privacy',
}
```

---

## Variables d'Environnement

### Fichier: `.env`

```bash
# FRONTEND (PUBLIC)
VITE_STATUS_TITLE="Ma Page Status"
VITE_STATUS_LOGO_DARK="/logo-dark.webp"
VITE_STATUS_LOGO_LIGHT="/logo-light.webp"
VITE_REFRESH_INTERVAL=60

# BACKEND (PRIVE)
STATUS_URL="https://status.example.com"
CRON_CHECK_INTERVAL=5
```

---

## Logos

### Systeme Theme-Aware

- **Mode sombre** → Utilise `VITE_STATUS_LOGO_DARK`
- **Mode clair** → Utilise `VITE_STATUS_LOGO_LIGHT`

### Formats Recommandes

- **WebP** (recommande) - Meilleure compression
- **PNG** - Alternative avec transparence
- **SVG** - Scalable

### Logo Unique (pas de theme switching)

```bash
VITE_STATUS_LOGO_DARK="/mon-logo.webp"
VITE_STATUS_LOGO_LIGHT="/mon-logo.webp"
```

---

## Configuration des Monitors

### Fichier: `monitors.json`

```json
[
  {
    "id": "mon-service",
    "name": "Mon Service",
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

### Fichier: `src/data/incidents.ts`

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
    affectedServices: ['mon-service']
  }
]
```

---

## Securite

### Ne jamais exposer avec `VITE_`:
- Secrets API
- Tokens d'authentification
- URLs internes
- Credentials

### OK pour `VITE_`:
- Titre public
- Chemins logos
- Intervalles de refresh
- Config UI

---

## Support

- **Issues:** [GitHub Issues](https://github.com/UptimeWorker/UptimeWorker/issues)
- **EN Guide:** [CUSTOMIZATION.md](./CUSTOMIZATION.md)
