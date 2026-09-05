export type DetailLayer =
  | {
      kind: 'phrase'
      /** Phrase under study (Cantonese, Mandarin, or English). */
      phrase: string
      /** Which learner panel to show. Auto-detected from script when omitted. */
      lang?: 'en' | 'yue' | 'cmn' | 'wuu'
      translation?: string
      definition?: string
      /** Multiple learner senses listed in the details pane / drawer. */
      definitions?: string[]
      /** Other renderings when known (粵/Mandarin variants or English paraphrases). */
      alternatives?: string[]
      /** Wugniu when lang is wuu. */
      romanization?: string
      /** Sandhi-domain hint when lang is wuu. */
      sandhiHint?: string
      /** Optional IPA (details) when lang is wuu. */
      ipa?: string
    }
  | {
      kind: 'char'
      char: string
      /** Yue: Jyutping. Cmn: pinyin (tone marks). En: IPA. */
      jp: string | null
      phrase: string
      lang?: 'en' | 'yue' | 'cmn' | 'wuu'
      definition?: string
      /** Sense for this character/word when known. */
      sense?: string
    }
