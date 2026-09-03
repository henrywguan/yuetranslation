#!/usr/bin/env node
/**
 * Build @jyut/shared to dist/. Prefer local typescript; if missing but dist
 * already exists (committed), succeed so parent package installs don't fail.
 */
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distEntry = path.join(root, 'dist', 'index.js')
const tscJs = path.join(root, 'node_modules', 'typescript', 'lib', 'tsc.js')

if (!existsSync(tscJs)) {
  if (existsSync(distEntry)) {
    console.warn('@jyut/shared: typescript not installed; using existing dist/')
    process.exit(0)
  }
  console.error('@jyut/shared: missing dist/ and typescript — run: npm ci --prefix packages/yue-shared')
  process.exit(1)
}

const result = spawnSync(process.execPath, [tscJs, '-p', 'tsconfig.json'], {
  cwd: root,
  stdio: 'inherit',
})
process.exit(result.status ?? 1)
