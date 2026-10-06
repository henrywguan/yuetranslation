import assert from 'node:assert/strict'
import {
  KHMER_READING_HONESTY,
  analyzeKhmer,
  romanizeKhmer,
} from './khmerReading.ts'

assert.equal(romanizeKhmer('សួស្តី'), 'suo-stei')
assert.equal(romanizeKhmer('អរគុណ'), 'ar-kun')
assert.equal(romanizeKhmer('បាទ'), 'bat')
assert.equal(romanizeKhmer('ចាស'), 'chas')
assert.equal(romanizeKhmer('ទេ'), 'te')
assert.equal(romanizeKhmer('ទឹក'), 'tuek')
assert.equal(romanizeKhmer('hello'), null)

const hello = analyzeKhmer('សួស្តី')
assert.ok(hello)
assert.ok(hello!.syllables.length >= 2)
assert.ok(KHMER_READING_HONESTY.toLowerCase().includes('not a lexical tone'))

console.log('khmer.smoke ok')
