/**
 * Polish / Romanian / Czech / Greek / Hungarian / Swedish / Danish / Norwegian (Bokmål) / Finnish /
 * Slovak / Croatian / Catalan Details helpers —
 * informal vs formal address chips + stress / orthography honesty.
 * Compact panes stay orthography only (Greek stays Greek script; no Greeklish / IPA / tone digits).
 */
import { detectAddress, type AddressHit, type AddressRule } from './langFamilyAddress'

export type EuroLang = 'pl' | 'ro' | 'cs' | 'el' | 'hu' | 'sv' | 'da' | 'nb' | 'fi' | 'sk' | 'hr' | 'ca'

export const EURO_HTML_LANG: Record<EuroLang, string> = {
  pl: 'pl-PL',
  ro: 'ro-RO',
  cs: 'cs-CZ',
  el: 'el-GR',
  hu: 'hu-HU',
  sv: 'sv-SE',
  da: 'da-DK',
  nb: 'nb-NO',
  fi: 'fi-FI',
  sk: 'sk-SK',
  hr: 'hr-HR',
  ca: 'ca-ES',
}

export const EURO_HONESTY_NOTE: Record<EuroLang, string> = {
  pl: 'Polish stress almost always falls on the second-to-last syllable; ą ę are nasal vowels and ł sounds like English “w”. Spelling is close to speech. Polish is not tonal.',
  ro: 'Romanian stress is not marked in spelling and is not fully predictable; ș ț take a comma below (not a cedilla), and ă, â / î are distinct vowels. Romanian is not tonal.',
  cs: 'Czech stress is always on the first syllable; the čárka (á é í ó ú ů ý) marks vowel length, not stress, and ř is its own sound. Czech is not Slovak and is not tonal.',
  el: 'Modern Greek marks stress with one accent (τόνος) on each word of two or more syllables — it shows stress, not pitch or tone. Several spellings share a sound (ι η υ ει οι are all “i”).',
  hu: 'Hungarian stress is always on the first syllable; the accents (á é í ó ő ú ű) mark vowel length, not stress, and suffixes follow vowel harmony. Hungarian is not tonal.',
  sv: 'Swedish has a pitch accent (accent 1 vs 2: anden “the duck” vs anden “the spirit”) — a word melody, not lexical tone like Cantonese, and spelling does not mark it. Long vs short vowels matter.',
  da: 'Danish spelling is far from speech: many letters are silent or softened, and the stød (a glottal catch) is not written. æ ø å are separate letters. du is the everyday default; formal De is rare. Danish is not tonal.',
  nb: 'Norwegian Bokmål has a pitch accent (accent 1 vs 2) — a word melody, not lexical tone like Cantonese, and spelling does not mark it. æ ø å are separate letters. du is the everyday default; formal De is rare. This is Bokmål (nb), not Nynorsk.',
  fi: 'Finnish spelling is almost phonetic; stress is always on the first syllable and vowel / consonant length matters (tuli, tuuli, tulli). ä ö are separate vowels (not umlauts of a o) and vowel harmony governs suffixes. Finnish has no grammatical gender and is not tonal.',
  sk: 'Slovak stress is always on the first syllable; the dĺžeň (á é í ó ú ý ŕ ĺ) marks vowel length, not stress, and ä ô ľ are Slovak-specific letters. Slovak is not Czech and is not tonal.',
  hr: 'Croatian spelling is phonetic (one letter, one sound); č ć đ š ž and dž are separate letters. It has a pitch accent that spelling does not mark — not lexical tone like Cantonese. Standard Croatian is written in Latin script.',
  ca: 'Catalan marks stress with accents (à è é í ò ó ú), uses ç, l·l and ny, and reduces vowels in unstressed syllables, so spelling is not always speech. Catalan is its own language, not Spanish, and is not tonal. tu is informal; vostè is formal.',
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
  da: [
    { kind: 'du', chip: 'du', label: 'du (everyday default)', forms: ['du', 'dig', 'din', 'dit', 'dine'] },
    { kind: 'i', chip: 'I / jer', label: 'I / jer (plural “you”)', forms: ['jer', 'jeres'] },
  ],
  nb: [
    { kind: 'du', chip: 'du', label: 'du (everyday default)', forms: ['du', 'deg', 'din', 'ditt', 'dine', 'di'] },
    { kind: 'dere', chip: 'dere', label: 'dere (plural “you”)', forms: ['dere'] },
  ],
  fi: [
    { kind: 'sina', chip: 'sinä', label: 'sinä (informal)', forms: ['sinä', 'sinua', 'sinulle', 'sinun', 'sinut', 'sinulta', 'sinulla', 'sinussa', 'sä', 'sua', 'sulle'] },
    { kind: 'te', chip: 'te', label: 'te (formal / plural)', forms: ['te', 'teitä', 'teille', 'teidän', 'teiltä', 'teillä', 'teissä'] },
  ],
  sk: [
    { kind: 'ty', chip: 'ty', label: 'ty (informal)', forms: ['ty', 'teba', 'tebe', 'tebou', 'tvoj', 'tvoja', 'tvoje', 'tvoji', 'tvojho'] },
    { kind: 'vy', chip: 'Vy', label: 'Vy (formal / plural)', forms: ['vy', 'vás', 'vám', 'vami', 'váš', 'vaša', 'vaše', 'ste'] },
  ],
  hr: [
    { kind: 'ti', chip: 'ti', label: 'ti (informal)', forms: ['ti', 'tebe', 'tebi', 'tobom', 'tvoj', 'tvoja', 'tvoje', 'tvoji', 'tvojeg'] },
    { kind: 'vi', chip: 'Vi', label: 'Vi (formal / plural)', forms: ['vi', 'vas', 'vama', 'vaš', 'vaša', 'vaše', 'vaši', 'vašeg'] },
  ],
  ca: [
    { kind: 'tu', chip: 'tu', label: 'tu (informal)', forms: ['tu', 'teu', 'teva', 'teus', 'teves', 'ets'] },
    { kind: 'voste', chip: 'vostè', label: 'vostè (formal)', forms: ['vostè', 'vostès'] },
  ],
}

const SCRIPT: Partial<Record<EuroLang, RegExp>> = { el: /[\u0370-\u03FF\u1F00-\u1FFF]/ }

/** Best-effort informal / formal detection for Details chips. */
export function detectEuroAddress(text: string, lang: EuroLang): AddressHit | null {
  return detectAddress(text, RULES[lang], { caseInsensitive: true, script: SCRIPT[lang] })
}
