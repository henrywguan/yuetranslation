import assert from 'node:assert/strict'
import {
  HARBOR_GOLD_TO_COINS,
  MATCH_DEFINITION_BANK,
  MATCH_DIFFICULTIES,
  MATCH_DIFFICULTY,
  MATCH_TOPICS,
  MATCH_TOPIC,
  buildMatchRound,
  matchBankFor,
} from './matchDefinitionBank.ts'

assert.ok(MATCH_DEFINITION_BANK.length >= 100)
assert.equal(MATCH_DIFFICULTY.easy.seconds, 15)
assert.equal(MATCH_DIFFICULTY.easy.goldPerHit, 10)
assert.equal(HARBOR_GOLD_TO_COINS, 1)

assert.deepEqual(MATCH_TOPICS, ['kids', 'animals', 'nature', 'food', 'harbor'])
assert.deepEqual(MATCH_DIFFICULTIES, ['easy', 'medium', 'hard'])
assert.ok(MATCH_DIFFICULTY.medium.seconds > MATCH_DIFFICULTY.easy.seconds)
assert.ok(MATCH_DIFFICULTY.hard.seconds > MATCH_DIFFICULTY.medium.seconds)
assert.ok(MATCH_DIFFICULTY.medium.goldPerHit > MATCH_DIFFICULTY.easy.goldPerHit)
assert.ok(MATCH_DIFFICULTY.hard.goldPerHit > MATCH_DIFFICULTY.medium.goldPerHit)

for (const topic of MATCH_TOPICS) {
  assert.ok(MATCH_TOPIC[topic].label.en, topic)
  for (const diff of MATCH_DIFFICULTIES) {
    const bank = matchBankFor(topic, diff)
    assert.ok(bank.length >= 8, `${topic}/${diff} bank size`)
    for (const w of bank) {
      assert.equal(w.topic, topic, w.id)
      assert.equal(w.difficulty, diff, w.id)
      assert.ok(w.han.trim().length > 0, w.id)
      assert.match(w.jp, /[a-z]+[1-6]/i, w.id)
      assert.ok(w.def.trim().length > 0, w.id)
    }
    const round = buildMatchRound(topic, diff)
    assert.equal(round.topic, topic)
    assert.equal(round.difficulty, diff)
    assert.equal(round.choices.length, 3)
    assert.equal(new Set(round.choices).size, 3)
    assert.equal(round.choices[round.correctIndex], round.word.def)
    assert.equal(round.seconds, MATCH_DIFFICULTY[diff].seconds)
    assert.equal(round.goldPerHit, MATCH_DIFFICULTY[diff].goldPerHit)
    const again = buildMatchRound(topic, diff, round.word.id)
    assert.notEqual(again.word.id, round.word.id)
  }
}

// Easy stays short within each topic; hard has sentence length
for (const topic of MATCH_TOPICS) {
  assert.ok(
    matchBankFor(topic, 'easy').every((w) => [...w.han].filter((c) => /\p{Script=Han}/u.test(c)).length <= 2),
    `${topic} easy stays short`,
  )
  assert.ok(
    matchBankFor(topic, 'hard').some((w) => /[？。！]/.test(w.han) || w.han.length >= 6),
    `${topic} hard has sentences`,
  )
}

console.log(
  'matchDefinition.smoke: ok',
  MATCH_DEFINITION_BANK.length,
  'entries',
  MATCH_TOPICS.map((t) =>
    `${t}:${MATCH_DIFFICULTIES.map((d) => matchBankFor(t, d).length).join('/')}`,
  ).join(' '),
)
