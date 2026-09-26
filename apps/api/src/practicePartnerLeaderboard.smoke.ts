/**
 * Offline Practice Partner leaderboard rules (no Supabase).
 */
import assert from 'node:assert/strict'
import {
  comparePracticePartnerBoardScores,
  mergePracticePartnerBoardScore,
  practicePartnerDisplayName,
  sanitizePracticePartnerBoardScore,
} from './practicePartnerLeaderboard.js'

const clean = sanitizePracticePartnerBoardScore({
  xp: 40.9,
  bestStreak: 3,
  totalPasses: 4,
})
assert.deepEqual(clean, { xp: 40, bestStreak: 3, totalPasses: 4 })

const junk = sanitizePracticePartnerBoardScore({
  xp: -5,
  bestStreak: 'nope',
  totalPasses: 9_999_999,
})
assert.equal(junk.xp, 0)
assert.equal(junk.bestStreak, 0)
assert.equal(junk.totalPasses, 1_000_000)

const merged = mergePracticePartnerBoardScore(
  { xp: 100, bestStreak: 8, totalPasses: 20 },
  { xp: 40, bestStreak: 9, totalPasses: 12 },
)
assert.deepEqual(merged, { xp: 100, bestStreak: 9, totalPasses: 20 })
assert.deepEqual(mergePracticePartnerBoardScore(null, clean), clean)

assert.ok(
  comparePracticePartnerBoardScores(
    { xp: 50, bestStreak: 1, totalPasses: 1 },
    { xp: 10, bestStreak: 99, totalPasses: 99 },
  ) < 0,
)
assert.ok(
  comparePracticePartnerBoardScores(
    { xp: 10, bestStreak: 4, totalPasses: 1 },
    { xp: 10, bestStreak: 2, totalPasses: 99 },
  ) < 0,
)
assert.equal(
  comparePracticePartnerBoardScores(
    { xp: 1, bestStreak: 1, totalPasses: 1 },
    { xp: 1, bestStreak: 1, totalPasses: 1 },
  ),
  0,
)

assert.equal(practicePartnerDisplayName('  Hiu Maan  ', 'abc'), 'Hiu Maan')
assert.equal(practicePartnerDisplayName('', 'abcd-1234'), 'Partner-abcd')
assert.equal(practicePartnerDisplayName('bad\nname', 'abcd'), 'badname')

console.log('practicePartnerLeaderboard.smoke: ok')
