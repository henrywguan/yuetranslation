import assert from 'node:assert/strict'
import { localFormalizePeninsularSpanish, translate } from './translate.js'

async function main() {
  const local = localFormalizePeninsularSpanish('¿Qué tal, tío?')
  assert.notEqual(local.toLowerCase(), '¿qué tal, tío?')
  assert.match(local, /usted|cómo está/i)

  // eses→eses formal rewrite must not require Han (Latin script).
  const result = await translate({
    text: '¿Qué tal, tío?',
    from: 'eses',
    to: 'eses',
    register: 'formal',
    includeAlternatives: true,
  })
  assert.ok(result.text.trim(), 'rewrite returned empty text')
  assert.notEqual(result.text.trim().toLowerCase(), '¿qué tal, tío?')
  console.log('peninsularSpanishFormal.smoke: ok', result.text, result.meta)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
