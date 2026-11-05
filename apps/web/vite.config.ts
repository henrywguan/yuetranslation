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
const agentDebugLogPrimary = '/opt/cursor/logs/debug.log'
const agentDebugLogFallback = path.join(repoRoot, 'apps/web/.agent-debug.log')

function appendAgentDebugLine(line: string) {
  const targets = [agentDebugLogPrimary, agentDebugLogFallback]
  let wrote = false
  for (const target of targets) {
    try {
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.appendFileSync(target, line.endsWith('\n') ? line : `${line}\n`)
      wrote = true
      // Prefer cloud path when writable; still mirror to repo fallback for local Mac.
      if (target === agentDebugLogPrimary) {
        try {
          fs.mkdirSync(path.dirname(agentDebugLogFallback), { recursive: true })
          fs.appendFileSync(
            agentDebugLogFallback,
            line.endsWith('\n') ? line : `${line}\n`,
          )
        } catch {
          /* ignore secondary */
        }
      }
      break
    } catch {
      /* try next */
    }
  }
  return wrote
}

/** Dev-only: browser agentDebugLog → NDJSON file for hang investigations. */
function agentDebugLogPlugin() {
  return {
    name: 'agent-debug-log',
    configureServer(server: { middlewares: { use: (path: string, handler: (req: import('http').IncomingMessage, res: import('http').ServerResponse, next: () => void) => void) => void } }) {
      server.middlewares.use('/__agent-debug-log', (req, res, next) => {
        if (req.method !== 'POST') {
          next()
          return
        }
        const chunks: Buffer[] = []
        req.on('data', (c: Buffer) => chunks.push(c))
        req.on('end', () => {
          try {
            const raw = Buffer.concat(chunks).toString('utf8').trim()
            if (raw && !appendAgentDebugLine(raw)) {
              res.statusCode = 500
              res.end('log-fail')
              return
            }
            res.statusCode = 204
            res.end()
          } catch {
            res.statusCode = 500
            res.end('log-fail')
          }
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
        // #591 splash art broke production builds).
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest,txt}'],
        globIgnores: ['**/assets/harbor-quest/**'],
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
