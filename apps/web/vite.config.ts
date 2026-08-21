import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const base = process.env.VITE_BASE_PATH || '/'
const appBuild = '2026-08-21-apple-touch-favicon'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'app-build.txt'],
      workbox: {
        cleanupOutdatedCaches: true,
        additionalManifestEntries: [{ url: `${base}app-build.txt`.replace(/\/+/g, '/'), revision: appBuild }],
      },
      manifest: {
        name: 'JyutTranslate — English ↔ Cantonese',
        short_name: 'JyutTranslate',
        theme_color: '#07131f',
        background_color: '#07131f',
        display: 'standalone',
        start_url: base,
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    // Cloudflare / ngrok quick tunnels (phone HTTPS for mic testing)
    allowedHosts: ['.trycloudflare.com', '.ngrok-free.app', '.ngrok.io'],
    proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: true } },
  },
})
