# UptimeWorker

**Systeme de monitoring de page de statut moderne** propulse par Cloudflare Pages + Workers.

[![Deploy to Cloudflare](https://img.shields.io/badge/Deploy-Cloudflare-orange?logo=cloudflare)](https://dash.cloudflare.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vitejs.dev/)

[English version](./README.md) | [Guide de personnalisation](./CUSTOMIZATION.fr.md)

---

## Fonctionnalites

- **Monitoring temps reel** - Verification automatique toutes les 5 minutes (configurable)
- **Timeline visuelle** - 60 barres avec niveaux de zoom (1h, 24h, 7j, 30j)
- **Stockage historique** - Donnees granulaires 24h + historique journalier 30 jours dans KV
- **Detection HTTP flexible** - Support des plages de codes (200-299, 301, etc.)
- **Statut tri-state** - Operationnel / Degrade / Hors ligne
- **Securise** - URLs des monitors jamais exposees au client
- **Multilingue** - Support EN/FR
- **Responsive** - Mobile/desktop/tablette
- **Personnalisable** - Logo, titre, couleurs

---

## Architecture

UptimeWorker utilise une **architecture a deux composants**:

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Pages                         │
│  (Frontend + API)                                           │
│                                                             │
│  • Frontend React (interface page de statut)                │
│  • /api/monitors/status - Retourne les donnees KV           │
│  • /api/cron/check - Endpoint protege pour les checks       │
│  • Binding KV: KV_STATUS_PAGE                               │
└─────────────────────────────────────────────────────────────┘
                           ▲
                           │ POST /api/cron/check
                           │ Header: X-Cron-Auth
                           │
┌─────────────────────────────────────────────────────────────┐
│                 Cloudflare Worker (Cron)                    │
│  (worker-cron/)                                             │
│                                                             │
│  • Declencheur cron toutes les 5 minutes                    │
│  • Appelle l'endpoint /api/cron/check de Pages              │
│  • Variables: SITE_URL, CRON_SECRET                         │
└─────────────────────────────────────────────────────────────┘
```

**Pourquoi cette architecture?**
- Cloudflare Pages ne supporte pas les declencheurs cron
- Un Worker separe gere les taches planifiees
- Communication securisee via secret partage (header X-Cron-Auth)

---

## Demarrage rapide (Developpement local)

### 1. Installation

```bash
git clone https://github.com/UptimeWorker/UptimeWorker.git
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

## Deploiement en production

### Etape 1: Creer le namespace KV

Dans le Dashboard Cloudflare:
1. Aller dans **Workers & Pages > KV**
2. Cliquer **Create a namespace**
3. Nommer (ex: `uptimeworker-status`)

### Etape 2: Deployer le projet Pages

1. **Connecter le repo GitHub** a Cloudflare Pages
2. **Parametres de build:**
   - Build command: `npm run build`
   - Build output directory: `dist`
3. **Variables d'environnement** (Settings > Environment variables):
   - `CRON_SECRET` = votre-cle-secrete (utiliser une chaine aleatoire forte)
   - Variables `VITE_*` selon besoins (voir `.env.example`)
4. **Binding KV** (Settings > Functions > KV namespace bindings):
   - Variable name: `KV_STATUS_PAGE`
   - KV namespace: selectionner votre namespace

### Etape 3: Deployer le Worker Cron

1. Aller dans **Workers & Pages > Create > Create Worker**
2. Nommer (ex: `uptimeworker-cron`)
3. **Coller le code** de `worker-cron/worker.js`
4. **Variables d'environnement** (Settings > Variables):
   - `SITE_URL` = URL de votre Pages (ex: `https://status.example.com`)
   - `CRON_SECRET` = meme secret que le projet Pages
   - `CRON_USER_AGENT` = (optionnel) User-Agent personnalise pour compatibilite WAF
5. **Ajouter le declencheur Cron** (Settings > Triggers > Cron):
   - Utiliser l'onglet **Planification**, mettre **5 minutes**
   - Ou utiliser l'expression: `*/5 * * * *`

### Etape 4: Verifier

1. Attendre la prochaine execution cron (max 5 min)
2. Verifier les logs du Worker pour les evenements `scheduled`
3. Visiter votre URL Pages - les monitors devraient afficher des donnees

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
├── functions/           # Cloudflare Pages Functions
│   └── api/
│       ├── cron/check.ts    # Endpoint cron protege
│       └── monitors/status.ts
├── worker-cron/         # Worker Cron separe
│   ├── worker.js        # Code du worker cron
│   ├── wrangler.toml    # Config worker
│   └── .env.example
├── public/              # Assets statiques
├── monitors.json        # Vos services (gitignore)
└── monitors.json.example
```

---

## Securite

- Variables `VITE_*` = PUBLIC (exposees au frontend)
- `CRON_SECRET` = PRIVE (protege l'endpoint /api/cron/check)
- URLs des monitors dans `monitors.json` jamais exposees au client
- L'endpoint cron necessite le header `X-Cron-Auth` correspondant a `CRON_SECRET`

---

## Stack technique

- **Frontend:** React 19, TypeScript 5.8, Vite 6, TailwindCSS
- **Backend:** Cloudflare Pages Functions + Workers
- **Storage:** Cloudflare KV
- **Cron:** Cloudflare Worker Cron Triggers

---

## Licence

MIT License - voir [LICENSE](LICENSE)

---

## Support

- **Issues:** [GitHub Issues](https://github.com/UptimeWorker/UptimeWorker/issues)
- **Personnalisation:** [CUSTOMIZATION.fr.md](./CUSTOMIZATION.fr.md)
