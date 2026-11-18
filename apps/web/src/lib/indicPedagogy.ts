/**
 * Telugu / Gujarati / Kannada Details helpers — address chips + honesty.
 * Compact panes stay native script only (no ISO 15919 / Latin).
 * Each language keeps its own pronouns; never folded into Tamil / Bengali / Hindi.
 */
import { detectAddress, type AddressHit, type AddressRule } from './langFamilyAddress'
import type { IndicIsoLang } from './indicIso15919'

export type IndicLang = IndicIsoLang

export const INDIC_HTML_LANG: Record<IndicLang, string> = { te: 'te-IN', gu: 'gu-IN', kn: 'kn-IN' }

export const INDIC_HONESTY_NOTE: Record<IndicLang, string> = {
  te: 'Telugu spelling is close to speech; the ISO 15919 reading marks long vowels (ā ē ō) and retroflexes (ṭ ḍ ṇ ḷ). Compact shows Telugu script only — not Latin, Kannada, or Tamil. Telugu is not tonal.',
  gu: 'Gujarati speech often drops the final inherent “a” (ઘર sounds like “ghar”); the ISO 15919 reading follows spelling, not speech. Compact shows Gujarati script only — not Devanagari / Hindi. Gujarati is not tonal.',
  kn: 'Kannada spelling is close to speech; the ISO 15919 reading marks long vowels (ā ē ō) and retroflexes (ṭ ḍ ṇ ḷ). Compact shows Kannada script only — not Latin, Telugu, or Tamil. Kannada is not tonal.',
}

const SCRIPT: Record<IndicLang, RegExp> = {
  te: /[\u0C00-\u0C7F]/,
  gu: /[\u0A80-\u0AFF]/,
  kn: /[\u0C80-\u0CFF]/,
}

const RULES: Record<IndicLang, AddressRule[]> = {
  te: [
    { kind: 'meeru', chip: 'మీరు', label: 'మీరు (respectful / plural)', forms: ['మీరు', 'మీకు', 'మిమ్మల్ని', 'మీది', 'మీ'] },
    { kind: 'nuvvu', chip: 'నువ్వు', label: 'నువ్వు (familiar)', forms: ['నువ్వు', 'నీకు', 'నిన్ను', 'నీది', 'నీ'] },
  ],
  gu: [
    { kind: 'aap', chip: 'આપ', label: 'આપ (honorific)', forms: ['આપને', 'આપનું', 'આપની', 'આપના', 'આપનો'] },
    { kind: 'tame', chip: 'તમે', label: 'તમે (respectful / plural)', forms: ['તમે', 'તમને', 'તમારું', 'તમારી', 'તમારા', 'તમારો'] },
    { kind: 'tu', chip: 'તું', label: 'તું (intimate)', forms: ['તું', 'તને', 'તારું', 'તારી', 'તારા', 'તારો'] },
  ],
  kn: [
    { kind: 'neevu', chip: 'ನೀವು', label: 'ನೀವು (respectful / plural)', forms: ['ನೀವು', 'ನಿಮಗೆ', 'ನಿಮ್ಮ', 'ನಿಮ್ಮನ್ನು'] },
    { kind: 'neenu', chip: 'ನೀನು', label: 'ನೀನು (familiar)', forms: ['ನೀನು', 'ನಿನಗೆ', 'ನಿನ್ನ', 'ನಿನ್ನನ್ನು'] },
  ],
}

/** Best-effort address detection from pronoun forms; null when there is no clear cue. */
export function detectIndicAddress(text: string, lang: IndicLang): AddressHit | null {
  return detectAddress(text, RULES[lang], { script: SCRIPT[lang] })
}
