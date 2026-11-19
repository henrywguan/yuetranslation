import assert from 'node:assert/strict'
import {
  ARABIC_SCRIPT_RE,
  ARMENIAN_REJECT_RE,
  ARMENIAN_SCRIPT_RE,
  ASSAMESE_REJECT_RE,
  BENGALI_ASSAMESE_SCRIPT_RE,
  ETHIOPIC_REJECT_RE,
  ETHIOPIC_SCRIPT_RE,
  GEORGIAN_REJECT_RE,
  GEORGIAN_SCRIPT_RE,
  MACEDONIAN_REJECT_RE,
  MONGOLIAN_REJECT_RE,
  BULGARIAN_REJECT_RE,
  CYRILLIC_OR_ARABIC_RE,
  KAZAKH_REJECT_RE,
  SERBIAN_REJECT_RE,
  CYRILLIC_SCRIPT_RE,
  DEVANAGARI_RE,
  GREEK_SCRIPT_RE,
  GUJARATI_SCRIPT_RE,
  GURMUKHI_SCRIPT_RE,
  HEBREW_SCRIPT_RE,
  KANNADA_SCRIPT_RE,
  MALAYALAM_SCRIPT_RE,
  ODIA_SCRIPT_RE,
  RUSSIAN_ONLY_RE,
  SINHALA_SCRIPT_RE,
  TAMIL_BENGALI_DEVANAGARI_RE,
  TELUGU_SCRIPT_RE,
  UKRAINIAN_ONLY_RE,
  URDU_ONLY_RE,
  inferSourceRegister,
  rejectOtherIndic,
} from './voiceLangRegister.js'

assert.equal(inferSourceRegister('Hey, how are you?'), 'colloquial')
assert.equal(inferSourceRegister('Where is the bathroom?'), 'colloquial')
assert.equal(inferSourceRegister('Please be advised that your application for leave is approved.'), 'formal')
assert.equal(inferSourceRegister('Dear Sir, kindly submit the medical certificate.'), 'formal')
assert.equal(inferSourceRegister('To whom it may concern'), 'formal')
assert.equal(inferSourceRegister(''), 'colloquial')

assert.ok(TELUGU_SCRIPT_RE.test('నమస్కారం'))
assert.ok(!TELUGU_SCRIPT_RE.test('ನಮಸ್ಕಾರ'), 'Kannada is not Telugu')
assert.ok(KANNADA_SCRIPT_RE.test('ನಮಸ್ಕಾರ'))
assert.ok(!KANNADA_SCRIPT_RE.test('నమస్కారం'), 'Telugu is not Kannada')
assert.ok(GUJARATI_SCRIPT_RE.test('નમસ્તે'))
assert.ok(!GUJARATI_SCRIPT_RE.test('नमस्ते'), 'Devanagari is not Gujarati')
assert.ok(TAMIL_BENGALI_DEVANAGARI_RE.test('வணக்கம்') && TAMIL_BENGALI_DEVANAGARI_RE.test('নমস্কার'))
assert.ok(!TAMIL_BENGALI_DEVANAGARI_RE.test('నమస్కారం'))

assert.ok(GREEK_SCRIPT_RE.test('Γεια σας'))
assert.ok(!GREEK_SCRIPT_RE.test('Geia sas'), 'Greeklish is not Greek script')

assert.ok(CYRILLIC_SCRIPT_RE.test('Привет'))
assert.ok(RUSSIAN_ONLY_RE.test('Вы были здесь?'), 'ы is Russian-only')
assert.ok(!RUSSIAN_ONLY_RE.test('Як справи? Дякую, добре.'), 'Ukrainian sentence has no Russian-only letters')
assert.ok(UKRAINIAN_ONLY_RE.test('Привіт, як справи?'), 'і is Ukrainian-only')
assert.ok(!UKRAINIAN_ONLY_RE.test('Привет, как дела?'))

assert.ok(HEBREW_SCRIPT_RE.test('שלום'))
assert.ok(!HEBREW_SCRIPT_RE.test('سلام'))
assert.ok(ARABIC_SCRIPT_RE.test('سلام') && ARABIC_SCRIPT_RE.test('شکریہ'))
assert.ok(URDU_ONLY_RE.test('آپ کیسے ہیں؟ شکریہ، ٹھیک ہوں۔'), 'Urdu ے / ٹ flag a non-Persian line')
assert.ok(!URDU_ONLY_RE.test('حال شما چطور است؟ می‌خواهم بروم.'), 'Persian sentence has no Urdu-only letters')
assert.ok(DEVANAGARI_RE.test('आप कैसे हैं'))
assert.ok(!DEVANAGARI_RE.test('آپ کیسے ہیں'))

assert.ok(MALAYALAM_SCRIPT_RE.test('നമസ്കാരം'))
assert.ok(!MALAYALAM_SCRIPT_RE.test('தமிழ்') && !MALAYALAM_SCRIPT_RE.test('తెలుగు'), 'Tamil / Telugu are not Malayalam')
assert.ok(GURMUKHI_SCRIPT_RE.test('ਸਤ ਸ੍ਰੀ ਅਕਾਲ'))
assert.ok(!GURMUKHI_SCRIPT_RE.test('نمستے') && !GURMUKHI_SCRIPT_RE.test('नमस्ते'), 'Shahmukhi / Devanagari are not Gurmukhi')
assert.ok(ODIA_SCRIPT_RE.test('ନମସ୍କାର'))
assert.ok(!ODIA_SCRIPT_RE.test('নমস্কার'), 'Bengali is not Odia')
assert.ok(SINHALA_SCRIPT_RE.test('ආයුබෝවන්'))
assert.ok(!SINHALA_SCRIPT_RE.test('வணக்கம்') && !SINHALA_SCRIPT_RE.test('മലയാളം'), 'Tamil / Malayalam are not Sinhala')

const rejectMl = rejectOtherIndic('malayalam')
assert.ok(!rejectMl.test('നമസ്കാരം'), 'own script passes')
assert.ok(rejectMl.test('வணக்கம்') && rejectMl.test('नमस्ते') && rejectMl.test('తెలుగు'), 'neighbouring Indic scripts rejected')
const rejectMr = rejectOtherIndic('devanagari')
assert.ok(!rejectMr.test('नमस्कार, तुम्ही कसे आहात?'), 'Marathi / Nepali Devanagari passes')
assert.ok(rejectMr.test('નમસ્તે') && rejectMr.test('নমস্কার'), 'Gujarati / Bengali rejected for Devanagari langs')
assert.ok(!rejectOtherIndic('sinhala').test('ආයුබෝවන්'))
assert.ok(rejectOtherIndic('sinhala').test('வணக்கம்'))
assert.ok(!rejectOtherIndic('gurmukhi').test('ਸਤ ਸ੍ਰੀ ਅਕਾਲ'))
assert.ok(!rejectOtherIndic('odia').test('ନମସ୍କାର'))

assert.ok(!SERBIAN_REJECT_RE.test('Здраво, како сте? Ђорђе је ту.'), 'Serbian Cyrillic passes')
assert.ok(SERBIAN_REJECT_RE.test('Съешь ещё этих мягких булок') && SERBIAN_REJECT_RE.test('щи'), 'Russian-only letters rejected for Serbian')
assert.ok(!BULGARIAN_REJECT_RE.test('Здравей, как си? Щастлив съм, ъгъл.'), 'Bulgarian Cyrillic passes (ъ щ allowed)')
assert.ok(BULGARIAN_REJECT_RE.test('Ђорђе је ту') && BULGARIAN_REJECT_RE.test('ёлка'), 'Serbian / Russian-only letters rejected for Bulgarian')
assert.ok(!KAZAKH_REJECT_RE.test('Сәлем, қалайсың? Менің атым Айгүл, ұл, һәм ың.'), 'Kazakh Cyrillic passes')
assert.ok(KAZAKH_REJECT_RE.test('їжак') && KAZAKH_REJECT_RE.test('Ђорђе'), 'Ukrainian / Serbian-only letters rejected for Kazakh')
assert.ok(CYRILLIC_OR_ARABIC_RE.test('Салом') && CYRILLIC_OR_ARABIC_RE.test('سلام'), 'Cyrillic / Arabic flagged for Latin Azerbaijani / Uzbek')
assert.ok(!CYRILLIC_OR_ARABIC_RE.test('Salam, necəsən? Salom, qalaysiz? oʻzbek'), 'Latin Azerbaijani / Uzbek passes')
assert.ok(!CYRILLIC_SCRIPT_RE.test('Zdravo, kako ste?'), 'Latin-only Serbian is not Cyrillic (rejected by requireScript)')

assert.ok(BENGALI_ASSAMESE_SCRIPT_RE.test('নমস্কাৰ, আপুনি কেনে আছে? ৰ ৱ'), 'Assamese script incl. ৰ ৱ')
assert.ok(!BENGALI_ASSAMESE_SCRIPT_RE.test('नमस्ते') && !BENGALI_ASSAMESE_SCRIPT_RE.test('hello'), 'Devanagari / Latin are not Assamese script')
assert.ok(!ASSAMESE_REJECT_RE.test('নমস্কাৰ, আপুনি কেনে আছে।'), 'Assamese passes incl. danda full stop')
assert.ok(ASSAMESE_REJECT_RE.test('नमस्ते') && ASSAMESE_REJECT_RE.test('ਸਤ ਸ੍ਰੀ ਅਕਾਲ') && ASSAMESE_REJECT_RE.test('Привет'), 'Other scripts rejected for Assamese')

assert.ok(!MACEDONIAN_REJECT_RE.test('Здраво, како си? Ѓорѓи, ќе дојдам, џеб, љубов, њива, ѕвезда, јас.'), 'Macedonian Cyrillic passes')
assert.ok(MACEDONIAN_REJECT_RE.test('Здравей, ъгъл') && MACEDONIAN_REJECT_RE.test('щастие') && MACEDONIAN_REJECT_RE.test('Ђорђе') && MACEDONIAN_REJECT_RE.test('ёлка'), 'Bulgarian / Serbian / Russian-only letters rejected for Macedonian')
assert.ok(!MONGOLIAN_REJECT_RE.test('Сайн байна уу? Миний нэр Өлзий, үнэн, ёстой, юу, ямар.'), 'Mongolian Cyrillic (ө ү ё ю я) passes')
assert.ok(MONGOLIAN_REJECT_RE.test('Сәлем, қалайсың') && MONGOLIAN_REJECT_RE.test('їжак') && MONGOLIAN_REJECT_RE.test('ᠮᠣᠩᠭᠣᠯ'), 'Kazakh / Ukrainian / traditional Mongol script rejected')

assert.ok(ARMENIAN_SCRIPT_RE.test('Բարև ձեզ։') && !ARMENIAN_SCRIPT_RE.test('Привет') && !ARMENIAN_SCRIPT_RE.test('გამარჯობა'), 'Armenian script')
assert.ok(ARMENIAN_REJECT_RE.test('გამარჯობა') && ARMENIAN_REJECT_RE.test('Привет') && !ARMENIAN_REJECT_RE.test('Բարև, ինչպե՞ս եք։'), 'Armenian rejects Georgian / Cyrillic')
assert.ok(GEORGIAN_SCRIPT_RE.test('გამარჯობა') && !GEORGIAN_SCRIPT_RE.test('Բարև') && !GEORGIAN_SCRIPT_RE.test('Привет'), 'Georgian script')
assert.ok(GEORGIAN_REJECT_RE.test('Բարև') && GEORGIAN_REJECT_RE.test('Привет') && !GEORGIAN_REJECT_RE.test('გამარჯობა, როგორ ხართ?'), 'Georgian rejects Armenian / Cyrillic')
assert.ok(ETHIOPIC_SCRIPT_RE.test('ሰላም፣ እንዴት ነህ።') && !ETHIOPIC_SCRIPT_RE.test('selam'), 'Ethiopic script')
assert.ok(ETHIOPIC_REJECT_RE.test('Привет') && ETHIOPIC_REJECT_RE.test('سلام') && !ETHIOPIC_REJECT_RE.test('ሰላም፣ እንዴት ነህ።'), 'Amharic rejects Cyrillic / Arabic')
assert.ok(ARABIC_SCRIPT_RE.test('سلام، ته څنګه یې؟ ټ ډ ړ ږ ښ ڼ ې ۍ ځ څ ګ') && !ARABIC_SCRIPT_RE.test('salaam'), 'Pashto uses Arabic script block')
assert.ok(DEVANAGARI_RE.test('नमस्ते') && !DEVANAGARI_RE.test('سلام، ته څنګه یې؟'), 'Pashto rejects Devanagari only')
assert.ok(!CYRILLIC_OR_ARABIC_RE.test('Tere, kuidas läheb? Sveiki, labas, Dia duit, Helo, Kaixo, Ola, Bonġu, Halló, Zdravo, Përshëndetje, Sawubona, Salaan'), 'Latin long-tail langs pass the Cyrillic / Arabic gate')
assert.ok(CYRILLIC_OR_ARABIC_RE.test('Здраво, како сте?'), 'Bosnian Latin-only: Cyrillic rejected')

console.log('voiceLangRegister.smoke: ok')
