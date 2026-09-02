import assert from 'node:assert/strict'
import { parseBatchTranslations, stripLeadingListNumber } from './translateCamera.js'

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

console.log('translateCamera.smoke: ok')
