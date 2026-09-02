#!/usr/bin/env node
/**
 * Regenerates PWA / Home Screen PNG icons to match public/favicon.svg:
 * glow-jade radial harbor background + centered 粵
 * (pwa-192.png, pwa-512.png, apple-touch-icon.png).
 *
 * Prefers Python + Pillow (scripts/generate-icons.py) locally.
 * On Vercel / CI (or when Pillow is missing), keep the committed PNGs
 * and exit 0 so deploys never fail on icon generation.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(__dirname, '../apps/web/public')
const pyPath = path.join(__dirname, 'generate-icons.py')

const ICON_FILES = ['pwa-192.png', 'pwa-512.png', 'pwa-512-maskable.png', 'apple-touch-icon.png']

fs.mkdirSync(outDir, { recursive: true })

function hasCommittedIcons() {
  return ICON_FILES.every((name) => fs.existsSync(path.join(outDir, name)))
}

function useCommitted(reason) {
  if (!hasCommittedIcons()) return false
  console.warn(`icons: ${reason} — using committed ${ICON_FILES.join(' / ')}`)
  console.log('icons ok (committed)')
  return true
}

// Vercel build images often have python3 but not a working Pillow/font stack.
// Prefer committed assets unless FORCE_ICON_GEN=1.
const onVercelOrCi = Boolean(process.env.VERCEL || process.env.CI)
const forceGen = process.env.FORCE_ICON_GEN === '1'

if (onVercelOrCi && !forceGen) {
  if (useCommitted('skip Python on Vercel/CI')) process.exit(0)
  console.error('icons: Vercel/CI build missing committed PNGs in apps/web/public')
  process.exit(1)
}

try {
  execFileSync('python3', ['-c', 'from PIL import Image'], { stdio: 'ignore' })
  execFileSync('python3', [pyPath, outDir], { stdio: 'pipe', encoding: 'utf8' })
  console.log('icons ok (python)')
} catch (err) {
  if (useCommitted('Python/Pillow unavailable or generate-icons.py failed')) {
    process.exit(0)
  }
  console.error('icons: failed to generate and no committed PNGs found')
  if (err && typeof err === 'object') {
    const e = err
    if (e.stderr) console.error(String(e.stderr))
    if (e.stdout) console.error(String(e.stdout))
    if (e.message) console.error(e.message)
  } else {
    console.error(err)
  }
  process.exit(1)
}
