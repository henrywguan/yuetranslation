/**
 * Offline smoke for Details dictionary enrich (no OpenAI / Tenor).
 * Forces empty keys so model + GIF paths stay cold.
 */
import assert from 'node:assert/strict'

process.env.OPENAI_API_KEY = ''
process.env.TENOR_API_KEY = ''

const { enrichDictionaryEntry } = await import('./detailsEnrich.js')

const apple = await enrichDictionaryEntry({
  text: 'Apple',
  lang: 'en',
  contextText: '蘋果',
  contextLang: 'yue',
  wantMedia: true,
})

assert.equal(apple.lemma, 'Apple')
assert.equal(apple.engine, 'offline')
assert.ok(apple.senses.length >= 1, 'Apple should have offline senses')
assert.ok(
  apple.senses.some((s) => s.gloss.includes('蘋果') || s.gloss.includes('苹')),
  `expected 蘋果 gloss, got ${JSON.stringify(apple.senses)}`,
)
assert.equal(apple.media.length, 0, 'no Tenor without key')
assert.ok(apple.provenance.includes('lexicon') || apple.provenance.includes('paired-context'))

const yue = await enrichDictionaryEntry({
  text: '蘋果',
  lang: 'yue',
  contextText: 'Apple',
  contextLang: 'en',
})
assert.ok(yue.senses.length >= 1, '粵 gloss or paired English')
assert.ok(yue.senses.some((s) => /apple/i.test(s.gloss) || s.note === 'Paired translation'))

const emptyish = await enrichDictionaryEntry({
  text: 'xyzzy-not-a-word',
  lang: 'tl',
  contextText: 'walang kahulugan',
})
assert.equal(emptyish.engine, 'offline')
assert.ok(emptyish.senses.some((s) => s.gloss === 'walang kahulugan'))

console.log('detailsEnrich.smoke: ok', {
  appleSenses: apple.senses.map((s) => s.gloss),
  yueSenses: yue.senses.map((s) => s.gloss),
})
