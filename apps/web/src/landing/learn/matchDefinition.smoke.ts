import assert from 'node:assert/strict'
import {
  HARBOR_GOLD_TO_COINS,
  MATCH_DEFINITION_BANK,
  MATCH_DIFFICULTIES,
  MATCH_DIFFICULTY,
  MATCH_GOLD_PER_HIT,
  MATCH_ROUND_SECONDS,
  buildMatchRound,
  matchBankFor,
} from './matchDefinitionBank.ts'

assert.ok(MATCH_DEFINITION_BANK.length >= 40)
assert.equal(MATCH_ROUND_SECONDS, MATCH_DIFFICULTY.easy.seconds)
assert.equal(MATCH_GOLD_PER_HIT, MATCH_DIFFICULTY.easy.goldPerHit)
assert.equal(HARBOR_GOLD_TO_COINS, 1)

assert.deepEqual(MATCH_DIFFICULTIES, ['easy', 'medium', 'hard'])
assert.ok(MATCH_DIFFICULTY.medium.seconds > MATCH_DIFFICULTY.easy.seconds)
assert.ok(MATCH_DIFFICULTY.hard.seconds > MATCH_DIFFICULTY.medium.seconds)
assert.ok(MATCH_DIFFICULTY.medium.goldPerHit > MATCH_DIFFICULTY.easy.goldPerHit)
assert.ok(MATCH_DIFFICULTY.hard.goldPerHit > MATCH_DIFFICULTY.medium.goldPerHit)

for (const diff of MATCH_DIFFICULTIES) {
  const bank = matchBankFor(diff)
  assert.ok(bank.length >= 10, `${diff} bank size`)
  for (const w of bank) {
    assert.equal(w.difficulty, diff, w.id)
    assert.ok(w.han.trim().length > 0, w.id)
    assert.match(w.jp, /[a-z]+[1-6]/i, w.id)
    assert.ok(w.def.trim().length > 0, w.id)
  }
  const round = buildMatchRound(diff)
  assert.equal(round.difficulty, diff)
  assert.equal(round.choices.length, 3)
  assert.equal(new Set(round.choices).size, 3)
  assert.equal(round.choices[round.correctIndex], round.word.def)
  assert.equal(round.seconds, MATCH_DIFFICULTY[diff].seconds)
  assert.equal(round.goldPerHit, MATCH_DIFFICULTY[diff].goldPerHit)
  const again = buildMatchRound(diff, round.word.id)
  assert.notEqual(again.word.id, round.word.id)
}

// Easy stays short; hard has sentence-length han
assert.ok(matchBankFor('easy').every((w) => w.han.replace(/\s/g, '').length <= 2))
assert.ok(matchBankFor('medium').every((w) => w.han.length >= 2))
assert.ok(matchBankFor('hard').some((w) => /[？。！]/.test(w.han) || w.han.length >= 6))

console.log(
  'matchDefinition.smoke: ok',
  MATCH_DEFINITION_BANK.length,
  'entries',
  MATCH_DIFFICULTIES.map((d) => `${d}:${matchBankFor(d).length}`).join(' '),
)
