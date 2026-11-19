/**
 * Batch 3b pedagogy helpers (Euro address chips for az/uz/sw/af, Cyrillic readings + chips for kk/bg/sr),
 * translation guards, and family routing.
 * Run: `npx tsx apps/web/src/lib/batch3bPedagogy.smoke.ts`
 */
import assert from 'node:assert/strict'
import { detectCyrillicAddress, romanizeCyrillic, CYRILLIC_HONESTY_NOTE, CYRILLIC_HTML_LANG } from './cyrillicPedagogy'
import { detectEuroAddress, EURO_HONESTY_NOTE, EURO_HTML_LANG } from './euroPedagogy'
import { isCyrillicFamilyLang, isEuroFamilyLang, isIndicFamilyLang, isLangFamilyLang, isRtlFamilyLang } from './langFamily'
import { isRtlLang, isTextOnlyLang, isVoiceLang } from './langCapabilities'
import {
  sanitizeAfTranslation,
  sanitizeAzTranslation,
  sanitizeBgTranslation,
  sanitizeKkTranslation,
  sanitizeSrTranslation,
  sanitizeSwTranslation,
  sanitizeUzTranslation,
} from './translationGuard'

// Cyrillic readings
assert.equal(romanizeCyrillic('Сәлем', 'kk'), 'Sälem')
assert.equal(romanizeCyrillic('Қазақстан', 'kk'), 'Qazaqstan')
assert.equal(romanizeCyrillic('Рахмет', 'kk'), 'Rakhmet')
assert.equal(romanizeCyrillic('Здравей', 'bg'), 'Zdravey')
assert.equal(romanizeCyrillic('България', 'bg'), 'Balgariya')
assert.equal(romanizeCyrillic('Благодаря', 'bg'), 'Blagodarya')
assert.equal(romanizeCyrillic('Здраво', 'sr'), null, 'Serbian is Cyrillic only — never a Latin reading')
assert.equal(romanizeCyrillic('hello', 'kk'), null)
assert.equal(romanizeCyrillic('hello', 'bg'), null)
assert.equal(romanizeCyrillic('Привет', 'ru'), 'Privet', 'ru table untouched')

// Cyrillic address chips
assert.equal(detectCyrillicAddress('Сен қалайсың?', 'kk')?.kind, 'sen')
assert.equal(detectCyrillicAddress('Сіз қалайсыз?', 'kk')?.kind, 'siz')
assert.equal(detectCyrillicAddress('Как си ти?', 'bg')?.kind, 'ti')
assert.equal(detectCyrillicAddress('Как сте вие?', 'bg')?.kind, 'vie')
assert.equal(detectCyrillicAddress('Како си ти?', 'sr')?.kind, 'ti')
assert.equal(detectCyrillicAddress('Како сте Ви?', 'sr')?.kind, 'vi')
assert.equal(detectCyrillicAddress('hello', 'sr'), null, 'Latin text never gets a Serbian chip')

// Euro address chips
assert.equal(detectEuroAddress('Sən necəsən?', 'az')?.kind, 'sen')
assert.equal(detectEuroAddress('Siz necəsiniz?', 'az')?.kind, 'siz')
assert.equal(detectEuroAddress('Sen qalaysan?', 'uz')?.kind, 'sen')
assert.equal(detectEuroAddress('Siz qalaysiz?', 'uz')?.kind, 'siz')
assert.equal(detectEuroAddress('Habari yako, wewe?', 'sw')?.kind, 'wewe')
assert.equal(detectEuroAddress('Habari yenu nyinyi?', 'sw')?.kind, 'nyinyi')
assert.equal(detectEuroAddress('Hoe gaan dit met jou?', 'af')?.kind, 'jy')
assert.equal(detectEuroAddress('Hoe gaan dit met u?', 'af')?.kind, 'u')
assert.equal(detectEuroAddress('Hoe gaan dit met julle?', 'af')?.kind, 'julle')
assert.equal(detectEuroAddress('Təşəkkür edirəm.', 'az'), null)

// Family routing + capabilities
const euro3b = ['az', 'uz', 'sw', 'af'] as const
const cyr3b = ['kk', 'bg', 'sr'] as const
for (const l of euro3b) {
  assert.ok(isEuroFamilyLang(l) && isLangFamilyLang(l) && !isIndicFamilyLang(l) && !isCyrillicFamilyLang(l), l)
  assert.ok(isVoiceLang(l) && !isTextOnlyLang(l) && !isRtlLang(l) && !isRtlFamilyLang(l), l)
  assert.ok(EURO_HONESTY_NOTE[l].length > 40 && EURO_HTML_LANG[l], l)
}
for (const l of cyr3b) {
  assert.ok(isCyrillicFamilyLang(l) && isLangFamilyLang(l) && !isEuroFamilyLang(l) && !isIndicFamilyLang(l), l)
  assert.ok(isVoiceLang(l) && !isTextOnlyLang(l) && !isRtlLang(l) && !isRtlFamilyLang(l), l)
  assert.ok(CYRILLIC_HONESTY_NOTE[l].length > 40 && CYRILLIC_HTML_LANG[l], l)
}
assert.equal(CYRILLIC_HTML_LANG.sr, 'sr-Cyrl-RS', 'Serbian is always tagged Cyrillic')
assert.ok(!isLangFamilyLang('sichuan'), 'sichuan never routes through a family renderer')

// Translation guards
assert.equal(sanitizeSrTranslation('Здраво, свете'), 'Здраво, свете')
assert.equal(sanitizeSrTranslation('Zdravo, svete'), null, 'Serbian Latin is rejected')
assert.equal(sanitizeSrTranslation('Здраво, čovječe'), null, 'Latin Serbian letters in a Cyrillic line are rejected')
assert.equal(sanitizeSrTranslation('Здравствуйте, ёж'), null, 'Russian-only letters rejected')
assert.equal(sanitizeKkTranslation('Сәлем, әлем'), 'Сәлем, әлем')
assert.equal(sanitizeKkTranslation('Salem'), null)
assert.equal(sanitizeBgTranslation('Здравей, свят'), 'Здравей, свят')
assert.equal(sanitizeBgTranslation('Привет, ёж'), null, 'Russian-only letters rejected for Bulgarian')
assert.equal(sanitizeBgTranslation('България'), 'България', 'ъ is valid Bulgarian')
assert.equal(sanitizeAzTranslation('Salam, necəsən?'), 'Salam, necəsən?')
assert.equal(sanitizeAzTranslation('Салам'), null, 'Cyrillic Azerbaijani rejected')
assert.equal(sanitizeUzTranslation('Salom, qalaysiz?'), 'Salom, qalaysiz?')
assert.equal(sanitizeUzTranslation('Салом'), null, 'Cyrillic Uzbek rejected')
assert.equal(sanitizeSwTranslation('Habari yako'), 'Habari yako')
assert.equal(sanitizeAfTranslation('Goeie môre'), 'Goeie môre')
assert.equal(sanitizeAfTranslation('你好'), null)

console.log('batch3bPedagogy.smoke: ok')
