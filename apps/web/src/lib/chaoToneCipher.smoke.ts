import assert from 'node:assert/strict'
import { decodeChaoToneGlyph } from './chaoToneCipher.ts'
import { rubyJpSyllable } from './jyutping.ts'

assert.equal(decodeChaoToneGlyph('1'), '˥')
assert.equal(decodeChaoToneGlyph('2'), '˧˥')
assert.equal(decodeChaoToneGlyph('3'), '˧')
assert.equal(decodeChaoToneGlyph('4'), '˨˩')
assert.equal(decodeChaoToneGlyph('5'), '˩˧')
assert.equal(decodeChaoToneGlyph('6'), '˨')

// Clipboard path still uses real Chao Unicode.
assert.equal(rubyJpSyllable('teng1'), 'teng1˥')
assert.equal(rubyJpSyllable('hou2'), 'hou2˧˥')

console.log('chaoToneCipher.smoke: ok')
