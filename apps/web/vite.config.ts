import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import type { ManifestOptions } from 'vite-plugin-pwa'
import { createPwaManifest } from './pwa-manifest.js'

const base = process.env.VITE_BASE_PATH || '/'
const appBuild = '2026-09-02-pwa-builder-prep'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
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
    // Cloudflare / ngrok quick tunnels (phone HTTPS for mic testing)
    allowedHosts: ['.trycloudflare.com', '.ngrok-free.app', '.ngrok.io'],
    proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: true } },
  },
})
