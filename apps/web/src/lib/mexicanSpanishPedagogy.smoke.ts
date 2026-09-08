import assert from 'node:assert/strict'
import {
  isFormalMexicanSpanish,
  isInformalMexicanSpanish,
} from './mexicanSpanishPedagogy'

function main() {
  assert.equal(isInformalMexicanSpanish('Qué onda, güey'), true)
  assert.equal(isInformalMexicanSpanish('Órale, sale'), true)
  assert.equal(isInformalMexicanSpanish('¿Cómo andas?'), true)
  assert.equal(isInformalMexicanSpanish('Buenos días, ¿cómo está usted?'), false)
  assert.equal(isFormalMexicanSpanish('Buenos días, ¿cómo está usted?'), true)
  assert.equal(isInformalMexicanSpanish('Le agradezco su ayuda'), false)
  assert.equal(isFormalMexicanSpanish('Le agradezco su ayuda'), true)
  console.log('mexicanSpanishPedagogy.smoke: ok')
}

main()
