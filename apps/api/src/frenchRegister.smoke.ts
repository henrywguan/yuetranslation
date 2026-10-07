import assert from 'node:assert/strict'
import { inferFrenchRegister } from './frenchRegister.js'

assert.equal(inferFrenchRegister('hey what\'s up'), 'colloquial')
assert.equal(inferFrenchRegister('Thanks!'), 'colloquial')
assert.equal(
  inferFrenchRegister('Dear Sir, please be advised of the following.'),
  'formal',
)
assert.equal(
  inferFrenchRegister('To whom it may concern: medical certificate attached.'),
  'formal',
)
assert.equal(inferFrenchRegister('Madam, please submit the form.'), 'formal')
assert.equal(inferFrenchRegister(''), 'colloquial')

console.log('frenchRegister.smoke: ok')
