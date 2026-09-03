#!/usr/bin/env node
/**
 * Compile React Email `.tsx` templates to plain ESM JS (jsx-runtime).
 * Vercel Node loads apps/api without a JSX transform; compiled output is what
 * `notify.ts` imports at send-time.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const emailsDir = join(root, 'apps/api/src/emails')
const outDir = join(emailsDir, 'compiled')

const entryPoints = readdirSync(emailsDir)
  .filter((name) => name.endsWith('.tsx'))
  .map((name) => join(emailsDir, name))

if (!entryPoints.length) {
  console.error('[compile-api-emails] no .tsx templates found in', emailsDir)
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })

const require = createRequire(import.meta.url)
let esbuildBin
try {
  esbuildBin = require.resolve('esbuild/bin/esbuild')
} catch {
  esbuildBin = null
}

const args = [
  ...entryPoints,
  `--outdir=${outDir}`,
  '--format=esm',
  '--jsx=automatic',
  '--platform=node',
  '--packages=external',
  '--target=es2022',
  '--log-level=info',
]

const result = esbuildBin
  ? spawnSync(process.execPath, [esbuildBin, ...args], { stdio: 'inherit' })
  : spawnSync('npx', ['--yes', 'esbuild', ...args], { stdio: 'inherit', shell: true })

if (result.status !== 0) {
  process.exit(result.status || 1)
}

// Compiled files live one directory deeper than sources — fix relative imports.
for (const name of readdirSync(outDir).filter((n) => n.endsWith('.js'))) {
  const file = join(outDir, name)
  let next = readFileSync(file, 'utf8')
  next = next.replaceAll('from "./brand.js"', 'from "../brand.js"')
  next = next.replaceAll('from "./bugReportMeta.js"', 'from "../bugReportMeta.js"')
  next = next.replaceAll('from "./authEmailMeta.js"', 'from "../authEmailMeta.js"')
  writeFileSync(file, next)
}

console.log(`[compile-api-emails] wrote ${entryPoints.length} templates → ${outDir}`)
