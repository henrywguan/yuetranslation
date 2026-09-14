import assert from 'node:assert/strict'
import {
  MATCH_DEFINITION_BANK,
  MATCH_GOLD_PER_HIT,
  MATCH_ROUND_SECONDS,
  buildMatchRound,
} from './matchDefinitionBank.ts'

assert.ok(MATCH_DEFINITION_BANK.length >= 12)
assert.equal(MATCH_ROUND_SECONDS, 15)
assert.equal(MATCH_GOLD_PER_HIT, 10)

for (const w of MATCH_DEFINITION_BANK) {
  assert.ok(w.han.trim().length > 0, w.id)
  assert.match(w.jp, /[a-z]+[1-6]/i, w.id)
  assert.ok(w.def.trim().length > 0, w.id)
}

const round = buildMatchRound()
assert.equal(round.choices.length, 3)
assert.equal(new Set(round.choices).size, 3)
assert.equal(round.choices[round.correctIndex], round.word.def)

const again = buildMatchRound(round.word.id)
assert.notEqual(again.word.id, round.word.id)

console.log('matchDefinition.smoke: ok', MATCH_DEFINITION_BANK.length, 'words')
