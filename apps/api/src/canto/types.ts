/** Target language for translation memory / future Mandarin support. */
export type TargetLang = 'yue' | 'cmn' | 'wuu' | 'en'

export type PhraseRegister = 'colloquial' | 'formal' | 'neutral'

export type PhraseEntry = {
  id: string
  sourceLang: 'en' | 'yue' | 'cmn' | 'wuu' | 'wuu' | 'wuu'
  targetLang: TargetLang
  /** Normalized lookup key is derived from `source` at load time. */
  source: string
  text: string
  alternatives?: string[]
  /** Wugniu (or other) romanization for the target phrase when curated. */
  romanization?: string
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

