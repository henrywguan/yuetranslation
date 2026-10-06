import assert from 'node:assert/strict'
import { inferItalianRegister } from './italianRegister.js'

assert.equal(inferItalianRegister('hey what\'s up'), 'colloquial')
assert.equal(inferItalianRegister('Thanks!'), 'colloquial')
assert.equal(
  inferItalianRegister('Dear Sir, please be advised of the following.'),
  'formal',
)
assert.equal(
  inferItalianRegister('To whom it may concern: medical certificate attached.'),
  'formal',
)
assert.equal(inferItalianRegister('Madam, please submit the form.'), 'formal')
assert.equal(inferItalianRegister(''), 'colloquial')

console.log('italianRegister.smoke: ok')
