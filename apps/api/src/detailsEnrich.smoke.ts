/**
 * Offline smoke for Details dictionary enrich (no OpenAI / no paid media APIs).
 * Forces empty keys so the model path stays cold.
 * Tenor’s public API shut down 2026-06-30 — we use offline emoji instead.
 */
import assert from 'node:assert/strict'

process.env.OPENAI_API_KEY = ''

const { enrichDictionaryEntry } = await import('./detailsEnrich.js')
const { emojiMnemonic } = await import('./detailsMedia.js')

const appleEmoji = emojiMnemonic('Apple', '蘋果')
assert.ok(appleEmoji?.emoji === '🍎', `expected apple emoji, got ${JSON.stringify(appleEmoji)}`)

const apple = await enrichDictionaryEntry({
  text: 'Apple',
  lang: 'en',
  contextText: '蘋果',
  contextLang: 'yue',
  // Skip remote Wikipedia in smoke (network); emoji still attaches offline.
  wantMedia: false,
})

assert.equal(apple.lemma, 'Apple')
assert.equal(apple.engine, 'offline')
assert.ok(apple.senses.length >= 1, 'Apple should have offline senses')
assert.ok(
  apple.senses.some((s) => s.gloss.includes('蘋果') || s.gloss.includes('苹')),
  `expected 蘋果 gloss, got ${JSON.stringify(apple.senses)}`,
)
assert.ok(
  apple.media.some((m) => m.type === 'emoji' && m.emoji === '🍎'),
  `expected offline apple emoji media, got ${JSON.stringify(apple.media)}`,
)
assert.ok(apple.provenance.includes('emoji'))
assert.ok(apple.provenance.includes('lexicon') || apple.provenance.includes('paired-context'))

const yue = await enrichDictionaryEntry({
  text: '蘋果',
  lang: 'yue',
  contextText: 'Apple',
  contextLang: 'en',
  wantMedia: false,
})
assert.ok(yue.senses.length >= 1, '粵 gloss or paired English')
assert.ok(
  yue.senses.some(
    (s) => /apple/i.test(s.gloss) || s.note === 'Paired translation',
  ),
)
assert.ok(yue.media.some((m) => m.type === 'emoji' && m.emoji === '🍎'))

const emptyish = await enrichDictionaryEntry({
  text: 'xyzzy-not-a-word',
  lang: 'tl',
  contextText: 'walang kahulugan',
  wantMedia: false,
})
assert.equal(emptyish.engine, 'offline')
assert.ok(emptyish.senses.some((s) => s.gloss === 'walang kahulugan'))
assert.equal(emptyish.media.length, 0, 'no emoji for unknown lemma')

console.log('detailsEnrich.smoke: ok', {
  appleSenses: apple.senses.map((s) => s.gloss),
  appleMedia: apple.media.map((m) => m.type + (m.emoji || '')),
  yueSenses: yue.senses.map((s) => s.gloss),
})
