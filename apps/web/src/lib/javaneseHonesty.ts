/**
 * Light Javanese learner honesty for Details — undha-usuk speech levels.
 * Compact UI stays Latin Javanese only (no chips, no IPA, no tone digits).
 */

export type JavaneseSpeechLevel = 'ngoko' | 'madya' | 'krama' | 'mixed'

export const JAVANESE_HONESTY_NOTE =
  'Central/East Java colloquial (ngoko) by default. Undha-usuk: ngoko with peers; madya mid-polite; krama more respectful — when pronouns/negation cue a level.'

/** Ngoko / intimate pronouns & everyday forms. */
const NGOKO_CUE =
  /(^|[^\p{L}])(aku|kowe|koe|awakmu|dheweke|ora|piye|ngene|ngono|arep|wis|lagi|mangan|ngomong|lunga|teka|nang|endi|suwun|yaiku|opo)(?=[^\p{L}]|$)/iu

/** Madya mid-polite address / forms. */
const MADYA_CUE =
  /(^|[^\p{L}])(sampeyan|napa|menika|punika)(?=[^\p{L}]|$)/iu

/** Krama respectful pronouns & forms. */
const KRAMA_CUE =
  /(^|[^\p{L}])(kula|panjenengan|njenengan|mboten|inggih|menapa|wonten|badhe|sampun|rawuh|tindak|nedha|nedhi|ngendika|kersa|monggo|nyuwun|sugeng)(?=[^\p{L}]|$)/iu

/** Full phrase often taught as krama thanks. */
const KRAMA_PHRASE = /\bmatur\s+nuwun\b/iu

export function javaneseBareWord(word: string): string {
  return word.trim().replace(/^[^A-Za-zÀ-ÿ]+|[^A-Za-zÀ-ÿ]+$/g, '')
}

/** Heuristic undha-usuk cue from Latin Javanese surface forms. */
export function detectJavaneseSpeechLevel(text: string): JavaneseSpeechLevel | null {
  const t = text.trim()
  if (!t || !/[\p{L}]/u.test(t)) return null
  const ngoko = NGOKO_CUE.test(t)
  const madya = MADYA_CUE.test(t)
  const krama = KRAMA_CUE.test(t) || KRAMA_PHRASE.test(t)
  const levels = [ngoko, madya, krama].filter(Boolean).length
  if (levels >= 2) return 'mixed'
  if (krama) return 'krama'
  if (madya) return 'madya'
  if (ngoko) return 'ngoko'
  return null
}

export function javaneseSpeechLevelLabel(level: JavaneseSpeechLevel): string {
  switch (level) {
    case 'ngoko':
      return 'Ngoko (colloquial)'
    case 'madya':
      return 'Madya (mid-polite)'
    case 'krama':
      return 'Krama (respectful)'
    case 'mixed':
      return 'Mixed undha-usuk'
  }
}

export function javaneseSpeechLevelChip(level: JavaneseSpeechLevel): string {
  switch (level) {
    case 'ngoko':
      return 'Ngoko'
    case 'madya':
      return 'Madya'
    case 'krama':
      return 'Krama'
    case 'mixed':
      return 'Mixed'
  }
}
