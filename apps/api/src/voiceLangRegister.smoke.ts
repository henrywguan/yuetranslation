import assert from 'node:assert/strict'
import {
  ARABIC_SCRIPT_RE,
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

console.log('voiceLangRegister.smoke: ok')
