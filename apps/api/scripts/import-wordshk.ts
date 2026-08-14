#!/usr/bin/env npx tsx
/**
 * Build wordshk-gloss.json.gz from a local words.hk CSV dump.
 *
 * 1. Request / obtain CSV from https://words.hk/faiman/request_data/
 * 2. Place it at apps/api/src/canto/data/vendor/wordshk.csv
 * 3. Run: npm run import:wordshk
 * 4. Enable only when non-commercial use is allowed:
 *      YUE_ALLOW_NONCOMMERCIAL_DICTS=1
 *      YUE_ENABLE_WORDSHK=1
 *
 * words.hk Non-Commercial Open Data License:
 * https://words.hk/base/hoifong/
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createGzip } from 'node:zlib'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = join(root, 'src/canto/data')
const vendorDir = join(dataDir, 'vendor')
mkdirSync(vendorDir, { recursive: true })

const csvPath = process.argv[2] || join(vendorDir, 'wordshk.csv')

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}

async function main() {
  if (!existsSync(csvPath)) {
    console.error(`Missing ${csvPath}`)
    console.error('Place a words.hk CSV dump there (or pass a path as argv).')
    console.error('Do NOT enable YUE_ENABLE_WORDSHK on commercial products without a license.')
    process.exit(1)
  }

  const text = readFileSync(csvPath, 'utf8')
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'))
  if (!lines.length) throw new Error('empty CSV')

  const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  // words.hk dumps vary; try common column names.
  const idxWord =
    header.findIndex((h) => ['word', 'entry', 'headword', '書面語', '詞'].includes(h)) >= 0
      ? header.findIndex((h) => ['word', 'entry', 'headword', '書面語', '詞'].includes(h))
      : 0
  const idxJp = header.findIndex((h) =>
    ['jyutping', 'pron', 'pronunciation', '粵拼'].includes(h),
  )
  const idxEn = header.findIndex((h) =>
    ['english', 'en', 'translation', 'eng', '英文'].includes(h),
  )
  const idxDef = header.findIndex((h) =>
    ['definition', 'def', '解釋', '釋義', 'content', 'entry_data'].includes(h),
  )

  const entries: Record<
    string,
    { jyutping: string | null; gloss: string; simplified: string | null }
  > = {}

  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line)
    const word = (cols[idxWord] || '').trim()
    if (!word || [...word].length > 4) continue
    const jp = idxJp >= 0 ? (cols[idxJp] || '').trim() : ''
    let gloss = ''
    if (idxEn >= 0) gloss = (cols[idxEn] || '').trim()
    if (!gloss && idxDef >= 0) {
      const raw = cols[idxDef] || ''
      // Prefer a short English-looking fragment if present.
      const en = raw.match(/[A-Za-z][A-Za-z0-9 ,;/'()-]{2,80}/)
      gloss = (en?.[0] || raw.replace(/\s+/g, ' ')).trim().slice(0, 160)
    }
    if (!gloss || entries[word]) continue
    entries[word] = {
      jyutping: jp || null,
      gloss,
      simplified: null,
    }
  }

  const packed = {
    source: 'words.hk',
    license: 'Non-Commercial-Open-Data-1.0',
    attribution:
      'words.hk 粵典 © Hong Kong Lexicography Limited — Non-Commercial Open Data License. https://words.hk/',
    version: 'local-import',
    entryCount: Object.keys(entries).length,
    entries,
  }

  if (packed.entryCount < 10) {
    console.warn(
      `Only ${packed.entryCount} entries parsed — check CSV column layout. Header was: ${header.join(' | ')}`,
    )
  }

  const gzPath = join(dataDir, 'wordshk-gloss.json.gz')
  await pipeline(
    Readable.from([JSON.stringify(packed)]),
    createGzip({ level: 9 }),
    createWriteStream(gzPath),
  )
  writeFileSync(join(vendorDir, 'WORDSHK_NOTICE.txt'), packed.attribution + '\n', 'utf8')
  console.log(`Wrote ${gzPath} (${packed.entryCount} entries)`)
  console.log('Enable with YUE_ALLOW_NONCOMMERCIAL_DICTS=1 and YUE_ENABLE_WORDSHK=1')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
