/**
 * Downloadable Cantonese offline packs for the PWA (phrases + optional CC-Canto).
 * Public, unmetered — dictionary data only; no model / Azure.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cantoDataDir } from './canto/dataDir.js'
import { exportCcCantoEntries, exportSeedGloss, glossStats } from './canto/gloss.js'

export const OFFLINE_PACK_VERSION = 1

export type OfflinePackId = 'essentials' | 'full'

type PhraseRow = {
  id?: string
  sourceLang: string
  targetLang: string
  source: string
  text: string
  alternatives?: string[]
}

type PhrasesFile = { version: number; entries: PhraseRow[] }

export type OfflinePackPayload = {
  version: number
  id: OfflinePackId
  builtAt: string
  phrases: PhraseRow[]
  seed: Record<string, string>
  glossEntries?: Record<string, { gloss: string; jyutping: string | null }>
  attribution: string[]
}

type ManifestPack = {
  id: OfflinePackId
  version: number
  approxBytes: number
  label: string
  description: string
  includesCcCanto: boolean
}

let phrasesCache: PhraseRow[] | null = null
let essentialsCache: OfflinePackPayload | null = null
let fullCache: OfflinePackPayload | null = null

function loadYuePhrases(): PhraseRow[] {
  if (phrasesCache) return phrasesCache
  const raw = JSON.parse(readFileSync(join(cantoDataDir(), 'phrases.json'), 'utf8')) as PhrasesFile
  phrasesCache = (raw.entries || []).filter(
    (e) =>
      (e.sourceLang === 'en' && e.targetLang === 'yue') ||
      (e.sourceLang === 'yue' && e.targetLang === 'en'),
  )
  return phrasesCache
}

function attributionLines(): string[] {
  const stats = glossStats()
  return [
    'JyutTranslate curated phrase memory (en↔yue)',
    ...(stats.attributions as string[]),
  ]
}

function buildEssentials(): OfflinePackPayload {
  if (essentialsCache) return essentialsCache
  const payload: OfflinePackPayload = {
    version: OFFLINE_PACK_VERSION,
    id: 'essentials',
    builtAt: new Date().toISOString(),
    phrases: loadYuePhrases(),
    seed: exportSeedGloss(),
    attribution: attributionLines(),
  }
  essentialsCache = payload
  return payload
}

function buildFull(): OfflinePackPayload {
  if (fullCache) return fullCache
  const glossEntries = exportCcCantoEntries() || {}
  const base = buildEssentials()
  const payload: OfflinePackPayload = {
    ...base,
    id: 'full',
    builtAt: new Date().toISOString(),
    glossEntries,
    attribution: attributionLines(),
  }
  fullCache = payload
  return payload
}

function byteLengthOf(payload: OfflinePackPayload): number {
  return Buffer.byteLength(JSON.stringify(payload), 'utf8')
}

export function offlinePackManifest(): {
  version: number
  packs: ManifestPack[]
  note: string
} {
  const essentials = buildEssentials()
  const full = buildFull()
  return {
    version: OFFLINE_PACK_VERSION,
    packs: [
      {
        id: 'essentials',
        version: OFFLINE_PACK_VERSION,
        approxBytes: byteLengthOf(essentials),
        label: 'Essentials',
        description: 'Curated en↔yue phrases + seed particles for offline dictionary translate.',
        includesCcCanto: false,
      },
      {
        id: 'full',
        version: OFFLINE_PACK_VERSION,
        approxBytes: byteLengthOf(full),
        label: 'Full dictionary',
        description: 'Essentials plus CC-Canto headwords for broader offline lookup.',
        includesCcCanto: true,
      },
    ],
    note: 'Offline packs cover dictionary / phrase lookup only — not live mic, TTS, Cam, or AI translate.',
  }
}

export function getOfflinePack(id: OfflinePackId): OfflinePackPayload {
  if (id === 'full') return buildFull()
  return buildEssentials()
}

export function isOfflinePackId(value: string): value is OfflinePackId {
  return value === 'essentials' || value === 'full'
}
