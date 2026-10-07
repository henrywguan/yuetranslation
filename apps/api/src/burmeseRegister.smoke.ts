import assert from 'node:assert/strict'
import { inferBurmeseRegister } from './burmeseRegister.js'

assert.equal(inferBurmeseRegister('hello'), 'colloquial')
assert.equal(inferBurmeseRegister('Where is the bathroom?'), 'colloquial')
assert.equal(inferBurmeseRegister('Please be advised that payment is due.'), 'formal')
assert.equal(inferBurmeseRegister('Dear Sir, kindly submit the medical certificate.'), 'formal')
assert.equal(inferBurmeseRegister('To whom it may concern'), 'formal')
assert.equal(inferBurmeseRegister(''), 'colloquial')

console.log('burmeseRegister.smoke ok')
