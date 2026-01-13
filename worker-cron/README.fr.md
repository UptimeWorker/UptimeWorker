# UptimeWorker Cron Worker

C'est le **worker cron** qui declenche les verifications des monitors toutes les 5 minutes.

## Pourquoi un Worker Separe?

Cloudflare Pages ne supporte pas les declencheurs cron. Ce worker gere les taches planifiees et appelle l'endpoint API de Pages.

## Fonctionnement

```
┌─────────────────────┐          ┌─────────────────────┐
│   Worker Cron       │  POST    │   Cloudflare Pages  │
│   (ce dossier)      │ -------> │   /api/cron/check   │
│                     │ Header X-Cron-Auth             │
│   Toutes les 5 min  │          │   Execute checks    │
└─────────────────────┘          │   Sauvegarde en KV  │
                                 └─────────────────────┘
```

## Deploiement

### Etape 1: Creer le Worker

1. Aller dans **Cloudflare Dashboard > Workers & Pages**
2. Cliquer **Create > Create Worker**
3. Nommer (ex: `uptimeworker-cron`)
4. Copier le code de `worker.js` et le coller

### Etape 2: Configurer les Variables d'Environnement

Dans **Settings > Variables**, ajouter:

| Variable | Valeur | Description |
|----------|--------|-------------|
| `SITE_URL` | `https://votre-site.pages.dev` | URL de votre Pages (sans / a la fin) |
| `CRON_SECRET` | `votre-cle-secrete` | Meme secret que dans le projet Pages |

**Important:** `CRON_SECRET` doit etre identique dans le Worker ET le projet Pages.

### Etape 3: Ajouter le Declencheur Cron

1. Aller dans **Settings > Triggers**
2. Cliquer **Add Cron Trigger**
3. Choisir l'onglet **Planification** et mettre **5 minutes**
   - Ou utiliser l'onglet **Expression Cron**: `*/5 * * * *`
4. Sauvegarder

### Etape 4: Verifier

1. Attendre la prochaine execution cron (max 5 min)
2. Verifier l'onglet **Logs** pour les evenements `scheduled`
3. Vous devriez voir des appels reussis vers votre endpoint Pages

## Format du Code

Ce worker utilise la syntaxe moderne **ES6 Module** (`export default`) compatible avec le runtime Cloudflare Workers le plus récent.

## Fichiers

| Fichier | Description |
|---------|-------------|
| `worker.js` | Code du worker (copier dans Cloudflare) |
| `wrangler.toml` | Config pour deploiement CLI (optionnel) |
| `.env.example` | Exemple de variables d'environnement |

## Deploiement CLI (Optionnel)

Si vous preferez utiliser Wrangler CLI:

```bash
cd worker-cron
cp .env.example .env
# Editer .env avec vos valeurs

npx wrangler deploy
npx wrangler secret put CRON_SECRET
```

## Depannage

### Le Worker ne se declenche pas?
- Verifier **Settings > Triggers** - le cron doit etre configure
- Regarder l'onglet **Logs** pour les erreurs

### Erreur 401 Access Denied?
- `CRON_SECRET` ne correspond pas entre le Worker et Pages
- Re-saisir le secret aux deux endroits (copier-coller exactement)

### Pas de donnees sur la page de statut?
- Verifier les logs Pages pour les erreurs `/api/cron/check`
- Verifier que le binding KV est configure dans le projet Pages

## Securite

- Le worker envoie le header `X-Cron-Auth` avec `CRON_SECRET`
- L'endpoint Pages valide ce header avant d'executer les checks
- Ne jamais exposer `CRON_SECRET` publiquement
