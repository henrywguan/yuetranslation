/**
 * Polish / Romanian / Czech / Greek / Hungarian / Swedish / Danish / Norwegian (Bokmål) / Finnish /
 * Slovak / Croatian / Catalan / Azerbaijani / Uzbek / Swahili / Afrikaans /
 * Estonian / Latvian / Lithuanian / Irish / Welsh / Basque / Galician / Maltese / Icelandic / Bosnian (Latin) / Albanian / Zulu / Somali Details helpers —
 * informal vs formal address chips + stress / orthography honesty.
 * Compact panes stay orthography only (Greek stays Greek script; no Greeklish / IPA / tone digits).
 */
import { detectAddress, type AddressHit, type AddressRule } from './langFamilyAddress'

export type EuroLang = 'pl' | 'ro' | 'cs' | 'el' | 'hu' | 'sv' | 'da' | 'nb' | 'fi' | 'sk' | 'hr' | 'ca' | 'az' | 'uz' | 'sw' | 'af' | 'et' | 'lv' | 'lt' | 'ga' | 'cy' | 'eu' | 'gl' | 'mt' | 'is' | 'bs' | 'sq' | 'zu' | 'so'

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
  az: 'az-AZ',
  uz: 'uz-UZ',
  sw: 'sw-KE',
  af: 'af-ZA',
  et: 'et-EE',
  lv: 'lv-LV',
  lt: 'lt-LT',
  ga: 'ga-IE',
  cy: 'cy-GB',
  eu: 'eu-ES',
  gl: 'gl-ES',
  mt: 'mt-MT',
  is: 'is-IS',
  bs: 'bs-BA',
  sq: 'sq-AL',
  zu: 'zu-ZA',
  so: 'so-SO',
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
  az: 'Azerbaijani is written here in Latin script with ə ç ğ ı ö ş ü (dotted İ and dotless I are different letters). It has vowel harmony and agglutinative suffixes, with stress usually on the last syllable. It is related to Turkish but is not Turkish, and it is not tonal. sən is informal; siz is formal / plural.',
  uz: 'Uzbek is written here in Latin script (o‘ g‘ sh ch ng), not Cyrillic. It has agglutinative suffixes and stress usually on the last syllable. Uzbek is not tonal. sen is informal; siz is formal / plural.',
  sw: 'Swahili is a Bantu language: nouns belong to classes (m-/wa-, ki-/vi-, …) and verbs agree with them. Spelling is phonetic and stress falls on the second-to-last syllable. Swahili is not tonal. wewe is singular “you”; nyinyi is plural “you”.',
  af: 'Afrikaans grew out of Dutch with much simpler grammar: no grammatical gender and no verb endings by person. g sounds like a throaty “ch” and w like “v”; double negatives are normal. Afrikaans is not tonal. jy is informal “you”; u is formal.',
  et: 'Estonian is a Finnic language (not Indo-European, and not Russian or Latvian): it has no grammatical gender and no future tense, õ is its own vowel, and stress is on the first syllable. Short, long and overlong sounds are distinct but spelling only partly shows them. Estonian is not tonal. sina is informal; teie is formal / plural.',
  lv: 'Latvian is a Baltic language (not Slavic): ā ē ī ū mark long vowels, č ģ ķ ļ ņ š ž are separate letters, and stress is on the first syllable. It has syllable intonations that spelling does not mark — not lexical tone like Cantonese. tu is informal; jūs is formal / plural.',
  lt: 'Lithuanian is a Baltic language (not Slavic) with a free pitch accent that normal spelling does not mark — not lexical tone like Cantonese. ą ę į ų are long vowels, ė and ū are separate letters, and č š ž are separate consonants. tu is informal; jūs is formal / plural.',
  ga: 'Irish has initial mutations (lenition and eclipsis) that change the first letter or sound of a word, and fada accents (á é í ó ú) mark long vowels, so spelling is far from speech. Word order is verb–subject–object. Irish is not tonal. tú is singular “you”; sibh is plural.',
  cy: 'Welsh has initial consonant mutations (soft, nasal, aspirate) that change the first letter of a word; ch dd ff ng ll ph rh th are single letters, and w and y can be vowels. Stress usually falls on the second-to-last syllable. Welsh is not tonal. ti is informal; chi is formal / plural.',
  eu: 'Basque is a language isolate — unrelated to Spanish or French. It is ergative, has no grammatical gender, and builds meaning with case suffixes. Spelling is phonetic (tx ts tz x z are distinct sounds, ñ is used). Basque is not tonal. zu is the everyday polite “you”; hi is a very intimate form; zuek is plural.',
  gl: 'Galician is a Romance language closely related to Portuguese — it is not a dialect of Spanish. x sounds like “sh”, ñ and ll are used, and accents (á é í ó ú) mark stress where the default rule breaks. Galician is not tonal. ti / tu is informal; vostede is formal.',
  mt: 'Maltese is a Semitic language written in Latin script, with many Italian and English loanwords. ċ ġ ħ ż are separate letters, għ is a silent / pharyngeal digraph, q is a glottal stop, and the article assimilates (is-sema, il-bahar). Maltese is not Arabic script and not tonal. inti is singular “you”; intom is plural.',
  is: 'Icelandic keeps four cases, three genders and rich verb endings; þ (thorn) and ð (eth) are separate letters, and stress is always on the first syllable. Spelling is conservative and close to Old Norse. Icelandic is not tonal. þú is singular “you”; þið is plural.',
  bs: 'Bosnian is shown in Latin script only here (it also has a Cyrillic tradition this app does not use). Spelling is phonetic; č ć đ š ž and dž are separate letters, and ije / je reflexes (mlijeko, vrijeme) are typical. It has a pitch accent that spelling does not mark — not lexical tone like Cantonese. Bosnian is not Croatian or Serbian. ti is informal; vi is formal / plural.',
  sq: 'Albanian is its own branch of Indo-European, with Gheg and Tosk dialects — the standard is Tosk-based. ë and ç are separate letters and the definite article is a suffix (-i, -a, -u, -ja). Albanian is not tonal. ti is informal; ju is formal / plural.',
  zu: 'Zulu is a Bantu language: nouns belong to classes (umu- / aba-, isi- / izi-, …) and verbs agree with them. c q x are click sounds. Zulu is tonal, but tone is not written in everyday spelling. wena is singular “you”; nina is plural.',
  so: 'Somali is a Cushitic language written in Latin script (official since 1972): x is a pharyngeal sound, c is a voiced pharyngeal sound, and an apostrophe marks a glottal stop; doubled vowels mark length. It has a pitch accent that spelling does not mark. Somali is not Arabic. adiga is singular “you”; idinka is plural.',
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
  az: [
    { kind: 'sen', chip: 'sən', label: 'sən (informal)', forms: ['sən', 'səni', 'sənə', 'səndə', 'səndən', 'sənin'] },
    { kind: 'siz', chip: 'siz', label: 'siz (formal / plural)', forms: ['siz', 'sizi', 'sizə', 'sizdə', 'sizdən', 'sizin'] },
  ],
  uz: [
    { kind: 'sen', chip: 'sen', label: 'sen (informal)', forms: ['sen', 'seni', 'senga', 'sening', 'sendan', 'senda'] },
    { kind: 'siz', chip: 'siz', label: 'siz (formal / plural)', forms: ['siz', 'sizni', 'sizga', 'sizning', 'sizdan', 'sizda'] },
  ],
  sw: [
    { kind: 'wewe', chip: 'wewe', label: 'wewe (you, singular)', forms: ['wewe', 'yako', 'wako', 'zako', 'chako', 'vyako', 'lako', 'kwako'] },
    { kind: 'nyinyi', chip: 'nyinyi', label: 'nyinyi (you, plural)', forms: ['nyinyi', 'yenu', 'wenu', 'zenu', 'chenu', 'vyenu', 'lenu', 'kwenu'] },
  ],
  af: [
    { kind: 'jy', chip: 'jy', label: 'jy (informal)', forms: ['jy', 'jou', 'jouself'] },
    { kind: 'u', chip: 'u', label: 'u (formal)', forms: ['u', 'uself'] },
    { kind: 'julle', chip: 'julle', label: 'julle (plural “you”)', forms: ['julle', 'julleself'] },
  ],
  et: [
    { kind: 'sina', chip: 'sina', label: 'sina (informal)', forms: ['sina', 'sind', 'sulle', 'sinu', 'sinuga', 'sinult', 'sinus'] },
    { kind: 'teie', chip: 'teie', label: 'teie (formal / plural)', forms: ['teie', 'teid', 'teile', 'teiega', 'teilt', 'teis'] },
  ],
  lv: [
    { kind: 'tu', chip: 'tu', label: 'tu (informal)', forms: ['tu', 'tevi', 'tev', 'tevis', 'tavs', 'tava', 'tavi', 'tavu'] },
    { kind: 'jus', chip: 'jūs', label: 'jūs (formal / plural)', forms: ['jūs', 'jūsu', 'jums', 'jūsos'] },
  ],
  lt: [
    { kind: 'tu', chip: 'tu', label: 'tu (informal)', forms: ['tu', 'tave', 'tau', 'tavęs', 'tavo', 'tavimi'] },
    { kind: 'jus', chip: 'jūs', label: 'jūs (formal / plural)', forms: ['jūs', 'jus', 'jūsų', 'jums', 'jumis'] },
  ],
  ga: [
    { kind: 'tu', chip: 'tú', label: 'tú (singular)', forms: ['tú', 'tusa', 'thú', 'duit', 'agat', 'leat', 'ort'] },
    { kind: 'sibh', chip: 'sibh', label: 'sibh (plural)', forms: ['sibh', 'sibhse', 'daoibh', 'agaibh', 'libh', 'oraibh', 'bhur'] },
  ],
  cy: [
    { kind: 'ti', chip: 'ti', label: 'ti (informal)', forms: ['ti', 'di', 'dy', 'tithau', 'titha'] },
    { kind: 'chi', chip: 'chi', label: 'chi (formal / plural)', forms: ['chi', 'eich', 'ichi', 'chithau'] },
  ],
  eu: [
    { kind: 'hi', chip: 'hi', label: 'hi (intimate)', forms: ['hi', 'hik', 'hire', 'hiri'] },
    { kind: 'zu', chip: 'zu', label: 'zu (polite / standard)', forms: ['zu', 'zuk', 'zure', 'zuri', 'zurekin'] },
    { kind: 'zuek', chip: 'zuek', label: 'zuek (plural)', forms: ['zuek', 'zuen', 'zuei', 'zuekin'] },
  ],
  gl: [
    { kind: 'ti', chip: 'ti', label: 'ti / tu (informal)', forms: ['ti', 'tu', 'te', 'teu', 'túa', 'teus', 'túas', 'contigo'] },
    { kind: 'vostede', chip: 'vostede', label: 'vostede (formal)', forms: ['vostede', 'vostedes'] },
  ],
  mt: [
    { kind: 'inti', chip: 'inti', label: 'inti (singular “you”)', forms: ['inti', 'int', 'tiegħek', 'lilek', 'miegħek'] },
    { kind: 'intom', chip: 'intom', label: 'intom (plural “you”)', forms: ['intom', 'tagħkom', 'lilkom', 'magħkom'] },
  ],
  is: [
    { kind: 'thu', chip: 'þú', label: 'þú (singular)', forms: ['þú', 'þig', 'þinn', 'þín', 'þitt', 'þinni'] },
    { kind: 'thid', chip: 'þið', label: 'þið (plural)', forms: ['þið', 'ykkur', 'ykkar'] },
  ],
  bs: [
    { kind: 'ti', chip: 'ti', label: 'ti (informal)', forms: ['ti', 'tebe', 'tebi', 'tobom', 'tvoj', 'tvoja', 'tvoje', 'tvoji', 'tvojeg'] },
    { kind: 'vi', chip: 'vi', label: 'vi (formal / plural)', forms: ['vi', 'vas', 'vama', 'vaš', 'vaša', 'vaše', 'vaši', 'vašeg'] },
  ],
  sq: [
    { kind: 'ti', chip: 'ti', label: 'ti (informal)', forms: ['ti', 'ty', 'teje', 'yt', 'jote', 'tënd', 'tënde'] },
    { kind: 'ju', chip: 'ju', label: 'ju (formal / plural)', forms: ['ju', 'juaj', 'juve'] },
  ],
  zu: [
    { kind: 'wena', chip: 'wena', label: 'wena (singular)', forms: ['wena', 'kuwe', 'wakho', 'yakho', 'sakho', 'zakho'] },
    { kind: 'nina', chip: 'nina', label: 'nina (plural)', forms: ['nina', 'kini', 'wenu', 'yenu', 'zenu', 'benu'] },
  ],
  so: [
    { kind: 'adiga', chip: 'adiga', label: 'adiga (singular)', forms: ['adiga', 'adigu', 'adigaa'] },
    { kind: 'idinka', chip: 'idinka', label: 'idinka (plural)', forms: ['idinka', 'idinku', 'idin', 'idinkaa'] },
  ],
}

const SCRIPT: Partial<Record<EuroLang, RegExp>> = { el: /[\u0370-\u03FF\u1F00-\u1FFF]/ }

/** Best-effort informal / formal detection for Details chips. */
export function detectEuroAddress(text: string, lang: EuroLang): AddressHit | null {
  return detectAddress(text, RULES[lang], { caseInsensitive: true, script: SCRIPT[lang] })
}
