/**
 * Batch 2 pedagogy helpers (Indic ISO 15919, Euro / Cyrillic / RTL address chips).
 * Run: `npx tsx apps/web/src/lib/batch2Pedagogy.smoke.ts`
 */
import assert from 'node:assert/strict'
import { romanizeIndicIso15919 } from './indicIso15919'
import { detectIndicAddress } from './indicPedagogy'
import { detectEuroAddress } from './euroPedagogy'
import { detectCyrillicAddress, romanizeCyrillic } from './cyrillicPedagogy'
import { detectRtlAddress } from './rtlPedagogy'
import { isLangFamilyLang, isRtlFamilyLang } from './langFamily'
import { isRtlLang, isVoiceLang } from './langCapabilities'

// ISO 15919 — Telugu / Kannada keep short e/o vs long ē/ō; Gujarati follows spelling.
assert.equal(romanizeIndicIso15919('నమస్కారం', 'te'), 'namaskāraṁ')
assert.equal(romanizeIndicIso15919('నేను', 'te'), 'nēnu')
assert.equal(romanizeIndicIso15919('తెలుగు', 'te'), 'telugu')
assert.equal(romanizeIndicIso15919('નમસ્તે', 'gu'), 'namaste')
assert.equal(romanizeIndicIso15919('ગુજરાતી', 'gu'), 'gujarātī')
assert.equal(romanizeIndicIso15919('ಕನ್ನಡ', 'kn'), 'kannaḍa')
assert.equal(romanizeIndicIso15919('ಕೋಳಿ', 'kn'), 'kōḷi')
assert.equal(romanizeIndicIso15919('hello', 'te'), null)
assert.equal(romanizeIndicIso15919('ನಮಸ್ಕಾರ', 'te'), null, 'Kannada script never gets a Telugu reading')
assert.equal(romanizeIndicIso15919('नमस्ते', 'gu'), null, 'Devanagari never gets a Gujarati reading')

assert.equal(detectIndicAddress('మీరు ఎలా ఉన్నారు?', 'te')?.kind, 'meeru')
assert.equal(detectIndicAddress('నువ్వు ఎక్కడ ఉన్నావు?', 'te')?.kind, 'nuvvu')
assert.equal(detectIndicAddress('તમે કેમ છો?', 'gu')?.kind, 'tame')
assert.equal(detectIndicAddress('તું ક્યાં છે?', 'gu')?.kind, 'tu')
assert.equal(detectIndicAddress('ನೀವು ಹೇಗಿದ್ದೀರಿ?', 'kn')?.kind, 'neevu')
assert.equal(detectIndicAddress('ನಿನ್ನೆ ಮಳೆ ಬಂತು', 'kn'), null, 'ನಿನ್ನೆ (yesterday) is not ನಿನ್ನ')

assert.equal(detectEuroAddress('Jak się masz? Czy ty jesteś gotowy?', 'pl')?.kind, 'ty')
assert.equal(detectEuroAddress('Czy Pan może mi pomóc?', 'pl')?.kind, 'pan')
assert.equal(detectEuroAddress('Ce faci tu?', 'ro')?.kind, 'tu')
assert.equal(detectEuroAddress('Vă rog, dumneavoastră aveți bilet?', 'ro')?.kind, 'dvs')
assert.equal(detectEuroAddress('Jak se máte? Jste v pořádku?', 'cs')?.kind, 'vy')
assert.equal(detectEuroAddress('Kde jsi?', 'cs')?.kind, 'ty')
assert.equal(detectEuroAddress('Τι κάνεις εσύ;', 'el')?.kind, 'esy')
assert.equal(detectEuroAddress('Πώς είστε; Εσείς;', 'el')?.kind, 'eseis')
assert.equal(detectEuroAddress('Ti kaneis esy?', 'el'), null, 'Greeklish gets no Greek chip')
assert.equal(detectEuroAddress('Hogy vagy te?', 'hu')?.kind, 'te')
assert.equal(detectEuroAddress('Ön beszél angolul?', 'hu')?.kind, 'on')
assert.equal(detectEuroAddress('Hur mår du?', 'sv')?.kind, 'du')
assert.equal(detectEuroAddress('Tack så mycket.', 'sv'), null)

assert.equal(detectCyrillicAddress('Как ты?', 'ru')?.chip, 'ты')
assert.equal(detectCyrillicAddress('Как Вы поживаете?', 'ru')?.chip, 'Вы')
assert.equal(detectCyrillicAddress('Як ти?', 'uk')?.chip, 'ти')
assert.equal(detectCyrillicAddress('Як Ви?', 'uk')?.chip, 'Ви')
assert.equal(romanizeCyrillic('Привет', 'ru'), 'Privet')
assert.equal(romanizeCyrillic('Ещё', 'ru'), 'Yeshchë')
assert.equal(romanizeCyrillic('Щастя', 'uk'), 'Shchastia')
assert.equal(romanizeCyrillic('Київ', 'uk'), 'Kyiv')
assert.equal(romanizeCyrillic('Згорани', 'uk'), 'Zghorany')
assert.equal(romanizeCyrillic('hello', 'ru'), null)

assert.equal(detectRtlAddress('שלום, מה שלומך?', 'he'), null, 'Hebrew gets honesty only — no formality chip')
assert.equal(detectRtlAddress('حال شما چطور است؟', 'fa')?.kind, 'shoma')
assert.equal(detectRtlAddress('تو خونه هستم', 'fa'), null, 'colloquial تو “in” is not address')
assert.equal(detectRtlAddress('آپ کیسے ہیں؟', 'ur')?.kind, 'aap')
assert.equal(detectRtlAddress('تم کہاں ہو؟', 'ur')?.kind, 'tum')

const batch2 = ['te', 'gu', 'kn', 'pl', 'ro', 'cs', 'el', 'hu', 'sv', 'ru', 'uk', 'he', 'fa', 'ur'] as const
for (const l of batch2) {
  assert.ok(isLangFamilyLang(l), l)
  assert.ok(isVoiceLang(l), l)
  assert.equal(isRtlLang(l), isRtlFamilyLang(l), l)
}
assert.ok(isRtlLang('he') && isRtlLang('fa') && isRtlLang('ur') && isRtlLang('ar'))
assert.ok(!isRtlLang('ru') && !isRtlLang('el') && !isRtlLang('te'))
assert.ok(!isLangFamilyLang('bn') && !isLangFamilyLang('ta') && !isLangFamilyLang('hi'))

console.log('batch2Pedagogy.smoke: ok')
