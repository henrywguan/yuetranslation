import assert from 'node:assert/strict'
import { inferJavaneseRegister } from './javaneseRegister.js'

assert.equal(inferJavaneseRegister('how are you'), 'ngoko')
assert.equal(inferJavaneseRegister('Thanks!'), 'ngoko')
assert.equal(inferJavaneseRegister('Please be advised that your application was received.'), 'respectful')
assert.equal(inferJavaneseRegister('Dear Sir, kindly submit the medical certificate.'), 'respectful')
assert.equal(inferJavaneseRegister('Madam, please advise on the next steps.'), 'respectful')
assert.equal(inferJavaneseRegister(''), 'ngoko')

console.log('javaneseRegister.smoke ok')
