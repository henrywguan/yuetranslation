import assert from 'node:assert/strict'
import { localFormalizeMexicanSpanish, translate } from './translate.js'

async function main() {
  const local = localFormalizeMexicanSpanish('¿Qué onda, hermano?')
  assert.notEqual(local.toLowerCase(), '¿qué onda, hermano?')
  assert.match(local, /usted|cómo está/i)

  // es→es formal rewrite must not require Han (Latin script).
  const result = await translate({
    text: '¿Qué onda, hermano?',
    from: 'es',
    to: 'es',
    register: 'formal',
    includeAlternatives: true,
  })
  assert.ok(result.text.trim(), 'rewrite returned empty text')
  assert.notEqual(result.text.trim().toLowerCase(), '¿qué onda, hermano?')
  console.log('mexicanSpanishFormal.smoke: ok', result.text, result.meta)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
