export type DetailLayer =
  | {
      kind: 'phrase'
      /** Phrase under study (Cantonese, Mandarin, or English). */
      phrase: string
      /** Which learner panel to show. Auto-detected from script when omitted. */
      lang?: 'en' | 'yue' | 'cmn'
      translation?: string
      definition?: string
      /** Multiple learner senses listed in the details pane / drawer. */
      definitions?: string[]
      /** Other renderings when known (粵/Mandarin variants or English paraphrases). */
      alternatives?: string[]
    }
  | {
      kind: 'char'
      char: string
      /** Yue: Jyutping. Cmn: pinyin (tone marks). En: IPA. */
      jp: string | null
      phrase: string
      lang?: 'en' | 'yue' | 'cmn'
      definition?: string
      /** Sense for this character/word when known. */
      sense?: string
    }
