/**
 * Offline smoke for Details dictionary enrich (no OpenAI / no paid media APIs).
 * Forces empty keys so the model path stays cold.
 * Tenor’s public API shut down 2026-06-30 — we use offline emoji instead.
 *
 * Paired CONTEXT must never become a dictionary sense.
 * Senses/examples are written in glossLang (Account Hub primary), not the lemma language.
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
assert.ok(
  !apple.senses.some((s) => s.gloss.includes('蘋果') || s.gloss.includes('苹')),
  `paired CONTEXT must not become an English sense, got ${JSON.stringify(apple.senses)}`,
)
assert.ok(
  apple.media.some((m) => m.type === 'emoji' && m.emoji === '🍎'),
  `expected offline apple emoji media, got ${JSON.stringify(apple.media)}`,
)
assert.ok(apple.provenance.includes('emoji'))
assert.ok(!apple.provenance.includes('paired-context'))

const sichuanCtx = await enrichDictionaryEntry({
  text: 'Hello',
  lang: 'en',
  contextText: '你好',
  contextLang: 'sichuan',
  wantMedia: false,
})
assert.ok(
  !sichuanCtx.senses.some((s) => /你好|哦豁|你来/.test(s.gloss)),
  `English Details must not absorb Sichuanese CONTEXT, got ${JSON.stringify(sichuanCtx.senses)}`,
)

const yue = await enrichDictionaryEntry({
  text: '蘋果',
  lang: 'yue',
  contextText: 'Apple',
  contextLang: 'en',
  wantMedia: false,
})
assert.ok(
  !yue.senses.some((s) => /^apple$/i.test(s.gloss.trim()) || s.note === 'Paired translation'),
  `粵 panel must not seed paired English as a sense, got ${JSON.stringify(yue.senses)}`,
)
assert.ok(yue.media.some((m) => m.type === 'emoji' && m.emoji === '🍎'))
assert.equal(yue.pronunciation, undefined, '粵 Details must not ship AI IPA/pinyin pronunciation')

const emptyish = await enrichDictionaryEntry({
  text: 'xyzzy-not-a-word',
  lang: 'tl',
  contextText: 'walang kahulugan',
  wantMedia: false,
})
assert.equal(emptyish.engine, 'offline')
assert.ok(
  !emptyish.senses.some((s) => s.gloss === 'walang kahulugan'),
  'Tagalog CONTEXT must not become a sense',
)
assert.equal(emptyish.media.length, 0, 'no emoji for unknown lemma')


const esForYue = await enrichDictionaryEntry({
  text: 'Hola',
  lang: 'es',
  contextText: '你好',
  contextLang: 'yue',
  glossLang: 'yue',
  wantMedia: false,
})
assert.equal(esForYue.glossLang, 'yue')
assert.ok(
  !esForYue.senses.some((s) => s.gloss === '你好'),
  `CONTEXT must not become a Yue sense, got ${JSON.stringify(esForYue.senses)}`,
)

console.log('detailsEnrich.smoke: ok', {
  appleSenses: apple.senses.map((s) => s.gloss),
  appleMedia: apple.media.map((m) => m.type + (m.emoji || '')),
  yueSenses: yue.senses.map((s) => s.gloss),
})
