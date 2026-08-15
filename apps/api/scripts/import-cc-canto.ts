#!/usr/bin/env npx tsx
/**
 * Download CC-Canto and build apps/api/src/canto/data/cc-canto-gloss.json.gz
 *
 * Source: https://cccanto.org/ (CC-BY-SA 3.0) via GitHub mirror.
 */
import { createWriteStream, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { createGzip } from 'node:zlib'
import { Readable } from 'node:stream'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const MIRROR =
  'https://raw.githubusercontent.com/amadeusine/cc-canto-data/master/cccanto-webdist.txt'
const LINE =
  /^(\S+)\s+(\S+)\s+\[([^\]]*)\]\s+\{([^}]*)\}\s+\/(.*)\/$/

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = join(root, 'src/canto/data')
const vendorDir = join(dataDir, 'vendor')
mkdirSync(vendorDir, { recursive: true })

async function main() {
  console.log('Fetching CC-Canto…')
  const res = await fetch(MIRROR)
  if (!res.ok) throw new Error(`download failed: ${res.status}`)
  const text = await res.text()
  const rawPath = join(vendorDir, 'cccanto-webdist.txt')
  writeFileSync(rawPath, text, 'utf8')

  const entries: Record<
    string,
    { jyutping: string | null; gloss: string; simplified: string | null }
  > = {}
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const m = LINE.exec(line.trim())
    if (!m) continue
    const [, trad, simp, , jp, gloss] = m
    if ([...trad].length > 4) continue
    const first = gloss.split('/')[0]?.trim()
    if (!first || entries[trad]) continue
    entries[trad] = {
      jyutping: jp.trim() || null,
      gloss: first.slice(0, 160),
      simplified: simp === trad ? null : simp,
    }
  }

  const packed = {
    source: 'CC-Canto',
    license: 'CC-BY-SA-3.0',
    attribution: 'CC-Canto © 2015-17 Pleco Inc. https://cccanto.org/',
    version: '2017-02-02',
    entryCount: Object.keys(entries).length,
    entries,
  }

  const jsonPath = join(dataDir, 'cc-canto-gloss.json')
  const gzPath = join(dataDir, 'cc-canto-gloss.json.gz')
  writeFileSync(jsonPath, JSON.stringify(packed), 'utf8')
  await pipeline(
    Readable.from([JSON.stringify(packed)]),
    createGzip({ level: 9 }),
    createWriteStream(gzPath),
  )
  // Prefer shipping .gz only.
  try {
    const { unlinkSync } = await import('node:fs')
    unlinkSync(jsonPath)
  } catch {
    /* ignore */
  }
  console.log(`Wrote ${gzPath} (${packed.entryCount} entries)`)
  console.log('Remember CC-BY-SA attribution (see ATTRIBUTION.md).')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
