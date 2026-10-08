export type OfflinePackId = 'essentials' | 'full'

export type PhraseEntry = {
  id?: string
  sourceLang: string
  targetLang: string
  source: string
  text: string
  alternatives?: string[]
}

export type GlossEntry = {
  gloss: string
  jyutping: string | null
}

export type OfflinePackPayload = {
  version: number
  id: string
  builtAt: string
  phrases: PhraseEntry[]
  seed: Record<string, string>
  glossEntries?: Record<string, GlossEntry>
  attribution?: string[]
}

export type InstalledPackMeta = {
  id: string
  version: number
  builtAt: string
  bytes: number
}
