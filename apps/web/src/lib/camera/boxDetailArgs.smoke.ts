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
  'ml',
  'mr',
  'pa',
  'or',
  'si',
  'ne',
  'da',
  'nb',
  'fi',
  'sk',
  'hr',
  'ca',
  'az',
  'kk',
  'uz',
  'bg',
  'sr',
  'sw',
  'af',
  'et',
  'lv',
  'lt',
  'ga',
  'cy',
  'eu',
  'gl',
  'mt',
  'is',
  'bs',
  'sq',
  'zu',
  'so',
  'as',
  'mk',
  'mn',
  'ps',
  'hy',
  'ka',
  'am',
  'ceb',
  'ilo',
  'bcl',
  'hak',
  'teo',
  'nan',
]
for (const L of CAMERA_LANGS) {
  assert.equal(normalizeRegionLang(L), L, `normalizeRegionLang(${L})`)
  const editable = regionToEditable({
    id: 'r',
    box: { x: 0, y: 0, w: 0.2, h: 0.1 },
    text: 'src',
    translated:
      L === 'yue' ||
      L === 'cmn' ||
      L === 'wuu' ||
      L === 'sichuan' ||
      L === 'hak' ||
      L === 'teo' ||
      L === 'nan'
        ? '中文'
        : 'dst',
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
assert.equal(normalizeRegionLang('ml-IN'), 'ml')
assert.equal(normalizeRegionLang('mr-IN'), 'mr')
assert.equal(normalizeRegionLang('pa-IN'), 'pa')
assert.equal(normalizeRegionLang('or-IN'), 'or')
assert.equal(normalizeRegionLang('si-LK'), 'si')
assert.equal(normalizeRegionLang('si'), 'si')
assert.equal(normalizeRegionLang('ne-NP'), 'ne')
assert.equal(normalizeRegionLang('da-DK'), 'da')
assert.equal(normalizeRegionLang('nb-NO'), 'nb')
assert.equal(normalizeRegionLang('no-NO'), 'nb')
assert.equal(normalizeRegionLang('fi-FI'), 'fi')
assert.equal(normalizeRegionLang('sk-SK'), 'sk')
assert.equal(normalizeRegionLang('hr-HR'), 'hr')
assert.equal(normalizeRegionLang('ca-ES'), 'ca')
assert.equal(normalizeRegionLang('sichuan'), 'sichuan', 'Sinhala si never swallows sichuan')
assert.equal(normalizeRegionLang('zh-CN-sichuan'), 'sichuan')
assert.equal(normalizeRegionLang('fil-PH'), 'tl', 'fi never swallows fil-PH')
assert.equal(normalizeRegionLang('si-LK'), 'si')
assert.equal(normalizeRegionLang('da-DK'), 'da')
assert.equal(normalizeRegionLang('nb-NO'), 'nb')
assert.equal(normalizeRegionLang('ca-ES'), 'ca')
assert.equal(normalizeRegionLang('sichuan'), 'sichuan')
assert.equal(normalizeRegionLang('az-AZ'), 'az')
assert.equal(normalizeRegionLang('kk-KZ'), 'kk')
assert.equal(normalizeRegionLang('uz-UZ'), 'uz')
assert.equal(normalizeRegionLang('bg-BG'), 'bg')
assert.equal(normalizeRegionLang('sr-RS'), 'sr')
assert.equal(normalizeRegionLang('sr-Cyrl-RS'), 'sr')
assert.equal(normalizeRegionLang('sw-KE'), 'sw')
assert.equal(normalizeRegionLang('af-ZA'), 'af')
assert.equal(normalizeRegionLang('sv-SE'), 'sv', 'sw / sr never swallow sv')
assert.equal(normalizeRegionLang('fa-IR'), 'fa', 'af never swallows fa')
assert.equal(normalizeRegionLang('et-EE'), 'et')
assert.equal(normalizeRegionLang('lv-LV'), 'lv')
assert.equal(normalizeRegionLang('lt-LT'), 'lt')
assert.equal(normalizeRegionLang('ga-IE'), 'ga')
assert.equal(normalizeRegionLang('cy-GB'), 'cy')
assert.equal(normalizeRegionLang('eu-ES'), 'eu')
assert.equal(normalizeRegionLang('gl-ES'), 'gl')
assert.equal(normalizeRegionLang('mt-MT'), 'mt')
assert.equal(normalizeRegionLang('is-IS'), 'is')
assert.equal(normalizeRegionLang('bs-BA'), 'bs')
assert.equal(normalizeRegionLang('bs-Latn-BA'), 'bs')
assert.equal(normalizeRegionLang('sq-AL'), 'sq')
assert.equal(normalizeRegionLang('zu-ZA'), 'zu')
assert.equal(normalizeRegionLang('so-SO'), 'so')
assert.equal(normalizeRegionLang('as-IN'), 'as')
assert.equal(normalizeRegionLang('mk-MK'), 'mk')
assert.equal(normalizeRegionLang('mn-MN'), 'mn')
assert.equal(normalizeRegionLang('ps-AF'), 'ps')
assert.equal(normalizeRegionLang('hy-AM'), 'hy')
assert.equal(normalizeRegionLang('ka-GE'), 'ka')
assert.equal(normalizeRegionLang('am-ET'), 'am')
assert.equal(normalizeRegionLang('it-IT'), 'it', 'is never swallows it')
assert.equal(normalizeRegionLang('id-ID'), 'id', 'is never swallows id')
assert.equal(normalizeRegionLang('ar-SA'), 'arsa', 'as / am never swallow ar')
assert.equal(normalizeRegionLang('es-ES'), 'eses', 'et / eu never swallow es')
assert.equal(normalizeRegionLang('el-GR'), 'el', 'eu never swallows el')
assert.equal(normalizeRegionLang('ms-MY'), 'ms', 'mt / mn / mk never swallow ms')
assert.equal(normalizeRegionLang('mr-IN'), 'mr', 'mn / mk never swallow mr')
assert.equal(normalizeRegionLang('ml-IN'), 'ml', 'mt / mn / mk never swallow ml')
assert.equal(normalizeRegionLang('pa-IN'), 'pa', 'ps never swallows pa')
assert.equal(normalizeRegionLang('pt-PT'), 'ptpt', 'ps never swallows pt')
assert.equal(normalizeRegionLang('sv-SE'), 'sv', 'so / sq never swallow sv')
assert.equal(normalizeRegionLang('si-LK'), 'si', 'so never swallows si')
assert.equal(normalizeRegionLang('he-IL'), 'he', 'hy never swallows he')
assert.equal(normalizeRegionLang('hu-HU'), 'hu', 'hy never swallows hu')
assert.equal(normalizeRegionLang('kn-IN'), 'kn', 'ka never swallows kn')
assert.equal(normalizeRegionLang('km-KH'), 'km', 'ka never swallows km')
assert.equal(normalizeRegionLang('bn-IN'), 'bn', 'bs never swallows bn')
assert.equal(normalizeRegionLang('lo-LA'), 'lo', 'lt / lv never swallow lo')
assert.equal(normalizeRegionLang('cs-CZ'), 'cs', 'cy never swallows cs')

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

for (const [to, translated] of [
  ['ml', 'നമസ്കാരം'],
  ['si', 'ආයුබෝවන්'],
  ['da', 'Hej'],
  ['ca', 'Hola'],
  ['az', 'Salam'],
  ['kk', 'Сәлем'],
  ['uz', 'Salom'],
  ['bg', 'Здравей'],
  ['sr', 'Здраво'],
  ['sw', 'Habari'],
  ['af', 'Hallo'],
  ['et', 'Tere'],
  ['lv', 'Sveiki'],
  ['lt', 'Labas'],
  ['ga', 'Dia duit'],
  ['cy', 'Helo'],
  ['eu', 'Kaixo'],
  ['gl', 'Ola'],
  ['mt', 'Bongu'],
  ['is', 'Halló'],
  ['bs', 'Zdravo'],
  ['sq', 'Përshëndetje'],
  ['zu', 'Sawubona'],
  ['so', 'Salaan'],
  ['as', 'নমস্কাৰ'],
  ['mk', 'Здраво'],
  ['mn', 'Сайн уу'],
  ['ps', 'سلام'],
  ['hy', 'Բարև'],
  ['ka', 'გამარჯობა'],
  ['am', 'ሰላም'],
] as const) {
  const box = regionToEditable({
    id: 'r',
    box: { x: 0, y: 0, w: 0.2, h: 0.1 },
    text: 'Hello',
    translated,
    from: 'en',
    to,
    script: 'other',
    cacheHit: false,
  })
  assert.equal(box.to, to)
  assert.equal(speakLangForBox(box), to)
  const args = boxDetailArgs(box)
  assert.equal(args.lang, to, `${to} detail lang survives`)
  assert.equal(args.phrase, translated)
  assert.equal(args.translation, 'Hello')
}

console.log('boxDetailArgs.smoke: ok')
