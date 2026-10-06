import assert from 'node:assert/strict'
import { inferKhmerRegister } from './khmerRegister.js'

assert.equal(inferKhmerRegister('hello'), 'colloquial')
assert.equal(inferKhmerRegister('Where is the bathroom?'), 'colloquial')
assert.equal(inferKhmerRegister('Please be advised of the following'), 'formal')
assert.equal(inferKhmerRegister('Dear Sir, kindly submit the affidavit'), 'formal')
assert.equal(inferKhmerRegister(''), 'colloquial')

console.log('khmerRegister.smoke ok')
