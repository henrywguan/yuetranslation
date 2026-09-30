/**
 * Offline smoke for tap-a-tone notes (no model).
 */
import assert from 'node:assert/strict'
import { toneNoteForSyllable } from './practicePartnerToneNote.ts'

const rising = toneNoteForSyllable('gau2')
assert.ok(rising)
assert.equal(rising?.digit, '2')
assert.equal(rising?.contour, '˧˥')
assert.match(rising?.name || '', /rising/i)
assert.match(rising?.blurb || '', /rise/i)

const stopped = toneNoteForSyllable('baat3')
assert.match(stopped?.blurb || '', /stops short/)

assert.equal(toneNoteForSyllable(''), null)
assert.equal(toneNoteForSyllable('hello'), null)
assert.equal(toneNoteForSyllable('gau2˧˥'), null)

console.log('practicePartnerToneNote.smoke: ok')
