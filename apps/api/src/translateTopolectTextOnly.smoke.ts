/**
 * Offline smoke for Hakka / Teochew / Hokkien text-only translate (demo path, no paid APIs).
 * Clears OpenAI keys before import so the model path stays cold.
 * Run: `npx tsx apps/api/src/translateTopolectTextOnly.smoke.ts`
 */
import assert from 'node:assert/strict'

process.env.OPENAI_API_KEY = ''
process.env.OPENAI_BASE_URL = ''

const {
  isTopolectTextOnlyLang,
  translateHakka,
  translateHokkien,
  translateTeochew,
  translateTopolectTextOnly,
} = await import('./translateTopolectTextOnly.js')

assert.equal(isTopolectTextOnlyLang('hak'), true)
assert.equal(isTopolectTextOnlyLang('teo'), true)
assert.equal(isTopolectTextOnlyLang('nan'), true)
assert.equal(isTopolectTextOnlyLang('ceb'), false)
assert.equal(isTopolectTextOnlyLang('sichuan'), false)

const stage = 'final' as const
const fallbackDefinition = 'hello'

const hak = await translateTopolectTextOnly({
  lang: 'hak',
  from: 'en',
  to: 'hak',
  text: 'hello',
  stage,
  wantAlts: false,
  fallbackDefinition,
})
assert.equal(hak.to, 'hak')
assert.ok(hak.text.trim(), 'Hakka demo/dict returns text')
assert.ok(
  hak.engine === 'demo' || hak.engine === 'dictionary',
  `offline engine expected, got ${hak.engine}`,
)
if (hak.engine === 'demo') {
  assert.match(hak.text, /HAK|示范/, 'Hakka demo tag present')
  assert.ok(hak.romanization, 'Hakka demo includes romanization placeholder')
}

const teo = await translateTeochew({
  from: 'en',
  to: 'teo',
  text: 'thank you',
  stage,
  wantAlts: false,
  fallbackDefinition: 'thanks',
})
assert.equal(teo.to, 'teo')
assert.ok(teo.text.trim())
assert.ok(teo.engine === 'demo' || teo.engine === 'dictionary', `teo engine ${teo.engine}`)

const nan = await translateHokkien({
  from: 'en',
  to: 'nan',
  text: 'good morning',
  stage,
  wantAlts: false,
  fallbackDefinition: 'good morning',
})
assert.equal(nan.to, 'nan')
assert.ok(nan.text.trim())
assert.ok(nan.engine === 'demo' || nan.engine === 'dictionary', `nan engine ${nan.engine}`)
assert.doesNotMatch(nan.text, /zh-TW/i, 'Hokkien must never be labeled zh-TW')

const hakEn = await translateHakka({
  from: 'hak',
  to: 'en',
  text: '你好',
  stage,
  wantAlts: false,
  fallbackDefinition: '',
})
assert.equal(hakEn.to, 'en')
assert.ok(hakEn.text.trim())
assert.ok(hakEn.engine === 'demo' || hakEn.engine === 'dictionary', `hak→en engine ${hakEn.engine}`)

console.log('translateTopolectTextOnly.smoke: ok')
