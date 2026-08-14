/** Target language for translation memory / future Mandarin support. */
export type TargetLang = 'yue' | 'cmn' | 'en'

export type PhraseRegister = 'colloquial' | 'formal' | 'neutral'

export type PhraseEntry = {
  id: string
  sourceLang: 'en' | 'yue' | 'cmn'
  targetLang: TargetLang
  /** Normalized lookup key is derived from `source` at load time. */
  source: string
  text: string
  alternatives?: string[]
  register?: PhraseRegister
  tags?: string[]
}

export type TranslateStage = 'interim' | 'final'

export type PostProcessMeta = {
  dictionaryHit: boolean
  scrubbed: boolean
  colloquialScore: number
  rewritten: boolean
  notes: string[]
}
