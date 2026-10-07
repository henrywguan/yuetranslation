import assert from 'node:assert/strict'
import { inferDutchRegister } from './dutchRegister.js'

assert.equal(inferDutchRegister("hey what's up"), 'colloquial')
assert.equal(inferDutchRegister('Thanks!'), 'colloquial')
assert.equal(
  inferDutchRegister('Dear Sir, please be advised of the following.'),
  'formal',
)
assert.equal(
  inferDutchRegister('To whom it may concern: medical certificate attached.'),
  'formal',
)
assert.equal(inferDutchRegister('Madam, please submit the form.'), 'formal')
assert.equal(inferDutchRegister(''), 'colloquial')

console.log('dutchRegister.smoke: ok')
