import assert from 'node:assert/strict'
import {
  cardFromTurn,
  formatPhrasebookExport,
  isStarred,
  phraseCardKey,
  removePhraseCard,
  sanitizePhraseCards,
  upsertPhraseCard,
} from './phrasebook.ts'

const turn = {
  id: 't1',
  from: 'en' as const,
  to: 'yue' as const,
  source: 'hello',
  translation: '你好',
  at: 1,
}
const a = cardFromTurn(turn)
const list = upsertPhraseCard([], a)
assert.equal(list.length, 1)
assert.equal(isStarred(list, 'hello', '你好', 'en', 'yue'), true)
assert.equal(phraseCardKey('a', 'b', 'en', 'yue'), 'en|yue|a|b')
const again = upsertPhraseCard(list, { ...a, at: 2 })
assert.equal(again.length, 1)
assert.equal(removePhraseCard(again, a.id).length, 0)
assert.ok(formatPhrasebookExport(list).includes('hello'))
assert.equal(sanitizePhraseCards([{ id: 'x' }]).length, 0)

console.log('phrasebook.smoke: ok')
