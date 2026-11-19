import assert from 'node:assert/strict'
import { PRIMARY_LANGS } from './entitlements.js'
import {
  DEFAULT_CA_VOICE,
  DEFAULT_SI_VOICE,
  PREVIEW_ML,
  resolveSpeakVoice,
  voiceMeta,
} from '@jyut/shared'

const CASES: Array<[code: string, locale: string, female: string, male: string | null]> = [
  ['ml', 'ml-IN', 'ml-IN-SobhanaNeural', 'ml-IN-MidhunNeural'],
  ['mr', 'mr-IN', 'mr-IN-AarohiNeural', 'mr-IN-ManoharNeural'],
  ['pa', 'pa-IN', 'pa-IN-VaaniNeural', 'pa-IN-OjasNeural'],
  ['or', 'or-IN', 'or-IN-SubhasiniNeural', 'or-IN-SukantNeural'],
  ['si', 'si-LK', 'si-LK-ThiliniNeural', 'si-LK-SameeraNeural'],
  ['ne', 'ne-NP', 'ne-NP-HemkalaNeural', 'ne-NP-SagarNeural'],
  ['da', 'da-DK', 'da-DK-ChristelNeural', 'da-DK-JeppeNeural'],
  ['nb', 'nb-NO', 'nb-NO-PernilleNeural', 'nb-NO-FinnNeural'],
  ['fi', 'fi-FI', 'fi-FI-SelmaNeural', 'fi-FI-HarriNeural'],
  ['sk', 'sk-SK', 'sk-SK-ViktoriaNeural', 'sk-SK-LukasNeural'],
  ['hr', 'hr-HR', 'hr-HR-GabrijelaNeural', 'hr-HR-SreckoNeural'],
  ['ca', 'ca-ES', 'ca-ES-JoanaNeural', 'ca-ES-EnricNeural'],
]

for (const [code, locale, female, male] of CASES) {
  for (const alias of [code, locale, locale.toLowerCase()]) {
    const pick = resolveSpeakVoice(alias)
    assert.equal(pick.voice, female, `${alias} defaults to the female voice (never Yue)`)
    assert.equal(pick.xmlLang, locale)
  }
  assert.equal(voiceMeta(female)?.lang, code)
  assert.equal(voiceMeta(male!)?.gender, 'male')
  assert.equal(resolveSpeakVoice(code, null, null, null, null, null, null, null, male).voice, male, `${code} honours a same-lang override`)
  assert.equal(resolveSpeakVoice('en', null, null, null, null, null, null, null, male).voice.startsWith('en-'), true, `${code} override never leaks into En`)
}

assert.equal(resolveSpeakVoice('sichuan').voice, 'zh-CN-sichuan-YunxiNeural', 'Sichuanese stays Sichuanese')
assert.equal(resolveSpeakVoice('si').voice, DEFAULT_SI_VOICE)
assert.equal(DEFAULT_CA_VOICE, 'ca-ES-JoanaNeural')
assert.ok(PREVIEW_ML.length > 0)
assert.equal(PRIMARY_LANGS.length, 56)
for (const [code] of CASES) assert.ok((PRIMARY_LANGS as readonly string[]).includes(code), `${code} is a primary`)

console.log('ttsVoicesBatch3a.smoke: ok')
