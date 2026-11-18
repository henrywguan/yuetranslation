import assert from 'node:assert/strict'
import {
  boxDetailArgs,
  normalizeRegionLang,
  regionToEditable,
  speakLangForBox,
  type CameraLang,
  type EditableBox,
} from './types'

function box(partial: Partial<EditableBox> & Pick<EditableBox, 'text' | 'translated' | 'from' | 'to'>): EditableBox {
  return {
    id: 't',
    box: { x: 0, y: 0, w: 0.2, h: 0.1 },
    dirty: false,
    ...partial,
  }
}

const bikol = boxDetailArgs(
  box({
    text: 'Natural Biodegradable',
    translated: 'Natural asin Nabubulok',
    from: 'en',
    to: 'bcl',
  }),
)
assert.equal(bikol.lang, 'bcl')
assert.equal(bikol.phrase, 'Natural asin Nabubulok')
assert.equal(bikol.translation, 'Natural Biodegradable')

const ceb = boxDetailArgs(
  box({
    text: 'Hello',
    translated: 'Kumusta',
    from: 'en',
    to: 'ceb',
  }),
)
assert.equal(ceb.lang, 'ceb')
assert.equal(ceb.phrase, 'Kumusta')
assert.equal(ceb.translation, 'Hello')

const ilo = boxDetailArgs(
  box({
    text: 'Thank you',
    translated: 'Agyamanak',
    from: 'en',
    to: 'ilo',
  }),
)
assert.equal(ilo.lang, 'ilo')
assert.equal(ilo.phrase, 'Agyamanak')
assert.equal(ilo.translation, 'Thank you')

const tl = boxDetailArgs(
  box({
    text: 'Good morning',
    translated: 'Magandang umaga',
    from: 'en',
    to: 'tl',
  }),
)
assert.equal(tl.lang, 'tl')
assert.equal(tl.phrase, 'Magandang umaga')
assert.equal(tl.translation, 'Good morning')

const yue = boxDetailArgs(
  box({
    text: 'Hello',
    translated: '你好',
    from: 'en',
    to: 'yue',
  }),
)
assert.equal(yue.lang, 'yue')
assert.equal(yue.phrase, '你好')
assert.equal(yue.translation, 'Hello')

/** Every CameraLang must survive normalizeRegionLang / speakLangForBox (no silent yue). */
const CAMERA_LANGS: CameraLang[] = [
  'en',
  'yue',
  'cmn',
  'wuu',
  'sichuan',
  'tl',
  'es',
  'eses',
  'vi',
  'th',
  'lo',
  'ko',
  'ja',
  'id',
  'ms',
  'pt',
  'fr',
  'hi',
  'km',
  'my',
  'jv',
  'it',
  'de',
  'nl',
  'ar',
  'arsa',
  'ta',
  'ptpt',
  'tr',
  'bn',
  'te',
  'gu',
  'kn',
  'pl',
  'ro',
  'cs',
  'el',
  'hu',
  'sv',
  'ru',
  'uk',
  'he',
  'fa',
  'ur',
  'ceb',
  'ilo',
  'bcl',
]
for (const L of CAMERA_LANGS) {
  assert.equal(normalizeRegionLang(L), L, `normalizeRegionLang(${L})`)
  const editable = regionToEditable({
    id: 'r',
    box: { x: 0, y: 0, w: 0.2, h: 0.1 },
    text: 'src',
    translated: L === 'yue' || L === 'cmn' || L === 'wuu' || L === 'sichuan' ? '中文' : 'dst',
    from: 'en',
    to: L,
    script: 'other',
    cacheHit: false,
  })
  assert.equal(editable.to, L, `regionToEditable to=${L}`)
  assert.equal(speakLangForBox(editable), L, `speakLangForBox to=${L}`)
}

assert.equal(normalizeRegionLang('pt-PT'), 'ptpt')
assert.equal(normalizeRegionLang('pt-BR'), 'pt')
assert.equal(normalizeRegionLang('es-ES'), 'eses')
assert.equal(normalizeRegionLang('fil-PH'), 'tl')
assert.equal(normalizeRegionLang('zh'), 'yue')
assert.equal(normalizeRegionLang('ru-RU'), 'ru')
assert.equal(normalizeRegionLang('he-IL'), 'he')
assert.equal(normalizeRegionLang('te-IN'), 'te')

const taWouldHaveBeenYue = regionToEditable({
  id: 'r',
  box: { x: 0, y: 0, w: 0.2, h: 0.1 },
  text: 'Exit',
  translated: 'வணக்கம்',
  from: 'en',
  to: 'ta',
  script: 'other',
  cacheHit: false,
})
assert.equal(taWouldHaveBeenYue.to, 'ta')
assert.equal(speakLangForBox(taWouldHaveBeenYue), 'ta')
assert.equal(boxDetailArgs(taWouldHaveBeenYue).lang, 'ta')

const ruWouldHaveBeenYue = regionToEditable({
  id: 'r',
  box: { x: 0, y: 0, w: 0.2, h: 0.1 },
  text: 'Exit',
  translated: 'Выход',
  from: 'en',
  to: 'ru',
  script: 'other',
  cacheHit: false,
})
assert.equal(ruWouldHaveBeenYue.to, 'ru')
assert.equal(speakLangForBox(ruWouldHaveBeenYue), 'ru')
assert.equal(boxDetailArgs(ruWouldHaveBeenYue).lang, 'ru')

console.log('boxDetailArgs.smoke: ok')
