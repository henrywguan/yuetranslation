import assert from 'node:assert/strict'
import { PRIMARY_LANGS } from './entitlements.js'
import {
  DEFAULT_AF_VOICE,
  DEFAULT_SR_VOICE,
  PREVIEW_KK,
  resolveSpeakVoice,
  voiceMeta,
} from '@jyut/shared'

const CASES: Array<[code: string, locale: string, female: string, male: string]> = [
  ['az', 'az-AZ', 'az-AZ-BanuNeural', 'az-AZ-BabekNeural'],
  ['kk', 'kk-KZ', 'kk-KZ-AigulNeural', 'kk-KZ-DauletNeural'],
  ['uz', 'uz-UZ', 'uz-UZ-MadinaNeural', 'uz-UZ-SardorNeural'],
  ['bg', 'bg-BG', 'bg-BG-KalinaNeural', 'bg-BG-BorislavNeural'],
  ['sr', 'sr-RS', 'sr-RS-SophieNeural', 'sr-RS-NicholasNeural'],
  ['sw', 'sw-KE', 'sw-KE-ZuriNeural', 'sw-KE-RafikiNeural'],
  ['af', 'af-ZA', 'af-ZA-AdriNeural', 'af-ZA-WillemNeural'],
]

for (const [code, locale, female, male] of CASES) {
  for (const alias of [code, locale, locale.toLowerCase()]) {
    const pick = resolveSpeakVoice(alias)
    assert.equal(pick.voice, female, `${alias} defaults to the female voice (never Yue)`)
    assert.equal(pick.xmlLang, locale)
  }
  assert.equal(voiceMeta(female)?.lang, code)
  assert.equal(voiceMeta(male)?.gender, 'male')
  assert.equal(resolveSpeakVoice(code, null, null, null, null, null, null, null, male).voice, male, `${code} honours a same-lang override`)
  assert.equal(resolveSpeakVoice('en', null, null, null, null, null, null, null, male).voice.startsWith('en-'), true, `${code} override never leaks into En`)
}

assert.equal(resolveSpeakVoice('sr').xmlLang, 'sr-RS', 'Serbian is Cyrillic sr-RS, never sr-Latn')
assert.ok(!resolveSpeakVoice('sr').voice.includes('Latn'))
assert.equal(DEFAULT_SR_VOICE, 'sr-RS-SophieNeural')
assert.equal(DEFAULT_AF_VOICE, 'af-ZA-AdriNeural')
assert.ok(PREVIEW_KK.length > 0)
assert.ok(PRIMARY_LANGS.length >= 63, 'Batch 3b primaries remain registered')
for (const [code] of CASES) assert.ok((PRIMARY_LANGS as readonly string[]).includes(code), `${code} is a primary`)

console.log('ttsVoicesBatch3b.smoke: ok')
