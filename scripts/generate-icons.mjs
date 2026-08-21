#!/usr/bin/env node
/**
 * Regenerates PWA / Home Screen PNG icons to match public/favicon.svg:
 * glow-jade radial harbor background + centered 粵
 * (pwa-192.png, pwa-512.png, apple-touch-icon.png).
 *
 * Prefers Python + Pillow (scripts/generate-icons.py). If those aren't
 * available (e.g. Vercel build images), keep the committed PNGs and exit 0
 * so builds still succeed.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(__dirname, '../apps/web/public')
const pyPath = path.join(__dirname, 'generate-icons.py')

const ICON_FILES = ['pwa-192.png', 'pwa-512.png', 'apple-touch-icon.png']

fs.mkdirSync(outDir, { recursive: true })

function hasCommittedIcons() {
  return ICON_FILES.every((name) => fs.existsSync(path.join(outDir, name)))
}

try {
  execFileSync('python3', ['-c', 'from PIL import Image'], { stdio: 'ignore' })
  execFileSync('python3', [pyPath, outDir], { stdio: 'inherit' })
  console.log('icons ok (python)')
} catch (err) {
  if (hasCommittedIcons()) {
    console.warn(
      'icons: Python/Pillow unavailable — using committed pwa-192.png / pwa-512.png / apple-touch-icon.png',
    )
    console.log('icons ok (committed)')
    process.exit(0)
  }
  console.error('icons: failed to generate and no committed PNGs found')
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
}
