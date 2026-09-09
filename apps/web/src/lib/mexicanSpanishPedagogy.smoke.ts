import assert from 'node:assert/strict'
import {
  isFormalMexicanSpanish,
  isInformalMexicanSpanish,
  localFormalizeMexicanSpanish,
} from './mexicanSpanishPedagogy'

function main() {
  assert.equal(isInformalMexicanSpanish('Qué onda, güey'), true)
  assert.equal(isInformalMexicanSpanish('Órale, sale'), true)
  assert.equal(isInformalMexicanSpanish('¿Cómo andas?'), true)
  assert.equal(isInformalMexicanSpanish('Buenos días, ¿cómo está usted?'), false)
  assert.equal(isFormalMexicanSpanish('Buenos días, ¿cómo está usted?'), true)
  assert.equal(isInformalMexicanSpanish('Le agradezco su ayuda'), false)
  assert.equal(isFormalMexicanSpanish('Le agradezco su ayuda'), true)

  const formal = localFormalizeMexicanSpanish('¿Qué onda, hermano?')
  assert.notEqual(formal.toLowerCase(), '¿qué onda, hermano?')
  assert.match(formal, /usted|cómo está/i)
  assert.notEqual(formal.trim(), '')

  console.log('mexicanSpanishPedagogy.smoke: ok', formal)
}

main()
