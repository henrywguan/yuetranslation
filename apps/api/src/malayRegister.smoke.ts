import assert from 'node:assert/strict'
import { inferMalayRegister } from './malayRegister.js'

assert.equal(inferMalayRegister('how are you'), 'colloquial')
assert.equal(inferMalayRegister('Thanks!'), 'colloquial')
assert.equal(inferMalayRegister('Please be advised that your application was received.'), 'formal')
assert.equal(inferMalayRegister('Dear Sir, kindly submit the medical certificate.'), 'formal')
assert.equal(inferMalayRegister('Madam, please advise on the next steps.'), 'formal')
assert.equal(inferMalayRegister(''), 'colloquial')

console.log('malayRegister.smoke ok')
