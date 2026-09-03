import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import type { ManifestOptions } from 'vite-plugin-pwa'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPwaManifest } from './pwa-manifest.js'

const base = process.env.VITE_BASE_PATH || '/'
const appBuild = '2026-09-03-pwa-builder-followup'
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

export default defineConfig({
  base,
  resolve: {
    alias: {
      '@jyut/shared': path.join(repoRoot, 'packages/yue-shared/src'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Self-register in index.html (immediate) so PWA Builder HTML/Puppeteer
      // scanners can find `/sw.js` without waiting for window.load.
      injectRegister: false,
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'app-build.txt',
        'pwa-screenshots/mobile-app-narrow.png',
        'pwa-screenshots/desktop-app-wide.png',
      ],
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest,txt}'],
        additionalManifestEntries: [
          { url: `${base}app-build.txt`.replace(/\/+/g, '/'), revision: appBuild },
        ],
      },
      manifest: createPwaManifest(base) as unknown as ManifestOptions,
    }),
  ],
  server: {
    port: 5173,
    fs: { allow: [repoRoot] },
    // Cloudflare / ngrok quick tunnels (phone HTTPS for mic testing)
    allowedHosts: ['.trycloudflare.com', '.ngrok-free.app', '.ngrok.io'],
    proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: true } },
  },
})
