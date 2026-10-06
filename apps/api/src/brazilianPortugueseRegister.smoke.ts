import assert from 'node:assert/strict'
import { inferBrazilianPortugueseRegister } from './brazilianPortugueseRegister.ts'

assert.equal(inferBrazilianPortugueseRegister('Hey, how are you?'), 'colloquial')
assert.equal(inferBrazilianPortugueseRegister('Where is the bathroom?'), 'colloquial')
assert.equal(
  inferBrazilianPortugueseRegister('Dear Sir, please be advised of the following'),
  'formal',
)
assert.equal(
  inferBrazilianPortugueseRegister('Please find attached the medical certificate'),
  'formal',
)
assert.equal(inferBrazilianPortugueseRegister('To whom it may concern'), 'formal')
assert.equal(inferBrazilianPortugueseRegister(''), 'colloquial')

console.log('brazilianPortugueseRegister.smoke: ok')
