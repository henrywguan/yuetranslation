/**
 * Hebrew / Persian / Urdu / Pashto Details helpers — honesty notes + optional address chips.
 * Compact panes stay RTL native script only (no transliteration, no niqqud / tashkeel added).
 * Persian is never treated as Arabic; Urdu is never shown as Hindi / Devanagari; Pashto is never folded into Persian / Dari.
 */
import { detectAddress, type AddressHit, type AddressRule } from './langFamilyAddress'

export type RtlFamilyLang = 'he' | 'fa' | 'ur' | 'ps'

export const RTL_HTML_LANG: Record<RtlFamilyLang, string> = { he: 'he-IL', fa: 'fa-IR', ur: 'ur-IN', ps: 'ps-AF' }

export const RTL_HONESTY_NOTE: Record<RtlFamilyLang, string> = {
  he: 'Everyday Modern Hebrew is written without vowel points (niqqud), so one spelling can have several readings; stress usually falls on the last syllable. Hebrew is not tonal.',
  fa: 'Persian uses Perso-Arabic script with its own letters (پ چ ژ گ) and usually no short-vowel marks, so readings are learned per word. Persian is an Indo-European language — not Arabic — and is not tonal.',
  ur: 'Urdu is written right-to-left in Nastaliq-style Perso-Arabic script, usually without short-vowel marks. Spoken Urdu is close to Hindi, but Urdu here is never shown in Devanagari. Urdu is not tonal.',
  ps: 'Pashto is written right-to-left in Perso-Arabic script with extra letters (ټ ډ ړ ږ ښ ڼ ځ څ ې ۍ ګ) and usually no short-vowel marks. It is an Iranian language — not Arabic, Persian or Dari — with split-ergative grammar. Compact shows Pashto script only (no Latin line). Pashto is not tonal.',
}

const SCRIPT: Record<RtlFamilyLang, RegExp> = {
  he: /[\u0590-\u05FF]/,
  fa: /[\u0600-\u06FF]/,
  ur: /[\u0600-\u06FF]/,
  ps: /[\u0600-\u06FF]/,
}

/**
 * Hebrew marks gender, not formality, and its את / אתה overlap the object marker,
 * so it gets no chip. Persian تو and Urdu تو double as “in” / “then”, so only the
 * unambiguous forms are matched.
 */
const RULES: Record<RtlFamilyLang, AddressRule[]> = {
  he: [],
  fa: [
    { kind: 'shoma', chip: 'شما', label: 'شما (polite / plural)', forms: ['شما', 'شمارا', 'شماها'] },
    { kind: 'to', chip: 'تو', label: 'تو (informal)', forms: ['تورا', 'تو\\s+(?:هستی|خوبی|کجایی|چطوری|می‌دانی|میدونی)'] },
  ],
  ur: [
    { kind: 'aap', chip: 'آپ', label: 'آپ (respectful)', forms: ['آپ', 'آپکا', 'آپکی', 'آپکے', 'آپکو'] },
    { kind: 'tum', chip: 'تم', label: 'تم (familiar)', forms: ['تم', 'تمہارا', 'تمہاری', 'تمہارے', 'تمہیں'] },
  ],
  ps: [
    { kind: 'taso', chip: 'تاسو', label: 'تاسو (polite / plural)', forms: ['تاسو', 'تاسې', 'ستاسو', 'تاسوته'] },
    { kind: 'ta', chip: 'ته', label: 'ته (informal)', forms: ['ستا', 'تا', 'تاته', 'ته\\s+(?:څنګه|ښه|چېرته)'] },
  ],
}

export function detectRtlAddress(text: string, lang: RtlFamilyLang): AddressHit | null {
  if (RULES[lang].length === 0) return null
  return detectAddress(text, RULES[lang], { script: SCRIPT[lang] })
}
