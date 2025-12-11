# UptimeWorker Cron Worker

This is the **cron worker** that triggers monitor checks every 5 minutes.

## Why a Separate Worker?

Cloudflare Pages doesn't support cron triggers. This worker handles scheduled tasks and calls the Pages API endpoint.

## How It Works

```
┌─────────────────────┐          ┌─────────────────────┐
│   Cron Worker       │  POST    │   Cloudflare Pages  │
│   (this folder)     │ -------> │   /api/cron/check   │
│                     │ X-Cron-Auth header             │
│   Every 5 minutes   │          │   Runs checks       │
└─────────────────────┘          │   Saves to KV       │
                                 └─────────────────────┘
```

## Deployment

### Step 1: Create the Worker

1. Go to **Cloudflare Dashboard > Workers & Pages**
2. Click **Create > Create Worker**
3. Name it (e.g., `uptimeworker-cron`)
4. Copy the code from `worker.js` and paste it

### Step 2: Configure Environment Variables

In **Settings > Variables**, add:

| Variable | Value | Description |
|----------|-------|-------------|
| `SITE_URL` | `https://your-site.pages.dev` | Your Pages URL (no trailing slash) |
| `CRON_SECRET` | `your-secret-key` | Same secret as configured in Pages |

**Important:** `CRON_SECRET` must be identical in both the Worker and Pages project.

### Step 3: Add Cron Trigger

1. Go to **Settings > Triggers**
2. Click **Add Cron Trigger**
3. Choose **Scheduling** tab and set to **5 minutes**
   - Or use **Expression Cron** tab: `*/5 * * * *`
4. Save

### Step 4: Verify

1. Wait for the next cron execution (max 5 min)
2. Check **Logs** tab for `scheduled` events
3. You should see successful calls to your Pages endpoint

## Files

| File | Description |
|------|-------------|
| `worker.js` | Worker code (copy this to Cloudflare) |
| `wrangler.toml` | Config for CLI deployment (optional) |
| `.env.example` | Example environment variables |

## CLI Deployment (Optional)

If you prefer using Wrangler CLI:

```bash
cd worker-cron
cp .env.example .env
# Edit .env with your values

npx wrangler deploy
npx wrangler secret put CRON_SECRET
```

## Troubleshooting

### Worker not triggering?
- Check **Settings > Triggers** - cron must be configured
- Look in **Logs** tab for any errors

### 401 Access Denied?
- `CRON_SECRET` doesn't match between Worker and Pages
- Re-enter the secret in both places (copy-paste exactly)

### No data on status page?
- Check Pages logs for `/api/cron/check` errors
- Verify KV binding is configured in Pages project

## Security

- The worker sends `X-Cron-Auth` header with `CRON_SECRET`
- Pages endpoint validates this header before running checks
- Never expose `CRON_SECRET` publicly
