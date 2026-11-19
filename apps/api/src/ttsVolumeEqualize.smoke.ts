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
for (const code of ['ta', 'ptpt', 'tr', 'bn', 'te', 'gu', 'kn', 'pl', 'ro', 'cs', 'el', 'hu', 'sv', 'ru', 'uk', 'he', 'fa', 'ur']) assert.ok(langs.includes(code), code)
for (const code of ['ml', 'mr', 'pa', 'or', 'si', 'ne', 'da', 'nb', 'fi', 'sk', 'hr', 'ca']) assert.ok(langs.includes(code), code)
assert.equal(equalizeLangKey('pt-PT'), 'ptpt', 'European Portuguese never folds into pt-BR')
assert.equal(equalizeLangKey('pt-BR'), 'pt')
assert.equal(equalizeLangKey('ta-IN'), 'ta')
assert.equal(equalizeLangKey('tr-TR'), 'tr')
assert.equal(equalizeLangKey('bn-IN'), 'bn')
assert.equal(equalizeLangKey('te-IN'), 'te')
assert.equal(equalizeLangKey('gu-IN'), 'gu')
assert.equal(equalizeLangKey('kn-IN'), 'kn')
assert.equal(equalizeLangKey('pl-PL'), 'pl')
assert.equal(equalizeLangKey('ro-RO'), 'ro')
assert.equal(equalizeLangKey('cs-CZ'), 'cs')
assert.equal(equalizeLangKey('el-GR'), 'el')
assert.equal(equalizeLangKey('hu-HU'), 'hu')
assert.equal(equalizeLangKey('sv-SE'), 'sv')
assert.equal(equalizeLangKey('ru-RU'), 'ru')
assert.equal(equalizeLangKey('uk-UA'), 'uk')
assert.equal(equalizeLangKey('he-IL'), 'he')
assert.equal(equalizeLangKey('fa-IR'), 'fa')
assert.equal(equalizeLangKey('ur-IN'), 'ur')
assert.equal(equalizeLangKey('ml-IN'), 'ml')
assert.equal(equalizeLangKey('mr-IN'), 'mr')
assert.equal(equalizeLangKey('pa-IN'), 'pa')
assert.equal(equalizeLangKey('or-IN'), 'or')
assert.equal(equalizeLangKey('si-LK'), 'si')
assert.equal(equalizeLangKey('ne-NP'), 'ne')
assert.equal(equalizeLangKey('da-DK'), 'da')
assert.equal(equalizeLangKey('nb-NO'), 'nb')
assert.equal(equalizeLangKey('fi-FI'), 'fi')
assert.equal(equalizeLangKey('sk-SK'), 'sk')
assert.equal(equalizeLangKey('hr-HR'), 'hr')
assert.equal(equalizeLangKey('ca-ES'), 'ca')
assert.equal(equalizeLangKey('sichuan'), 'sichuan', 'Sichuanese never folds into Sinhala (si)')
assert.equal(equalizeLangKey('si'), 'si')

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
    assert.equal(TTS_EQUALIZE_VOLUME[lang as keyof typeof TTS_EQUALIZE_VOLUME], null)
  } else {
    assert.equal(TTS_EQUALIZE_VOLUME[lang as keyof typeof TTS_EQUALIZE_VOLUME], '+50%')
  }
}

console.log('ttsVolumeEqualize.smoke: ok', {
  langs: langs.length,
  enGain: ttsEqualizePlaybackGain('en'),
  nlGain: ttsEqualizePlaybackGain('nl'),
})
