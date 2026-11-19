import assert from 'node:assert/strict'
import { normalizeCameraLang, parseBatchTranslations, stripLeadingListNumber } from './translateCamera.js'

assert.equal(stripLeadingListNumber('1. 在一所過渡性居所協助殘疾人士。'), '在一所過渡性居所協助殘疾人士。')
assert.equal(stripLeadingListNumber('12) Hello world'), 'Hello world')
assert.equal(stripLeadingListNumber('3、文言測試'), '文言測試')
// Real content numbers must stay
assert.equal(stripLeadingListNumber('50g or more'), '50g or more')
assert.equal(stripLeadingListNumber('2017年畢業'), '2017年畢業')
assert.equal(stripLeadingListNumber('亨利·關'), '亨利·關')

const parsed = parseBatchTranslations(
  JSON.stringify({
    translations: [
      '1. 曼尼一直是UCM投資/交易俱樂部的積極成員；',
      '2. 即使畢業後，',
      '50g 或以上',
    ],
  }),
  ['a', 'b', 'c'],
)
assert.equal(parsed[0], '曼尼一直是UCM投資/交易俱樂部的積極成員；')
assert.equal(parsed[1], '即使畢業後，')
assert.equal(parsed[2], '50g 或以上')

for (const [alias, code] of [
  ['az', 'az'], ['az-AZ', 'az'], ['kk-kz', 'kk'], ['uz-UZ', 'uz'], ['bg-BG', 'bg'], ['sr-RS', 'sr'], ['sw-KE', 'sw'], ['af-ZA', 'af'],
  ['et', 'et'], ['et-EE', 'et'], ['et-ee', 'et'], ['lv', 'lv'], ['lv-LV', 'lv'], ['lv-lv', 'lv'], ['lt', 'lt'], ['lt-LT', 'lt'], ['lt-lt', 'lt'], ['ga', 'ga'], ['ga-IE', 'ga'], ['ga-ie', 'ga'], ['cy', 'cy'], ['cy-GB', 'cy'], ['cy-gb', 'cy'], ['eu', 'eu'], ['eu-ES', 'eu'], ['eu-es', 'eu'], ['gl', 'gl'], ['gl-ES', 'gl'], ['gl-es', 'gl'], ['mt', 'mt'], ['mt-MT', 'mt'], ['mt-mt', 'mt'], ['is', 'is'], ['is-IS', 'is'], ['is-is', 'is'], ['bs', 'bs'], ['bs-BA', 'bs'], ['bs-ba', 'bs'], ['sq', 'sq'], ['sq-AL', 'sq'], ['sq-al', 'sq'], ['zu', 'zu'], ['zu-ZA', 'zu'], ['zu-za', 'zu'], ['so', 'so'], ['so-SO', 'so'], ['so-so', 'so'], ['as', 'as'], ['as-IN', 'as'], ['as-in', 'as'], ['mk', 'mk'], ['mk-MK', 'mk'], ['mk-mk', 'mk'], ['mn', 'mn'], ['mn-MN', 'mn'], ['mn-mn', 'mn'], ['hy', 'hy'], ['hy-AM', 'hy'], ['hy-am', 'hy'], ['ka', 'ka'], ['ka-GE', 'ka'], ['ka-ge', 'ka'], ['am', 'am'], ['am-ET', 'am'], ['am-et', 'am'], ['ps', 'ps'], ['ps-AF', 'ps'], ['ps-af', 'ps'],
] as const) {
  assert.equal(normalizeCameraLang(alias), code, `${alias} normalizes to ${code}`)
}

console.log('translateCamera.smoke: ok')
