import assert from 'node:assert/strict'
import {
  BURMESE_TONE_HONESTY,
  analyzeBurmese,
  burmeseToneChip,
  burmeseToneLabel,
} from './burmeseMlcts.ts'

assert.equal(analyzeBurmese('hello'), null)
assert.equal(analyzeBurmese(''), null)

const ma = analyzeBurmese('မ')
assert.ok(ma)
assert.equal(ma!.reading, 'ma')
assert.equal(ma!.syllables[0]!.tone, 'low')

const re = analyzeBurmese('ရေ')
assert.ok(re)
assert.equal(re!.reading, 're')

const naLong = analyzeBurmese('နာ')
assert.ok(naLong)
assert.equal(naLong!.reading, 'nā')

const high = analyzeBurmese('ကား')
assert.ok(high)
assert.match(high!.reading, /k[aā]\u0301|ká|kā́/)
assert.equal(high!.syllables[0]!.tone, 'high')

const creaky = analyzeBurmese('မဲ့')
assert.ok(creaky)
assert.equal(creaky!.syllables[0]!.tone, 'creaky')

const checked = analyzeBurmese('လက်')
assert.ok(checked)
assert.equal(checked!.syllables[0]!.tone, 'checked')
assert.match(checked!.reading, /^lak/)

const hello = analyzeBurmese('မင်္ဂလာပါ')
assert.ok(hello, 'hello phrase should yield an MLCTS reading')
// Orthographic MLCTS of မင်္ဂလာပါ ≈ mang-ga-lā-pā (spoken Yangon ~ mingala ba).
assert.match(hello!.reading, /mang/i)
assert.match(hello!.reading, /lā|la/)
assert.ok(hello!.syllables.length >= 3)

assert.equal(burmeseToneLabel('high'), 'High')
assert.equal(burmeseToneChip('creaky'), 'Creaky')
assert.ok(BURMESE_TONE_HONESTY.includes('MLCTS'))
assert.ok(BURMESE_TONE_HONESTY.includes('tone digits'))

console.log('burmeseMlcts.smoke ok')
