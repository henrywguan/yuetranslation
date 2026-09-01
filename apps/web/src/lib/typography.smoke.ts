import assert from 'node:assert/strict'
import { normalizeEnglishApostrophes } from './typography.js'

assert.equal(normalizeEnglishApostrophes("We don\u2019t"), "We don't")
assert.equal(normalizeEnglishApostrophes("Service\u2019s pricing"), "Service's pricing")
assert.equal(normalizeEnglishApostrophes("plain"), 'plain')

console.log('typography.smoke: ok')
