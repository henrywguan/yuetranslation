/**
 * Batch 3a pedagogy helpers (Indic ISO 15919 for ml/mr/pa/or/si/ne, Euro address chips for da/nb/fi/sk/hr/ca).
 * Run: `npx tsx apps/web/src/lib/batch3aPedagogy.smoke.ts`
 */
import assert from 'node:assert/strict'
import { romanizeIndicIso15919 } from './indicIso15919'
import { detectIndicAddress, INDIC_HONESTY_NOTE, INDIC_HTML_LANG } from './indicPedagogy'
import { detectEuroAddress, EURO_HONESTY_NOTE, EURO_HTML_LANG } from './euroPedagogy'
import { isEuroFamilyLang, isIndicFamilyLang, isLangFamilyLang, isRtlFamilyLang } from './langFamily'
import { isRtlLang, isVoiceLang, isTextOnlyLang } from './langCapabilities'

// ISO 15919
assert.equal(romanizeIndicIso15919('നമസ്കാരം', 'ml'), 'namaskāraṁ')
assert.equal(romanizeIndicIso15919('മലയാളം', 'ml'), 'malayāḷaṁ')
assert.equal(romanizeIndicIso15919('നന്ദി', 'ml'), 'nandi')
assert.equal(romanizeIndicIso15919('मराठी', 'ml'), null, 'Devanagari never gets a Malayalam reading')
assert.equal(romanizeIndicIso15919('मराठी', 'mr'), 'marāṭhī')
assert.equal(romanizeIndicIso15919('नमस्कार', 'mr'), 'namaskāra')
assert.equal(romanizeIndicIso15919('नेपाली', 'ne'), 'nepālī')
assert.equal(romanizeIndicIso15919('नमस्ते', 'ne'), 'namaste')
assert.equal(romanizeIndicIso15919('नमस्ते', 'pa'), null, 'Devanagari never gets a Gurmukhi reading')
assert.equal(romanizeIndicIso15919('ਪੰਜਾਬੀ', 'pa'), 'paṁjābī')
assert.equal(romanizeIndicIso15919('ਉੱਤੇ', 'pa'), 'uttē', 'addak doubles the next consonant')
assert.equal(romanizeIndicIso15919('ਸ਼ੁਕਰੀਆ', 'pa'), 'śukarīā')
assert.equal(romanizeIndicIso15919('ଓଡ଼ିଆ', 'or'), 'oṛiā')
assert.equal(romanizeIndicIso15919('ନମସ୍କାର', 'or'), 'namaskāra')
assert.equal(romanizeIndicIso15919('සිංහල', 'si'), 'siṁhala')
assert.equal(romanizeIndicIso15919('ආයුබෝවන්', 'si'), 'āyubōvan')
assert.equal(romanizeIndicIso15919('ශ්‍රී ලංකා', 'si'), 'śrī laṁkā', 'ZWJ conjunct drops cleanly')
for (const l of ['ml', 'mr', 'pa', 'or', 'si', 'ne'] as const) {
  assert.equal(romanizeIndicIso15919('hello', l), null, `${l}: Latin gets no reading`)
}

// Indic address chips
assert.equal(detectIndicAddress('നിങ്ങൾ എവിടെയാണ്?', 'ml')?.kind, 'ningal')
assert.equal(detectIndicAddress('നീ എവിടെ പോകുന്നു?', 'ml')?.kind, 'nee')
assert.equal(detectIndicAddress('तुम्ही कसे आहात?', 'mr')?.kind, 'tumhi')
assert.equal(detectIndicAddress('तू कुठे आहेस?', 'mr')?.kind, 'tu')
assert.equal(detectIndicAddress('ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?', 'pa')?.kind, 'tusi')
assert.equal(detectIndicAddress('ਤੂੰ ਕਿੱਥੇ ਹੈਂ?', 'pa')?.kind, 'tu')
assert.equal(detectIndicAddress('ଆପଣ କେମିତି ଅଛନ୍ତି?', 'or')?.kind, 'apana')
assert.equal(detectIndicAddress('ତୁମେ କେମିତି ଅଛ?', 'or')?.kind, 'tume')
assert.equal(detectIndicAddress('ඔබට කොහොමද?', 'si')?.kind, 'oba')
assert.equal(detectIndicAddress('ඔයා කොහෙද යන්නේ?', 'si')?.kind, 'oya')
assert.equal(detectIndicAddress('तपाईंलाई कस्तो छ?', 'ne')?.kind, 'tapai')
assert.equal(detectIndicAddress('तिमी कहाँ जान्छौ?', 'ne')?.kind, 'timi')
assert.equal(detectIndicAddress('hello', 'ml'), null)

// Euro address chips
assert.equal(detectEuroAddress('Hvordan har du det?', 'da')?.kind, 'du')
assert.equal(detectEuroAddress('Hvad hedder du?', 'nb')?.kind, 'du')
assert.equal(detectEuroAddress('Hvordan har dere det?', 'nb')?.kind, 'dere')
assert.equal(detectEuroAddress('Mitä sinulle kuuluu?', 'fi')?.kind, 'sina')
assert.equal(detectEuroAddress('Mitä teille kuuluu?', 'fi')?.kind, 'te')
assert.equal(detectEuroAddress('Ako sa máš? Kde si ty?', 'sk')?.kind, 'ty')
assert.equal(detectEuroAddress('Ako sa máte? Ste v poriadku?', 'sk')?.kind, 'vy')
assert.equal(detectEuroAddress('Kako si ti?', 'hr')?.kind, 'ti')
assert.equal(detectEuroAddress('Kako ste Vi?', 'hr')?.kind, 'vi')
assert.equal(detectEuroAddress('Com estàs tu?', 'ca')?.kind, 'tu')
assert.equal(detectEuroAddress('Com està vostè?', 'ca')?.kind, 'voste')
assert.equal(detectEuroAddress('Tak for hjælpen.', 'da'), null)

// Family routing + capabilities
const indic3a = ['ml', 'mr', 'pa', 'or', 'si', 'ne'] as const
const euro3a = ['da', 'nb', 'fi', 'sk', 'hr', 'ca'] as const
for (const l of indic3a) {
  assert.ok(isIndicFamilyLang(l) && isLangFamilyLang(l) && !isEuroFamilyLang(l), l)
  assert.ok(isVoiceLang(l) && !isTextOnlyLang(l) && !isRtlLang(l) && !isRtlFamilyLang(l), l)
  assert.ok(INDIC_HONESTY_NOTE[l].length > 40 && INDIC_HTML_LANG[l], l)
}
for (const l of euro3a) {
  assert.ok(isEuroFamilyLang(l) && isLangFamilyLang(l) && !isIndicFamilyLang(l), l)
  assert.ok(isVoiceLang(l) && !isTextOnlyLang(l) && !isRtlLang(l), l)
  assert.ok(EURO_HONESTY_NOTE[l].length > 40 && EURO_HTML_LANG[l], l)
}
assert.ok(!isLangFamilyLang('sichuan'), 'sichuan never routes through a family renderer')

console.log('batch3aPedagogy.smoke: ok')
