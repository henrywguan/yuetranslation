/**
 * Batch 4 pedagogy helpers (Euro chips for 13 Latin langs, Assamese ISO 15919, mk/mn Cyrillic readings,
 * ps RTL chip, hy/ka/am script chips), translation guards, and family routing.
 * Run: `npx tsx apps/web/src/lib/batch4Pedagogy.smoke.ts`
 */
import assert from 'node:assert/strict'
import { detectCyrillicAddress, romanizeCyrillic, CYRILLIC_HONESTY_NOTE, CYRILLIC_HTML_LANG } from './cyrillicPedagogy'
import { detectEuroAddress, EURO_HONESTY_NOTE, EURO_HTML_LANG } from './euroPedagogy'
import { detectIndicAddress, INDIC_HONESTY_NOTE, INDIC_HTML_LANG } from './indicPedagogy'
import { romanizeIndicIso15919 } from './indicIso15919'
import { detectRtlAddress, RTL_HONESTY_NOTE, RTL_HTML_LANG } from './rtlPedagogy'
import { detectScriptFamilyAddress, SCRIPT_FAMILY_HONESTY_NOTE, SCRIPT_FAMILY_HTML_LANG } from './scriptPedagogy'
import {
  isCyrillicFamilyLang,
  isEuroFamilyLang,
  isIndicFamilyLang,
  isLangFamilyLang,
  isRtlFamilyLang,
  isScriptFamilyLang,
} from './langFamily'
import { isRtlLang, isTextOnlyLang, isVoiceLang } from './langCapabilities'
import {
  sanitizeAmTranslation,
  sanitizeAsTranslation,
  sanitizeBsTranslation,
  sanitizeEtTranslation,
  sanitizeHyTranslation,
  sanitizeKaTranslation,
  sanitizeMkTranslation,
  sanitizeMnTranslation,
  sanitizePsTranslation,
  sanitizeZuTranslation,
} from './translationGuard'

// Euro address chips
assert.equal(detectEuroAddress('Kuidas sul läheb, sina?', 'et')?.kind, 'sina')
assert.equal(detectEuroAddress('Kuidas teil läheb, teie?', 'et')?.kind, 'teie')
assert.equal(detectEuroAddress('Kā tev iet, tu?', 'lv')?.kind, 'tu')
assert.equal(detectEuroAddress('Kā jums iet, jūs?', 'lv')?.kind, 'jus')
assert.equal(detectEuroAddress('Kaip tau sekasi, tu?', 'lt')?.kind, 'tu')
assert.equal(detectEuroAddress('Kaip jums sekasi, jūs?', 'lt')?.kind, 'jus')
assert.equal(detectEuroAddress('Conas atá tú?', 'ga')?.kind, 'tu')
assert.equal(detectEuroAddress('Conas atá sibh?', 'ga')?.kind, 'sibh')
assert.equal(detectEuroAddress('Sut wyt ti?', 'cy')?.kind, 'ti')
assert.equal(detectEuroAddress('Sut ydych chi?', 'cy')?.kind, 'chi')
assert.equal(detectEuroAddress('Zer moduz zu?', 'eu')?.kind, 'zu')
assert.equal(detectEuroAddress('Zer moduz zuek?', 'eu')?.kind, 'zuek')
assert.equal(detectEuroAddress('Como estás ti?', 'gl')?.kind, 'ti')
assert.equal(detectEuroAddress('Como está vostede?', 'gl')?.kind, 'vostede')
assert.equal(detectEuroAddress('Kif int inti?', 'mt')?.kind, 'inti')
assert.equal(detectEuroAddress('Kif intom intom?', 'mt')?.kind, 'intom')
assert.equal(detectEuroAddress('Hvernig hefur þú það?', 'is')?.kind, 'thu')
assert.equal(detectEuroAddress('Hvernig hafið þið það?', 'is')?.kind, 'thid')
assert.equal(detectEuroAddress('Kako si ti?', 'bs')?.kind, 'ti')
assert.equal(detectEuroAddress('Kako ste vi?', 'bs')?.kind, 'vi')
assert.equal(detectEuroAddress('Si je ti?', 'sq')?.kind, 'ti')
assert.equal(detectEuroAddress('Si jeni ju?', 'sq')?.kind, 'ju')
assert.equal(detectEuroAddress('Unjani wena?', 'zu')?.kind, 'wena')
assert.equal(detectEuroAddress('Unjani nina?', 'zu')?.kind, 'nina')
assert.equal(detectEuroAddress('Sidee tahay adiga?', 'so')?.kind, 'adiga')
assert.equal(detectEuroAddress('Sidee tahay idinka?', 'so')?.kind, 'idinka')
assert.equal(detectEuroAddress('Zdravo', 'bs'), null)

// Assamese ISO 15919 (Bengali–Assamese script with ৰ ৱ)
assert.equal(romanizeIndicIso15919('নমস্কাৰ', 'as'), 'namaskāra')
assert.equal(romanizeIndicIso15919('অসম', 'as'), 'asama')
assert.equal(romanizeIndicIso15919('hello', 'as'), null)
assert.equal(detectIndicAddress('আপুনি কেনে আছে?', 'as')?.kind, 'apuni')
assert.equal(detectIndicAddress('তুমি কেনে আছা?', 'as')?.kind, 'tumi')

// Cyrillic readings (mk / mn) + chips
assert.equal(romanizeCyrillic('Здраво', 'mk'), 'Zdravo')
assert.equal(romanizeCyrillic('Ѓорѓи', 'mk'), 'Gjorgji')
assert.equal(romanizeCyrillic('Македонија', 'mk'), 'Makedonija')
assert.equal(romanizeCyrillic('Сайн байна уу', 'mn'), 'Sain baina uu')
assert.equal(romanizeCyrillic('Монгол', 'mn'), 'Mongol')
assert.equal(romanizeCyrillic('hello', 'mk'), null)
assert.equal(romanizeCyrillic('hello', 'mn'), null)
assert.equal(detectCyrillicAddress('Како си ти?', 'mk')?.kind, 'ti')
assert.equal(detectCyrillicAddress('Како сте Вие?', 'mk')?.kind, 'vie')
assert.equal(detectCyrillicAddress('Чи сайн уу?', 'mn')?.kind, 'chi')
assert.equal(detectCyrillicAddress('Та сайн байна уу?', 'mn')?.kind, 'ta')

// RTL + script-family chips
assert.equal(detectRtlAddress('تاسو څنګه یاست؟', 'ps')?.kind, 'taso')
assert.equal(detectRtlAddress('ته څنګه یې؟', 'ps')?.kind, 'ta')
assert.equal(detectScriptFamilyAddress('դու ինչպես ես?', 'hy')?.kind, 'du')
assert.equal(detectScriptFamilyAddress('դուք ինչպես եք?', 'hy')?.kind, 'duk')
assert.equal(detectScriptFamilyAddress('შენ როგორ ხარ?', 'ka')?.kind, 'shen')
assert.equal(detectScriptFamilyAddress('თქვენ როგორ ბრძანდებით?', 'ka')?.kind, 'tkven')
assert.equal(detectScriptFamilyAddress('አንተ እንዴት ነህ?', 'am')?.kind, 'ante')
assert.equal(detectScriptFamilyAddress('እርስዎ እንዴት ነዎት?', 'am')?.kind, 'ersiwo')
assert.equal(detectScriptFamilyAddress('hello', 'hy'), null)

// Family routing + capabilities
const euro4 = ['et', 'lv', 'lt', 'ga', 'cy', 'eu', 'gl', 'mt', 'is', 'bs', 'sq', 'zu', 'so'] as const
for (const l of euro4) {
  assert.ok(isEuroFamilyLang(l) && isLangFamilyLang(l) && !isIndicFamilyLang(l) && !isCyrillicFamilyLang(l), l)
  assert.ok(!isRtlFamilyLang(l) && !isScriptFamilyLang(l), l)
  assert.ok(isVoiceLang(l) && !isTextOnlyLang(l) && !isRtlLang(l), l)
  assert.ok(EURO_HONESTY_NOTE[l].length > 40 && EURO_HTML_LANG[l], l)
}
assert.match(EURO_HONESTY_NOTE.bs, /Latin/)
assert.equal(EURO_HTML_LANG.bs, 'bs-BA')

assert.ok(isIndicFamilyLang('as') && isLangFamilyLang('as') && !isEuroFamilyLang('as'))
assert.ok(INDIC_HONESTY_NOTE.as.length > 40 && INDIC_HTML_LANG.as === 'as-IN')

for (const l of ['mk', 'mn'] as const) {
  assert.ok(isCyrillicFamilyLang(l) && isLangFamilyLang(l) && !isEuroFamilyLang(l) && !isRtlFamilyLang(l), l)
  assert.ok(isVoiceLang(l) && !isTextOnlyLang(l) && !isRtlLang(l), l)
  assert.ok(CYRILLIC_HONESTY_NOTE[l].length > 40 && CYRILLIC_HTML_LANG[l], l)
}
assert.match(CYRILLIC_HONESTY_NOTE.mn, /not traditional/i, 'Mongolian is Cyrillic only')

assert.ok(isRtlFamilyLang('ps') && isRtlLang('ps') && isLangFamilyLang('ps') && !isScriptFamilyLang('ps'))
assert.ok(RTL_HONESTY_NOTE.ps.length > 40 && RTL_HTML_LANG.ps === 'ps-AF')

for (const l of ['hy', 'ka', 'am'] as const) {
  assert.ok(isScriptFamilyLang(l) && isLangFamilyLang(l), l)
  assert.ok(!isEuroFamilyLang(l) && !isIndicFamilyLang(l) && !isCyrillicFamilyLang(l) && !isRtlFamilyLang(l), l)
  assert.ok(isVoiceLang(l) && !isTextOnlyLang(l) && !isRtlLang(l), l)
  assert.ok(SCRIPT_FAMILY_HONESTY_NOTE[l].length > 40 && SCRIPT_FAMILY_HTML_LANG[l], l)
}
assert.ok(!isLangFamilyLang('sichuan'), 'sichuan never routes through a family renderer')

// Translation guards
assert.equal(sanitizeBsTranslation('Dobar dan, kako si?'), 'Dobar dan, kako si?')
assert.equal(sanitizeBsTranslation('Добар дан'), null, 'Bosnian Cyrillic rejected — Latin only')
assert.equal(sanitizeMnTranslation('Сайн байна уу, өнөөдөр'), 'Сайн байна уу, өнөөдөр')
assert.equal(sanitizeMnTranslation('Sain baina uu'), null, 'Mongolian Latin rejected')
assert.equal(sanitizeMkTranslation('Здраво, ѓаволе'), 'Здраво, ѓаволе')
assert.equal(sanitizeMkTranslation('Zdravo'), null)
assert.equal(sanitizeMkTranslation('Привет, ёж'), null, 'Russian-only letters rejected for Macedonian')
assert.equal(sanitizeEtTranslation('Tere hommikust, õpilane'), 'Tere hommikust, õpilane')
assert.equal(sanitizeEtTranslation('你好'), null)
assert.equal(sanitizeZuTranslation('Sawubona'), 'Sawubona')
assert.equal(sanitizeAsTranslation('নমস্কাৰ'), 'নমস্কাৰ')
assert.equal(sanitizeAsTranslation('नमस्ते'), null, 'Devanagari is not Assamese')
assert.equal(sanitizeAsTranslation('namaskar'), null)
assert.equal(sanitizePsTranslation('سلام، څنګه یاست؟'), 'سلام، څنګه یاست؟')
assert.equal(sanitizePsTranslation('salam'), null)
assert.equal(sanitizeHyTranslation('Բարեւ, ինչպես ես?'), 'Բարեւ, ինչպես ես?')
assert.equal(sanitizeHyTranslation('Barev'), null)
assert.equal(sanitizeKaTranslation('გამარჯობა'), 'გამარჯობა')
assert.equal(sanitizeKaTranslation('Gamarjoba'), null)
assert.equal(sanitizeAmTranslation('ሰላም ነው'), 'ሰላም ነው')
assert.equal(sanitizeAmTranslation('selam'), null)

console.log('batch4Pedagogy.smoke: ok')
