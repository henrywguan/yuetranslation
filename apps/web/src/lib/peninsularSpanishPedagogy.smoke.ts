import assert from 'node:assert/strict'
import {
  isFormalPeninsularSpanish,
  isInformalPeninsularSpanish,
  localFormalizePeninsularSpanish,
} from './peninsularSpanishPedagogy.ts'

assert.equal(isInformalPeninsularSpanish('¿Qué tal, tío?'), true)
assert.equal(isInformalPeninsularSpanish('¿Cómo está usted?'), false)
assert.equal(isFormalPeninsularSpanish('Estimado señor, le agradezco su atención.'), true)

const formal = localFormalizePeninsularSpanish('¿Qué tal, tío?')
assert.match(formal.toLowerCase(), /cómo está/)
assert.doesNotMatch(formal.toLowerCase(), /tío|tio/)

console.log('peninsularSpanishPedagogy.smoke: ok', formal)
