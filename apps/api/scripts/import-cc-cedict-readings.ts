#!/usr/bin/env npx tsx
/**
 * Download CC-CEDICT Cantonese readings and build
 * apps/api/src/canto/data/cc-cedict-readings.json.gz
 *
 * Source: https://cccanto.org/ (CC-BY-SA 3.0) via GitHub mirror.
 * Readings expand attestation + Jyutping coverage only — no English gloss for MT.
 */
import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { createGzip } from 'node:zlib'
import { Readable } from 'node:stream'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const MIRROR =
  'https://raw.githubusercontent.com/amadeusine/cc-canto-data/master/cccedict-canto-readings.txt'
/** trad simp [pinyin] {jyutping} */
const LINE = /^(\S+)\s+(\S+)\s+\[([^\]]*)\]\s+\{([^}]*)\}\s*$/

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = join(root, 'src/canto/data')
const vendorDir = join(dataDir, 'vendor')
mkdirSync(vendorDir, { recursive: true })

async function main() {
  console.log('Fetching CC-CEDICT Cantonese readings…')
  const res = await fetch(MIRROR)
  if (!res.ok) throw new Error(`download failed: ${res.status}`)
  const text = await res.text()
  const rawPath = join(vendorDir, 'cccedict-canto-readings.txt')
  writeFileSync(rawPath, text, 'utf8')

  const entries: Record<
    string,
    { jyutping: string | null; simplified: string | null }
  > = {}
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const m = LINE.exec(line.trim())
    if (!m) continue
    const [, trad, simp, , jp] = m
    if ([...trad].length > 4) continue
    if (entries[trad]) continue
    const jyutping = jp.trim() || null
    if (!jyutping) continue
    entries[trad] = {
      jyutping,
      simplified: simp === trad ? null : simp,
    }
  }

  const packed = {
    source: 'CC-CEDICT-Cantonese-Readings',
    license: 'CC-BY-SA-3.0',
    attribution:
      'CC-CEDICT Cantonese readings © 2015 Pleco Inc. https://cccanto.org/',
    version: '2015-09-23',
    entryCount: Object.keys(entries).length,
    entries,
  }

  const jsonPath = join(dataDir, 'cc-cedict-readings.json')
  const gzPath = join(dataDir, 'cc-cedict-readings.json.gz')
  writeFileSync(jsonPath, JSON.stringify(packed), 'utf8')
  await pipeline(
    Readable.from([JSON.stringify(packed)]),
    createGzip({ level: 9 }),
    createWriteStream(gzPath),
  )
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
