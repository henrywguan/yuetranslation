/** Target language for translation memory / future Mandarin support. */
export type TargetLang = 'yue' | 'cmn' | 'wuu' | 'en' | 'tl'

export type PhraseRegister = 'colloquial' | 'formal' | 'neutral'

export type PhraseEntry = {
  id: string
  sourceLang: 'en' | 'yue' | 'cmn' | 'wuu' | 'tl'
  targetLang: TargetLang
  /** Normalized lookup key is derived from `source` at load time. */
  source: string
  text: string
  alternatives?: string[]
  /** Wugniu (or other) romanization for the target phrase when curated. */
  romanization?: string
  /**
   * Wugniu for each `alternatives` entry (same order). Prefer looking up another
   * seeded phrase’s romanization when the alt Han matches; this field fills gaps.
   */
  alternativeRomanizations?: string[]
  /**
   * Compact sandhi-domain hint for Shanghainese (e.g. "left-dominant · word").
   * Pedagogy only — never invent per-syllable tone digits.
   */
  sandhiHint?: string
  /** Optional IPA for details pane (not the compact Solo line). */
  ipa?: string
  register?: PhraseRegister
  tags?: string[]
}

export type TranslateStage = 'interim' | 'final'

export type PostProcessMeta = {
  dictionaryHit: boolean
  scrubbed: boolean
  colloquialScore: number
  /** Share of Han chars covered by CC-Canto/seed headwords (finals). */
  attestationCoverage?: number
  rewritten: boolean
  notes: string[]
}
