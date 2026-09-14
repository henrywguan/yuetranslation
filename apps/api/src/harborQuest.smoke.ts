import assert from 'node:assert/strict'
import { compareLeaderboardScores, sanitizeHarborProgress } from './harborQuest.js'

const empty = sanitizeHarborProgress(null)
assert.deepEqual(empty.cleared, [])
assert.deepEqual(empty.stepCursor, {})
assert.equal(empty.correctCount, 0)
assert.equal(empty.coins, 40, 'null → starter coins')
assert.equal(empty.gold, 0)
assert.ok(empty.owned.includes('hat-straw'))
assert.ok(empty.owned.includes('boat-canoe'))
assert.ok(empty.owned.includes('lantern-paper-amber'))
assert.equal(empty.look.boat, 'boat-canoe')
assert.equal(empty.look.lantern, 'lantern-paper-amber')
assert.deepEqual(empty.banked, [])
assert.equal(empty.look.hat, 'hat-straw')
assert.equal(empty.lastSavedAt, 0)

// Legacy cloud blob without gear fields must NOT invent a free 40-coin refill
const legacy = sanitizeHarborProgress({
  cleared: ['intro'],
  stepCursor: { 'lesson-1': 2 },
  correctCount: 5,
})
assert.equal(legacy.coins, 0, 'missing coins on existing progress → 0')
assert.ok(legacy.owned.includes('hat-straw'), 'starter owned backfilled')
assert.equal(legacy.look.top, 'top-harbor')
assert.equal(legacy.lastSavedAt, 0)

const full = sanitizeHarborProgress({
  cleared: ['intro', 'intro', '', 3, 'lesson-1'],
  stepCursor: { 'lesson-1': 2.9, bad: 'x', 'lesson-2': -1, ok: 4 },
  correctCount: 12.7,
  coins: 55.2,
  gold: 55.8,
  owned: ['hat-bamboo', 'nope', 'hand-fan'],
  banked: ['hat-festival', 'hat-straw', 'nope'],
  look: {
    hat: 'hat-festival',
    top: 'top-jade',
    bottom: 'bottom-ink',
    shoes: 'shoes-storm',
    hand: 'hand-oar',
    junk: 1,
  },
  lastSavedAt: 1_700_000_000_000,
})
assert.deepEqual(full.cleared, ['intro', 'lesson-1'])
assert.deepEqual(full.stepCursor, { 'lesson-1': 2, ok: 4 })
assert.equal(full.correctCount, 12)
assert.equal(full.coins, 55)
assert.equal(full.gold, 55)
assert.ok(full.owned.includes('hat-bamboo'))
assert.ok(full.banked.includes('hat-festival'))
assert.ok(!full.banked.includes('hat-straw'), 'starters cannot be banked')
assert.ok(!full.owned.includes('hat-festival'), 'banked gear not carried')
assert.ok(full.owned.includes('hand-fan'))
assert.ok(full.owned.includes('hat-straw'), 'starter gear kept')
assert.equal(full.look.hat, 'hat-festival')
assert.equal(full.look.hand, 'hand-oar')
assert.equal(full.lastSavedAt, 1_700_000_000_000)

// Round-trip: sanitized blob is idempotent (what Supabase stores is what we re-read)
const again = sanitizeHarborProgress(full)
assert.deepEqual(again, full)

assert.ok(compareLeaderboardScores({ gold: 20, correctCount: 1, clearedCount: 0 }, { gold: 10, correctCount: 99, clearedCount: 9 }) < 0)
assert.ok(compareLeaderboardScores({ gold: 10, correctCount: 5, clearedCount: 0 }, { gold: 10, correctCount: 2, clearedCount: 9 }) < 0)
assert.equal(compareLeaderboardScores({ gold: 1, correctCount: 1, clearedCount: 1 }, { gold: 1, correctCount: 1, clearedCount: 1 }), 0)

console.log('harborQuest.smoke: ok')
