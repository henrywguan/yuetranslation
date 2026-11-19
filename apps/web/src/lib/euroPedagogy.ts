/**
 * Polish / Romanian / Czech / Greek / Hungarian / Swedish Details helpers —
 * informal vs formal address chips + stress / orthography honesty.
 * Compact panes stay orthography only (Greek stays Greek script; no Greeklish / IPA / tone digits).
 */
import { detectAddress, type AddressHit, type AddressRule } from './langFamilyAddress'

export type EuroLang = 'pl' | 'ro' | 'cs' | 'el' | 'hu' | 'sv'

export const EURO_HTML_LANG: Record<EuroLang, string> = {
  pl: 'pl-PL',
  ro: 'ro-RO',
  cs: 'cs-CZ',
  el: 'el-GR',
  hu: 'hu-HU',
  sv: 'sv-SE',
}

export const EURO_HONESTY_NOTE: Record<EuroLang, string> = {
  pl: 'Polish stress almost always falls on the second-to-last syllable; ą ę are nasal vowels and ł sounds like English “w”. Spelling is close to speech. Polish is not tonal.',
  ro: 'Romanian stress is not marked in spelling and is not fully predictable; ș ț take a comma below (not a cedilla), and ă, â / î are distinct vowels. Romanian is not tonal.',
  cs: 'Czech stress is always on the first syllable; the čárka (á é í ó ú ů ý) marks vowel length, not stress, and ř is its own sound. Czech is not Slovak and is not tonal.',
  el: 'Modern Greek marks stress with one accent (τόνος) on each word of two or more syllables — it shows stress, not pitch or tone. Several spellings share a sound (ι η υ ει οι are all “i”).',
  hu: 'Hungarian stress is always on the first syllable; the accents (á é í ó ő ú ű) mark vowel length, not stress, and suffixes follow vowel harmony. Hungarian is not tonal.',
  sv: 'Swedish has a pitch accent (accent 1 vs 2: anden “the duck” vs anden “the spirit”) — a word melody, not lexical tone like Cantonese, and spelling does not mark it. Long vs short vowels matter.',
}

const RULES: Record<EuroLang, AddressRule[]> = {
  pl: [
    { kind: 'ty', chip: 'ty', label: 'ty (informal)', forms: ['ty', 'ciebie', 'cię', 'tobie', 'tobą', 'twój', 'twoja', 'twoje', 'twoi', 'twojego', 'twojej', 'jesteś'] },
    { kind: 'pan', chip: 'Pan / Pani', label: 'Pan / Pani (formal)', forms: ['pan', 'pani', 'pana', 'panu', 'panem', 'panią', 'państwo', 'państwa', 'państwu'] },
  ],
  ro: [
    { kind: 'tu', chip: 'tu', label: 'tu (informal)', forms: ['tu', 'tine', 'ție', 'tău', 'tale', 'ești'] },
    { kind: 'dvs', chip: 'dumneavoastră', label: 'dumneavoastră (formal)', forms: ['dumneavoastră', 'dvs\\.?', 'dumneata'] },
  ],
  cs: [
    { kind: 'ty', chip: 'ty', label: 'ty (informal)', forms: ['ty', 'tebe', 'tobě', 'tebou', 'tvůj', 'tvoje', 'tvá', 'tvé', 'tvého', 'jsi'] },
    { kind: 'vy', chip: 'Vy', label: 'Vy (formal / plural)', forms: ['vy', 'vás', 'vám', 'vámi', 'váš', 'vaše', 'vašeho', 'jste'] },
  ],
  el: [
    { kind: 'esy', chip: 'εσύ', label: 'εσύ (informal)', forms: ['εσύ', 'εσένα', 'σου'] },
    { kind: 'eseis', chip: 'εσείς', label: 'εσείς (formal / plural)', forms: ['εσείς', 'εσάς', 'σας'] },
  ],
  hu: [
    { kind: 'te', chip: 'te', label: 'te (informal)', forms: ['te', 'téged', 'neked', 'veled', 'tiéd', 'tőled', 'hozzád', 'nálad'] },
    { kind: 'on', chip: 'Ön', label: 'Ön (formal)', forms: ['ön', 'önt', 'önnek', 'önök', 'önnel', 'öné', 'önöket'] },
  ],
  sv: [
    { kind: 'du', chip: 'du', label: 'du (everyday default)', forms: ['du', 'dig', 'din', 'ditt', 'dina'] },
    { kind: 'ni', chip: 'ni', label: 'ni (plural / rare formal)', forms: ['ni', 'er', 'ert', 'era'] },
  ],
}

const SCRIPT: Partial<Record<EuroLang, RegExp>> = { el: /[\u0370-\u03FF\u1F00-\u1FFF]/ }

/** Best-effort informal / formal detection for Details chips. */
export function detectEuroAddress(text: string, lang: EuroLang): AddressHit | null {
  return detectAddress(text, RULES[lang], { caseInsensitive: true, script: SCRIPT[lang] })
}
