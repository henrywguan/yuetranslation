import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import type { ManifestOptions } from 'vite-plugin-pwa'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPwaManifest } from './pwa-manifest.js'

const base = process.env.VITE_BASE_PATH || '/'
const appBuild = '2026-09-03-pwa-builder-followup'
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

/** Second installable PWA (DeepSeek chat) — distinct id / start_url / icons. */
function emitChatPwaManifest(): Plugin {
  const chatBody = () => `${JSON.stringify(createPwaManifest(base, 'chat'), null, 2)}\n`
  const chatPath = '/manifest-chat.webmanifest'
  return {
    name: 'emit-chat-pwa-manifest',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] || ''
        const baseNoSlash = base.replace(/\/$/, '')
        if (url !== chatPath && url !== `${baseNoSlash}${chatPath}`) {
          next()
          return
        }
        res.setHeader('Content-Type', 'application/manifest+json')
        res.end(chatBody())
      })
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'manifest-chat.webmanifest',
        source: chatBody(),
      })
    },
  }
}

export default defineConfig({
  base,
  resolve: {
    alias: {
      '@jyut/shared': path.join(repoRoot, 'packages/yue-shared/src'),
    },
  },
  plugins: [
    react(),
    emitChatPwaManifest(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      // Self-register in index.html (immediate) so PWA Builder HTML/Puppeteer
      // scanners can find `/sw.js` without waiting for window.load.
      injectRegister: false,
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'apple-touch-icon-chat.png',
        'pwa-chat-192.png',
        'pwa-chat-512.png',
        'pwa-chat-512-maskable.png',
        'app-build.txt',
        'pwa-screenshots/mobile-app-narrow.png',
        'pwa-screenshots/desktop-app-wide.png',
      ],
      injectManifest: {
        // App shell + icons only — Harbor Quest media (splash PNGs, GLB, audio) is
        // runtime-fetched and must not enter the SW precache (2 MiB default cap;
        // #591 splash art broke production builds). Chat avatar character-bible
        // sheets (deep-sheet.png) are generation sources — keep them out of
        // public/ and out of the SW; mood GIFs are not in globPatterns.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest,txt}'],
        globIgnores: [
          '**/assets/harbor-quest/**',
          '**/chat-avatar/**/deep-sheet.png',
          // Companion intro MP4/poster — multi‑MB runtime fetch; keep out of SW (2 MiB cap).
          '**/chat-avatar/**/intro.mp4',
          '**/chat-avatar/**/intro-poster.*',
        ],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        additionalManifestEntries: [
          { url: `${base}app-build.txt`.replace(/\/+/g, '/'), revision: appBuild },
        ],
      },
      manifest: createPwaManifest(base, 'app') as unknown as ManifestOptions,
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
