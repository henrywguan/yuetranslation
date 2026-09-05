export type DetailLayer =
  | {
      kind: 'phrase'
      /** Phrase under study (Cantonese or English). */
      phrase: string
      /** Which learner panel to show. Auto-detected from script when omitted. */
      lang?: 'en' | 'yue'
      translation?: string
      definition?: string
      /** Multiple learner senses listed in the details pane / drawer. */
      definitions?: string[]
      /** Other renderings when known (粵 variants or English paraphrases). */
      alternatives?: string[]
    }
  | {
      kind: 'char'
      char: string
      /** Yue: Jyutping. En: IPA. */
      jp: string | null
      phrase: string
      lang?: 'en' | 'yue'
      definition?: string
      /** Sense for this character/word when known. */
      sense?: string
    }
