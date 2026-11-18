import assert from 'node:assert/strict'
import { inferEuropeanPortugueseRegister } from './europeanPortugueseRegister.js'

assert.equal(inferEuropeanPortugueseRegister('Hey, how are you?'), 'colloquial')
assert.equal(inferEuropeanPortugueseRegister('Where is the bathroom?'), 'colloquial')
assert.equal(inferEuropeanPortugueseRegister('Please be advised that your application for leave is approved.'), 'formal')
assert.equal(inferEuropeanPortugueseRegister('Dear Sir, kindly submit the medical certificate.'), 'formal')
assert.equal(inferEuropeanPortugueseRegister('To whom it may concern'), 'formal')
assert.equal(inferEuropeanPortugueseRegister(''), 'colloquial')

console.log('europeanPortugueseRegister.smoke: ok')
