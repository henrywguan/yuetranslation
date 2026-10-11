import assert from 'node:assert/strict'
import {
  TTS_EQUALIZE_VOLUME,
  TTS_EQUALIZE_PLAYBACK_GAIN,
  equalizeLangKey,
  ttsEqualizeVolumeAttr,
  ttsEqualizePlaybackGain,
} from '@jyut/shared/ttsVolumeEqualize'

const langs = Object.keys(TTS_EQUALIZE_VOLUME)
assert.ok(langs.includes('yue'))
assert.ok(langs.includes('tl'))
assert.ok(langs.includes('ko'))
assert.ok(langs.includes('ar'))
assert.ok(langs.includes('arsa'))
assert.ok(langs.includes('nl'))

assert.equal(ttsEqualizeVolumeAttr('yue'), null, 'Cantonese is the reference — no SSML boost')
assert.equal(ttsEqualizeVolumeAttr('zh-HK'), null)
assert.equal(ttsEqualizePlaybackGain('yue'), 1, 'Cantonese playback stays unity')

assert.equal(ttsEqualizeVolumeAttr('en'), '+50%', 'English gets Azure max SSML boost')
assert.equal(ttsEqualizeVolumeAttr('nl'), '+50%')
assert.equal(ttsEqualizeVolumeAttr('ko'), '+50%')
assert.equal(ttsEqualizeVolumeAttr('ja-JP'), '+50%')
assert.equal(ttsEqualizeVolumeAttr('fil-PH'), '+50%', 'Tagalog equalizes; x-loud hack removed')
assert.equal(ttsEqualizeVolumeAttr('eses'), '+50%')
assert.equal(ttsEqualizeVolumeAttr('es-MX'), '+50%')

assert.ok(ttsEqualizePlaybackGain('en') > 1, 'English needs client gain beyond SSML')
assert.ok(ttsEqualizePlaybackGain('nl') > ttsEqualizePlaybackGain('en'), 'Dutch softer on phone than English')
assert.ok(ttsEqualizePlaybackGain('nl') >= 2, 'Dutch needs strong client boost')
assert.equal(equalizeLangKey('unknown-xx'), null)
assert.equal(ttsEqualizeVolumeAttr('unknown-xx'), null)
assert.equal(ttsEqualizePlaybackGain('unknown-xx'), 1)

for (const lang of langs) {
  const g = TTS_EQUALIZE_PLAYBACK_GAIN[lang as keyof typeof TTS_EQUALIZE_PLAYBACK_GAIN]
  assert.ok(g >= 1 && g <= 2.5, `${lang} playback gain in range: ${g}`)
  if (lang === 'yue') {
    assert.equal(TTS_EQUALIZE_VOLUME[lang], null)
  } else {
    assert.equal(TTS_EQUALIZE_VOLUME[lang], '+50%')
  }
}

console.log('ttsVolumeEqualize.smoke: ok', {
  langs: langs.length,
  enGain: ttsEqualizePlaybackGain('en'),
  nlGain: ttsEqualizePlaybackGain('nl'),
})
