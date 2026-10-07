import assert from 'node:assert/strict'
import { inferHindiRegister } from './hindiRegister.js'

assert.equal(inferHindiRegister('where is the station?'), 'colloquial')
assert.equal(inferHindiRegister('Please be advised that your application for leave is approved.'), 'formal')
assert.equal(inferHindiRegister('Dear Sir, kindly submit the medical certificate.'), 'formal')
assert.equal(inferHindiRegister(''), 'colloquial')

console.log('hindiRegister.smoke: ok')
