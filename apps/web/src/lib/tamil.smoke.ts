import assert from 'node:assert/strict'
import { romanizeTamilIso15919 } from './tamilIso15919.ts'
import {
  TAMIL_HONESTY_NOTE,
  detectTamilAddress,
  tamilAddressChip,
  tamilAddressLabel,
} from './tamilPedagogy.ts'

assert.equal(romanizeTamilIso15919('வணக்கம்'), 'vaṇakkam')
assert.equal(romanizeTamilIso15919('தமிழ்'), 'tamiḻ')
assert.equal(romanizeTamilIso15919('நன்றி'), 'naṉṟi')
assert.equal(romanizeTamilIso15919('எப்படி இருக்கீங்க?'), 'eppaṭi irukkīṅka?')
assert.equal(romanizeTamilIso15919('கொடு'), 'koṭu')
assert.equal(romanizeTamilIso15919('கொ'), 'ko', 'decomposed ொ (ெ + ா) normalizes to o')
assert.equal(romanizeTamilIso15919('போ'), 'pō')
assert.equal(romanizeTamilIso15919('ஃ'), 'ḵ')
assert.equal(romanizeTamilIso15919('ஜூஸ்'), 'jūs')
assert.equal(romanizeTamilIso15919('௧௨'), '12')
assert.equal(romanizeTamilIso15919('vanakkam'), null)
assert.equal(romanizeTamilIso15919('नमस्ते'), null)

assert.equal(detectTamilAddress('நீங்கள் எப்படி இருக்கிறீர்கள்?'), 'neengal')
assert.equal(detectTamilAddress('உட்காருங்க'), 'neengal')
assert.equal(detectTamilAddress('நீ எங்கே போற?'), 'nee')
assert.equal(detectTamilAddress('உனக்கு என்ன வேணும்?'), 'nee')
assert.equal(detectTamilAddress('வணக்கம்'), null)
assert.equal(detectTamilAddress('hello'), null)
assert.equal(tamilAddressChip('neengal'), 'நீங்கள்')
assert.equal(tamilAddressLabel('nee'), 'நீ (familiar)')
assert.ok(TAMIL_HONESTY_NOTE.includes('ISO 15919'))
assert.ok(TAMIL_HONESTY_NOTE.includes('not tonal'))

console.log('tamil.smoke ok')
