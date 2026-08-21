#!/usr/bin/env node
/**
 * Regenerates PWA PNG icons to match public/favicon.svg:
 * glow-jade radial harbor background + centered 粵.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(__dirname, '../apps/web/public')
const pyPath = path.join(__dirname, 'generate-icons.py')

fs.mkdirSync(outDir, { recursive: true })
execFileSync('python3', [pyPath, outDir], { stdio: 'inherit' })
console.log('icons ok')
