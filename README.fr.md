# UptimeWorker

**Systeme de monitoring de page de statut moderne** propulse par Cloudflare Workers, Pages et KV.

[![Deploy to Cloudflare](https://img.shields.io/badge/Deploy-Cloudflare-orange?logo=cloudflare)](https://dash.cloudflare.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vitejs.dev/)

[English version](./README.md) | [Guide de personnalisation](./CUSTOMIZATION.fr.md)

---

## Fonctionnalites

- **Monitoring temps reel** - Verification automatique toutes les 5 minutes
- **Timeline visuelle** - 90 barres avec niveaux de zoom (1h, 24h, 3j, 7j, 30j)
- **Detection HTTP flexible** - Support des plages de codes (200-299, 301, etc.)
- **Statut tri-state** - Operationnel / Degrade / Hors ligne
- **Securise** - URLs des monitors jamais exposees au client
- **Multilingue** - Support EN/FR
- **Responsive** - Mobile/desktop/tablette
- **Personnalisable** - Logo, titre, couleurs

---

## Demarrage rapide

### 1. Installation

```bash
git clone https://github.com/slymb/UptimeWorker.git
cd UptimeWorker
npm install
```

### 2. Configuration

```bash
cp monitors.json.example monitors.json
cp .env.example .env
```

Editer `monitors.json`:
```json
[
  {
    "id": "mon-site",
    "name": "Mon Site",
    "url": "https://example.com",
    "method": "GET",
    "acceptedStatusCodes": ["200-299"],
    "followRedirect": true,
    "linkable": true
  }
]
```

### 3. Lancer

```bash
npm run dev:full
```

Ouvrir http://localhost:3000

---

## Deploiement

### Cloudflare Pages

1. Creer le namespace KV:
```bash
wrangler kv:namespace create KV_STATUS_PAGE
```

2. Build et deployer:
```bash
npm run build
npm run deploy
```

---

## Personnalisation

Editer 3 fichiers:

1. **`src/config/branding.ts`** - Nom entreprise, URLs
2. **`.env`** - Titre, chemins logos
3. **`public/`** - Vos fichiers logo

Voir [CUSTOMIZATION.fr.md](./CUSTOMIZATION.fr.md) pour les details.

---

## Structure du projet

```
uptimeworker/
├── src/
│   ├── components/       # Composants React
│   ├── config/          # Config branding
│   ├── data/            # Donnees incidents
│   └── i18n/            # Traductions
├── functions/           # Cloudflare Workers
├── public/              # Assets statiques
├── monitors.json        # Vos services (gitignore)
└── monitors.json.example
```

---

## Securite

- Variables `VITE_*` = PUBLIC (exposees au frontend)
- Autres variables = PRIVE (cote serveur uniquement)
- URLs des monitors dans `monitors.json` jamais exposees au client

---

## Stack technique

- **Frontend:** React 19, TypeScript 5.8, Vite 6, TailwindCSS
- **Backend:** Cloudflare Workers, Pages Functions
- **Storage:** Cloudflare KV

---

## Licence

MIT License - voir [LICENSE](LICENSE)

---

## Support

- **Issues:** [GitHub Issues](https://github.com/slymb/UptimeWorker/issues)
- **Personnalisation:** [CUSTOMIZATION.fr.md](./CUSTOMIZATION.fr.md)
