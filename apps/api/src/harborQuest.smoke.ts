import assert from 'node:assert/strict'
import { compareLeaderboardScores, sanitizeHarborProgress } from './harborQuest.js'

const empty = sanitizeHarborProgress(null)
assert.deepEqual(empty.cleared, [])
assert.deepEqual(empty.stepCursor, {})
assert.equal(empty.correctCount, 0)
assert.equal(empty.coins, 40, 'null → starter coins')
assert.equal(empty.gold, 0)
assert.equal(empty.xp, 0)
assert.deepEqual(empty.missionClears, {})
assert.ok(empty.owned.includes('hat-straw'))
assert.ok(empty.owned.includes('boat-canoe'))
assert.ok(empty.owned.includes('lantern-paper-amber'))
assert.equal(empty.look.boat, 'boat-canoe')
assert.equal(empty.look.lantern, 'lantern-paper-amber')
assert.deepEqual(empty.banked, [])
assert.equal(empty.look.hat, 'hat-straw')
assert.equal(empty.lastSavedAt, 0)

const legacy = sanitizeHarborProgress({
  cleared: ['intro'],
  stepCursor: { 'lesson-1': 2 },
  correctCount: 5,
})
assert.equal(legacy.coins, 0, 'missing coins on existing progress → 0')
assert.ok(legacy.owned.includes('hat-straw'), 'starter owned backfilled')
assert.equal(legacy.look.top, 'top-harbor')
assert.equal(legacy.lastSavedAt, 0)
assert.equal(legacy.missionClears.intro, 1)
assert.equal(legacy.xp, 0)

const full = sanitizeHarborProgress({
  cleared: ['intro', 'intro', '', 3, 'lesson-1'],
  stepCursor: { 'lesson-1': 2.9, bad: 'x', 'lesson-2': -1, ok: 4 },
  correctCount: 12.7,
  coins: 55.2,
  gold: 55.8,
  xp: 120.4,
  missionClears: { intro: 2.2, 'lesson-1': 1 },
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
assert.equal(full.xp, 120)
assert.equal(full.missionClears.intro, 2)
assert.equal(full.missionClears['lesson-1'], 1)
assert.ok(full.owned.includes('hat-bamboo'))
assert.ok(full.banked.includes('hat-festival'))
assert.ok(!full.banked.includes('hat-straw'), 'starters cannot be banked')
assert.ok(!full.owned.includes('hat-festival'), 'banked gear not carried')
assert.ok(full.owned.includes('hand-fan'))
assert.ok(full.owned.includes('hat-straw'), 'starter gear kept')
assert.equal(full.look.hat, 'hat-festival')
assert.equal(full.look.hand, 'hand-oar')
assert.equal(full.lastSavedAt, 1_700_000_000_000)

const again = sanitizeHarborProgress(full)
assert.deepEqual(again, full)

assert.ok(compareLeaderboardScores({ xp: 50, gold: 1, correctCount: 1, clearedCount: 0 }, { xp: 10, gold: 99, correctCount: 99, clearedCount: 9 }) < 0)
assert.ok(compareLeaderboardScores({ xp: 10, gold: 20, correctCount: 1, clearedCount: 0 }, { xp: 10, gold: 10, correctCount: 99, clearedCount: 9 }) < 0)
assert.ok(compareLeaderboardScores({ xp: 10, gold: 10, correctCount: 5, clearedCount: 0 }, { xp: 10, gold: 10, correctCount: 2, clearedCount: 9 }) < 0)
assert.equal(compareLeaderboardScores({ xp: 1, gold: 1, correctCount: 1, clearedCount: 1 }, { xp: 1, gold: 1, correctCount: 1, clearedCount: 1 }), 0)

const beautyShow = sanitizeHarborProgress({
  beautyOwned: ['beauty-hair-twin', 'nope'],
  showoff: {
    owned: ['tag-jade', 'tag-lantern-fest', 'hack'],
    look: { nametag: 'tag-jade', bubble: 'bubble-plain', chair: 'chair-stool', pet: 'pet-none', emote: null },
    claimedEvents: ['event-lantern-fest', 'event-bogus'],
  },
})
assert.ok(beautyShow.beautyOwned?.includes('beauty-hair-twin'))
assert.ok(!beautyShow.beautyOwned?.includes('nope'))
assert.ok(beautyShow.showoff?.owned.includes('tag-jade'))
assert.ok(beautyShow.showoff?.owned.includes('tag-lantern-fest'))
assert.ok(!beautyShow.showoff?.owned.includes('hack'))
assert.equal(beautyShow.showoff?.look.nametag, 'tag-jade')
assert.ok(beautyShow.showoff?.claimedEvents.includes('event-lantern-fest'))
assert.ok(!beautyShow.showoff?.claimedEvents.includes('event-bogus'))

console.log('harborQuest.smoke: ok')
