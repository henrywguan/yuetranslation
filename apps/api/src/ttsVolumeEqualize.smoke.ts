import assert from 'node:assert/strict'
import {
  TTS_EQUALIZE_VOLUME,
  equalizeLangKey,
  ttsEqualizeVolumeAttr,
} from '@jyut/shared/ttsVolumeEqualize'

const langs = Object.keys(TTS_EQUALIZE_VOLUME)
assert.ok(langs.includes('yue'))
assert.ok(langs.includes('tl'))
assert.ok(langs.includes('ko'))
assert.ok(langs.includes('ar'))
assert.ok(langs.includes('arsa'))
assert.equal(ttsEqualizeVolumeAttr('yue'), null, 'Cantonese is the reference — no attenuate')
assert.equal(ttsEqualizeVolumeAttr('zh-HK'), null)
assert.equal(ttsEqualizeVolumeAttr('ko'), '-60%')
assert.equal(ttsEqualizeVolumeAttr('ja-JP'), '-60%')
assert.equal(ttsEqualizeVolumeAttr('en'), '-40%')
assert.equal(ttsEqualizeVolumeAttr('fil-PH'), '-40%', 'Tagalog equalizes; x-loud hack removed')
assert.equal(ttsEqualizeVolumeAttr('eses'), '-20%')
assert.equal(ttsEqualizeVolumeAttr('es-MX'), '-40%')
assert.equal(equalizeLangKey('unknown-xx'), null)
assert.equal(ttsEqualizeVolumeAttr('unknown-xx'), null)

console.log('ttsVolumeEqualize.smoke: ok', { langs: langs.length })
