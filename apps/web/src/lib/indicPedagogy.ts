/**
 * Telugu / Gujarati / Kannada / Malayalam / Marathi / Punjabi / Odia / Sinhala / Nepali
 * Details helpers — address chips + honesty.
 * Compact panes stay native script only (no ISO 15919 / Latin).
 * Each language keeps its own pronouns; never folded into Tamil / Bengali / Hindi.
 */
import { detectAddress, type AddressHit, type AddressRule } from './langFamilyAddress'
import type { IndicIsoLang } from './indicIso15919'

export type IndicLang = IndicIsoLang

export const INDIC_HTML_LANG: Record<IndicLang, string> = {
  te: 'te-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  mr: 'mr-IN',
  pa: 'pa-IN',
  or: 'or-IN',
  si: 'si-LK',
  ne: 'ne-NP',
}

export const INDIC_HONESTY_NOTE: Record<IndicLang, string> = {
  te: 'Telugu spelling is close to speech; the ISO 15919 reading marks long vowels (ā ē ō) and retroflexes (ṭ ḍ ṇ ḷ). Compact shows Telugu script only — not Latin, Kannada, or Tamil. Telugu is not tonal.',
  gu: 'Gujarati speech often drops the final inherent “a” (ઘર sounds like “ghar”); the ISO 15919 reading follows spelling, not speech. Compact shows Gujarati script only — not Devanagari / Hindi. Gujarati is not tonal.',
  kn: 'Kannada spelling is close to speech; the ISO 15919 reading marks long vowels (ā ē ō) and retroflexes (ṭ ḍ ṇ ḷ). Compact shows Kannada script only — not Latin, Telugu, or Tamil. Kannada is not tonal.',
  ml: 'Malayalam spelling is close to speech; the ISO 15919 reading marks long vowels (ā ī ū ē ō), retroflexes (ṭ ḍ ṇ ḷ), ḻ (ഴ) and ṟ (റ). Chillu letters (ൺ ൻ ർ ൽ ൾ ൿ) read as ṇ n r l ḷ k. Compact shows Malayalam script only — not Latin (Manglish), Tamil, or Telugu. Malayalam is not tonal.',
  mr: 'Marathi uses Devanagari but is not Hindi: ळ (ḷ) is its own letter and schwa deletion differs from Hindi, so the ISO 15919 reading follows spelling, not speech. Compact shows Devanagari script only — not Latin or Hindi. Marathi is not tonal.',
  pa: 'Punjabi is tonal: it has three tones (level, rising, falling) that spelling shows only through ਘ ਝ ਢ ਧ ਭ and ਹ — the ISO 15919 reading follows spelling and does not mark tone. Tippi ੰ / bindi ਂ read as nasal ṁ. Compact shows Gurmukhi script only — not Shahmukhi, Devanagari, or Latin.',
  or: 'Odia spelling follows speech closely; the ISO 15919 reading marks long vowels (ā ī ū), retroflexes (ṭ ḍ ṇ ḷ) and ṛ for ଡ଼ ଢ଼. Compact shows Odia script only — not Latin, Bengali, or Devanagari. Odia is not tonal.',
  si: 'Sinhala is diglossic — written (literary) forms differ from spoken Sinhala — so the ISO 15919 reading follows spelling, not speech. It marks long vowels (ā ī ū ē ō) and æ ǣ. Compact shows Sinhala script only — not Latin (Singlish), Tamil, or Devanagari. Sinhala is not tonal.',
  ne: 'Nepali uses Devanagari but is not Hindi: honorific levels (तँ / तिमी / तपाईं / हजुर) are grammatical and verbs agree with them. The ISO 15919 reading follows spelling, not speech. Compact shows Devanagari script only — not Latin, Hindi, or Marathi. Nepali is not tonal.',
}

const SCRIPT: Record<IndicLang, RegExp> = {
  te: /[\u0C00-\u0C7F]/,
  gu: /[\u0A80-\u0AFF]/,
  kn: /[\u0C80-\u0CFF]/,
  ml: /[\u0D00-\u0D7F]/,
  mr: /[\u0900-\u097F]/,
  pa: /[\u0A00-\u0A7F]/,
  or: /[\u0B00-\u0B7F]/,
  si: /[\u0D80-\u0DFF]/,
  ne: /[\u0900-\u097F]/,
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
  ml: [
    { kind: 'thaankal', chip: 'താങ്കൾ', label: 'താങ്കൾ (honorific)', forms: ['താങ്കൾ', 'താങ്കള്‍', 'താങ്കളുടെ', 'താങ്കളെ', 'താങ്കൾക്ക്'] },
    { kind: 'ningal', chip: 'നിങ്ങൾ', label: 'നിങ്ങൾ (respectful / plural)', forms: ['നിങ്ങൾ', 'നിങ്ങള്‍', 'നിങ്ങളുടെ', 'നിങ്ങളെ', 'നിങ്ങൾക്ക്', 'നിങ്ങളോട്'] },
    { kind: 'nee', chip: 'നീ', label: 'നീ (familiar)', forms: ['നീ', 'നിന്റെ', 'നിനക്ക്', 'നിന്നെ', 'നിന്നോട്'] },
  ],
  mr: [
    { kind: 'aapan', chip: 'आपण', label: 'आपण (polite / inclusive “we”)', forms: ['आपण', 'आपल्याला', 'आपला', 'आपली', 'आपले', 'आपल्या'] },
    { kind: 'tumhi', chip: 'तुम्ही', label: 'तुम्ही (respectful / plural)', forms: ['तुम्ही', 'तुम्हाला', 'तुमचा', 'तुमची', 'तुमचे', 'तुमच्या', 'तुमचं'] },
    { kind: 'tu', chip: 'तू', label: 'तू (familiar)', forms: ['तू', 'तुला', 'तुझा', 'तुझी', 'तुझे', 'तुझ्या', 'तुझं'] },
  ],
  pa: [
    { kind: 'aap', chip: 'ਆਪ', label: 'ਆਪ (honorific)', forms: ['ਆਪ', 'ਆਪਨੂੰ', 'ਆਪਦਾ', 'ਆਪਦੀ', 'ਆਪਜੀ'] },
    { kind: 'tusi', chip: 'ਤੁਸੀਂ', label: 'ਤੁਸੀਂ (respectful / plural)', forms: ['ਤੁਸੀਂ', 'ਤੁਹਾਨੂੰ', 'ਤੁਹਾਡਾ', 'ਤੁਹਾਡੀ', 'ਤੁਹਾਡੇ'] },
    { kind: 'tu', chip: 'ਤੂੰ', label: 'ਤੂੰ (familiar)', forms: ['ਤੂੰ', 'ਤੈਨੂੰ', 'ਤੇਰਾ', 'ਤੇਰੀ', 'ਤੇਰੇ'] },
  ],
  or: [
    { kind: 'apana', chip: 'ଆପଣ', label: 'ଆପଣ (honorific)', forms: ['ଆପଣ', 'ଆପଣଙ୍କ', 'ଆପଣଙ୍କୁ', 'ଆପଣଙ୍କର'] },
    { kind: 'tume', chip: 'ତୁମେ', label: 'ତୁମେ (familiar / plural)', forms: ['ତୁମେ', 'ତୁମକୁ', 'ତୁମର', 'ତୁମ'] },
    { kind: 'tu', chip: 'ତୁ', label: 'ତୁ (intimate)', forms: ['ତୁ', 'ତୋତେ', 'ତୋର', 'ତୋ'] },
  ],
  si: [
    { kind: 'obathuma', chip: 'ඔබතුමා', label: 'ඔබතුමා / ඔබතුමිය (very formal)', forms: ['ඔබතුමා', 'ඔබතුමිය', 'ඔබතුමාගේ', 'ඔබතුමියගේ'] },
    { kind: 'oba', chip: 'ඔබ', label: 'ඔබ (polite)', forms: ['ඔබ', 'ඔබේ', 'ඔබට', 'ඔබව', 'ඔබගේ'] },
    { kind: 'oya', chip: 'ඔයා', label: 'ඔයා (familiar)', forms: ['ඔයා', 'ඔයාට', 'ඔයාගේ', 'ඔයාව', 'ඔයාලා', 'ඔයාලට'] },
  ],
  ne: [
    { kind: 'hajur', chip: 'हजुर', label: 'हजुर (very honorific)', forms: ['हजुर', 'हजूर', 'हजुरको', 'हजुरलाई'] },
    { kind: 'tapai', chip: 'तपाईं', label: 'तपाईं (respectful)', forms: ['तपाईं', 'तपाई', 'तपाईंलाई', 'तपाईंको', 'तपाईंहरू'] },
    { kind: 'timi', chip: 'तिमी', label: 'तिमी (familiar)', forms: ['तिमी', 'तिमीलाई', 'तिम्रो', 'तिम्रा', 'तिम्री', 'तिमीहरू'] },
    { kind: 'ta', chip: 'तँ', label: 'तँ (intimate / rude to strangers)', forms: ['तँ', 'तँलाई', 'तेरो'] },
  ],
}

/** Best-effort address detection from pronoun forms; null when there is no clear cue. */
export function detectIndicAddress(text: string, lang: IndicLang): AddressHit | null {
  return detectAddress(text, RULES[lang], { script: SCRIPT[lang] })
}
