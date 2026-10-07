import assert from 'node:assert/strict'
import { inferGermanRegister } from './germanRegister.js'

assert.equal(inferGermanRegister('hey what\'s up'), 'colloquial')
assert.equal(inferGermanRegister('Thanks!'), 'colloquial')
assert.equal(
  inferGermanRegister('Dear Sir, please be advised of the following.'),
  'formal',
)
assert.equal(
  inferGermanRegister('To whom it may concern: medical certificate attached.'),
  'formal',
)
assert.equal(inferGermanRegister('Madam, please submit the form.'), 'formal')
assert.equal(inferGermanRegister(''), 'colloquial')

console.log('germanRegister.smoke: ok')
