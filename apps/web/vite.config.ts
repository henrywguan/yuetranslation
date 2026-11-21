import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import type { ManifestOptions } from 'vite-plugin-pwa'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPwaManifest } from './pwa-manifest.js'

const base = process.env.VITE_BASE_PATH || '/'
const appBuild = '2026-09-03-pwa-builder-followup'
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const AGENT_DEBUG_LOG = '/opt/cursor/logs/debug.log'

/** TEMP: browser → NDJSON file for debug-mode intro investigation (session 13d1). */
function agentDebugLogPlugin() {
  return {
    name: 'agent-debug-log',
    configureServer(server: { middlewares: { use: (fn: unknown) => void } }) {
      server.middlewares.use((req: { url?: string; method?: string }, res: { statusCode: number; end: (s?: string) => void; setHeader: (k: string, v: string) => void }, next: () => void) => {
        if (req.url !== '/__agent_debug_log' || req.method !== 'POST') {
          next()
          return
        }
        const chunks: Buffer[] = []
        ;(req as NodeJS.ReadableStream).on('data', (c: Buffer) => chunks.push(c))
        ;(req as NodeJS.ReadableStream).on('end', () => {
          try {
            const line = Buffer.concat(chunks).toString('utf8').trim()
            if (line) fs.appendFileSync(AGENT_DEBUG_LOG, line + '\n')
          } catch {
            /* ignore */
          }
          res.statusCode = 204
          res.end()
        })
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
    agentDebugLogPlugin(),
    react(),
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
