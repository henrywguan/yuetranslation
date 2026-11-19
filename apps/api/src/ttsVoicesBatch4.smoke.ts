import assert from 'node:assert/strict'
import { PRIMARY_LANGS } from './entitlements.js'
import { normalizeCameraLang } from './translateCamera.js'
import {
  DEFAULT_AS_VOICE,
  DEFAULT_PS_VOICE,
  PREVIEW_HY,
  equalizeLangKey,
  resolveSpeakVoice,
  voiceMeta,
} from '@jyut/shared'

const CASES: Array<[code: string, locale: string, female: string, male: string]> = [
  ['et', 'et-EE', 'et-EE-AnuNeural', 'et-EE-KertNeural'],
  ['lv', 'lv-LV', 'lv-LV-EveritaNeural', 'lv-LV-NilsNeural'],
  ['lt', 'lt-LT', 'lt-LT-OnaNeural', 'lt-LT-LeonasNeural'],
  ['ga', 'ga-IE', 'ga-IE-OrlaNeural', 'ga-IE-ColmNeural'],
  ['cy', 'cy-GB', 'cy-GB-NiaNeural', 'cy-GB-AledNeural'],
  ['eu', 'eu-ES', 'eu-ES-AinhoaNeural', 'eu-ES-AnderNeural'],
  ['gl', 'gl-ES', 'gl-ES-SabelaNeural', 'gl-ES-RoiNeural'],
  ['mt', 'mt-MT', 'mt-MT-GraceNeural', 'mt-MT-JosephNeural'],
  ['is', 'is-IS', 'is-IS-GudrunNeural', 'is-IS-GunnarNeural'],
  ['bs', 'bs-BA', 'bs-BA-VesnaNeural', 'bs-BA-GoranNeural'],
  ['sq', 'sq-AL', 'sq-AL-AnilaNeural', 'sq-AL-IlirNeural'],
  ['zu', 'zu-ZA', 'zu-ZA-ThandoNeural', 'zu-ZA-ThembaNeural'],
  ['so', 'so-SO', 'so-SO-UbaxNeural', 'so-SO-MuuseNeural'],
  ['as', 'as-IN', 'as-IN-YashicaNeural', 'as-IN-PriyomNeural'],
  ['mk', 'mk-MK', 'mk-MK-MarijaNeural', 'mk-MK-AleksandarNeural'],
  ['mn', 'mn-MN', 'mn-MN-YesuiNeural', 'mn-MN-BataaNeural'],
  ['hy', 'hy-AM', 'hy-AM-AnahitNeural', 'hy-AM-HaykNeural'],
  ['ka', 'ka-GE', 'ka-GE-EkaNeural', 'ka-GE-GiorgiNeural'],
  ['am', 'am-ET', 'am-ET-MekdesNeural', 'am-ET-AmehaNeural'],
  ['ps', 'ps-AF', 'ps-AF-LatifaNeural', 'ps-AF-GulNawazNeural'],
]

for (const [code, locale, female, male] of CASES) {
  for (const alias of [code, locale, locale.toLowerCase()]) {
    const pick = resolveSpeakVoice(alias)
    assert.equal(pick.voice, female, `${alias} defaults to the female voice (never Yue)`)
    assert.equal(pick.xmlLang, locale)
    assert.equal(equalizeLangKey(alias), code, `${alias} equalize key`)
    assert.equal(normalizeCameraLang(alias), code, `${alias} camera lang`)
  }
  assert.equal(voiceMeta(female)?.lang, code)
  assert.equal(voiceMeta(female)?.gender, 'female')
  assert.equal(voiceMeta(male)?.gender, 'male')
  assert.equal(resolveSpeakVoice(code, null, null, null, null, null, null, null, male).voice, male, `${code} honours a same-lang override`)
  assert.equal(resolveSpeakVoice('en', null, null, null, null, null, null, null, male).voice.startsWith('en-'), true, `${code} override never leaks into En`)
  assert.equal(resolveSpeakVoice('yue', null, null, null, null, null, null, null, male).voice.startsWith('zh-HK'), true, `${code} override never leaks into Yue`)
}

// Short codes are exact matches — near-miss prefixes never resolve to a long-tail voice.
for (const near of ['ass', 'asm', 'ism', 'isl', 'som', 'amh', 'eus', 'glg', 'gle', 'is-', 'as-', 'xis', 'ais']) {
  assert.equal(equalizeLangKey(near), null, `${near} is not an equalize key`)
  assert.equal(normalizeCameraLang(near), undefined, `${near} is not a camera lang`)
  assert.equal(resolveSpeakVoice(near).voice.startsWith('zh-HK'), true, `${near} falls through to Yue, not a long-tail voice`)
}
assert.equal(equalizeLangKey('ar-SA'), 'arsa', 'ar-SA never folds into Assamese (as)')
assert.equal(equalizeLangKey('es'), 'es', 'es never folds into Basque / Estonian')
assert.equal(resolveSpeakVoice('is').xmlLang, 'is-IS')
assert.equal(resolveSpeakVoice('as').xmlLang, 'as-IN')

assert.equal(DEFAULT_AS_VOICE, 'as-IN-YashicaNeural')
assert.equal(DEFAULT_PS_VOICE, 'ps-AF-LatifaNeural')
assert.ok(PREVIEW_HY.length > 0)
assert.ok(PRIMARY_LANGS.length >= 83, 'Batch 4 primaries registered (63 -> 83)')
for (const [code] of CASES) assert.ok((PRIMARY_LANGS as readonly string[]).includes(code), `${code} is a primary`)
assert.equal(new Set(PRIMARY_LANGS).size, PRIMARY_LANGS.length, 'PRIMARY_LANGS has no duplicates')

console.log('ttsVoicesBatch4.smoke: ok')
