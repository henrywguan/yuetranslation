import assert from 'node:assert/strict'
import { romanizeHindiIast } from './hindiRomanization.ts'
import {
  detectHindiFormality,
  hindiFormalityChip,
  HINDI_HONESTY_NOTE,
} from './hindiFormality.ts'

assert.equal(romanizeHindiIast('नमस्ते'), 'namaste')
assert.equal(romanizeHindiIast('धन्यवाद'), 'dhanyavāda')
assert.equal(romanizeHindiIast('पानी'), 'pānī')
assert.equal(romanizeHindiIast('हिंदी'), 'hiṃdī') // anusvara spelling
assert.equal(romanizeHindiIast('हिन्दी'), 'hindī') // conjunct न्द्
assert.equal(romanizeHindiIast('हाँ'), 'hām̐')
assert.equal(romanizeHindiIast('नहीं'), 'nahīṃ')
assert.equal(romanizeHindiIast('hello'), null)
assert.equal(romanizeHindiIast('namaste'), null)

assert.equal(detectHindiFormality('आप कैसे हैं?'), 'aap')
assert.equal(detectHindiFormality('माफ़ कीजिए'), 'aap')
assert.equal(detectHindiFormality('तुम कहाँ हो?'), 'tum')
assert.equal(detectHindiFormality('तू जा'), 'tu')
assert.equal(hindiFormalityChip('aap'), 'आप')
assert.ok(HINDI_HONESTY_NOTE.includes('Devanagari'))
assert.ok(HINDI_HONESTY_NOTE.includes('schwa'))

console.log('hindi.smoke ok')
