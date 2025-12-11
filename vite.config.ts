import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isDev = mode === 'development';

  return {
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
      legalComments: 'none',
    },
    server: {
      port: parseInt(env.PORT || '3000'),
      host: env.HOST || '0.0.0.0',
      hmr: {
        host: 'localhost',
        port: parseInt(env.PORT || '3000'),
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
    plugins: [
      react(),
      nodePolyfills({
        include: ['buffer'],
        globals: {
          Buffer: true,
        },
      }),
      // Fix Cloudflare Pages build hang with Vite 6.x
      !isDev ? {
        name: 'cloudflare-pages-exit-fix',
        closeBundle() {
          if (process.env.CF_PAGES) {
            process.exit(0);
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
