import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, readFileSync } from 'fs';

// Lit le port API effectif depuis .dev-api-port (écrit par dev-server.js après fallback).
// Priorité : fichier > env API_PORT > défaut 4001.
// Ports dev dédiés UptimeWorker : 4000 (frontend) / 4001 (API), pour ne pas entrer
// en collision avec d'autres projets locaux qui utilisent souvent 3000/3001.
function resolveApiPort(envApiPort?: string): number {
  try {
    const filePath = path.resolve(process.cwd(), '.dev-api-port');
    if (existsSync(filePath)) {
      const port = parseInt(readFileSync(filePath, 'utf8').trim(), 10);
      if (Number.isFinite(port) && port > 0) return port;
    }
  } catch { /* fall through to env/default */ }
  return parseInt(envApiPort || '4001', 10);
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isDev = mode === 'development';
  const apiPort = resolveApiPort(env.API_PORT);

  return {
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
      legalComments: 'none',
    },
    server: {
      port: parseInt(env.PORT || '4000'),
      host: env.HOST || '0.0.0.0',
      // strictPort: false (défaut Vite) -> essaie automatiquement le port suivant si occupé.
      // hmr.port non hardcodé -> Vite l'aligne automatiquement sur le port HTTP effectif.
      proxy: {
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
    plugins: [
      react(),
      // Fix Cloudflare Pages build hang with Vite 6.x
      !isDev ? {
        name: 'cloudflare-pages-exit-fix',
        closeBundle() {
          if (process.env.CF_PAGES) {
            setTimeout(() => process.exit(0), 1000);
          }
        }
      } : null,
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@utils': path.resolve(__dirname, './src/utils'),
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'esbuild',
      chunkSizeWarningLimit: 1000
    }
  };
});
