import assert from 'node:assert/strict'
import { inferTurkishRegister } from './turkishRegister.js'

assert.equal(inferTurkishRegister('Hey, how are you?'), 'colloquial')
assert.equal(inferTurkishRegister('Where is the bathroom?'), 'colloquial')
assert.equal(inferTurkishRegister('Please be advised that your application for leave is approved.'), 'formal')
assert.equal(inferTurkishRegister('Dear Sir, kindly submit the medical certificate.'), 'formal')
assert.equal(inferTurkishRegister('To whom it may concern'), 'formal')
assert.equal(inferTurkishRegister(''), 'colloquial')

console.log('turkishRegister.smoke: ok')
