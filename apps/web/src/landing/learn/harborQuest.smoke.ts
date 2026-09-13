import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  HARBOR_LEVELS,
  levelById,
  nextLevelId,
  openCantoneseLessonUrl,
} from '../../landing/learn/curriculum'
import {
  HARBOR_FANFARE_DURATION_BOUNDS_MS,
  HARBOR_FANFARE_DURATION_MS,
  HARBOR_FANFARE_NOTES,
  harborFanfareDurationMs,
} from '../../landing/learn/harborFanfare'
import { HARBOR_MISS_SRC } from '../../landing/learn/harborSfx'
import { biomeForChunk, HARBOR_SCENIC_TREES } from '../../landing/learn/harborWorld'
import { isLevelUnlocked } from '../../landing/learn/progressMerge'
import { enrichJyutpingWithChao, rubyJpSyllable } from '../../lib/jyutping'

/** Offline: Harbor Quest curriculum integrity (no paid APIs). */
function main() {
  assert.ok(HARBOR_LEVELS.length >= 9, 'expected intro + 7 lessons + chart')
  assert.equal(HARBOR_LEVELS[0]!.id, 'introduction')
  assert.equal(HARBOR_LEVELS.at(-1)!.id, 'jyutping-chart')

  const ids = HARBOR_LEVELS.map((l) => l.id)
  assert.equal(new Set(ids).size, ids.length, 'unique level ids')

  for (const level of HARBOR_LEVELS) {
    assert.ok(level.steps.length >= 3, `${level.id} needs playable steps`)
    assert.ok(level.ocLesson, `${level.id} needs Open Cantonese lesson slug`)
    assert.match(openCantoneseLessonUrl(level), /opencantonese\.org/)
    const stepIds = new Set<string>()
    for (const step of level.steps) {
      assert.ok(!stepIds.has(step.id), `duplicate step ${step.id}`)
      stepIds.add(step.id)
      if (step.kind === 'pick') {
        assert.ok(step.choices.some((c) => c.id === step.correctId), step.id)
      }
      if (step.kind === 'build') {
        for (const slot of step.slots) {
          assert.ok(slot.options.includes(step.correct[slot.key]!), step.id)
        }
      }
    }
  }

  assert.equal(nextLevelId('introduction'), 'lesson-1')
  assert.equal(nextLevelId('jyutping-chart'), null)
  assert.ok(levelById('lesson-1'))

  const empty = { cleared: [] as string[], stepCursor: {}, correctCount: 0 }
  assert.equal(isLevelUnlocked('introduction', ids, empty), true)
  assert.equal(isLevelUnlocked('lesson-1', ids, empty), false)
  assert.equal(
    isLevelUnlocked('lesson-1', ids, { ...empty, cleared: ['introduction'] }),
    true,
  )

  assert.equal(rubyJpSyllable('si1'), 'si1˥')
  assert.equal(enrichJyutpingWithChao('In Jyutping si1, what does the 1 mark?'), 'In Jyutping si1˥, what does the 1 mark?')
  assert.equal(enrichJyutpingWithChao('nei5 hou2'), 'nei5˩˧ hou2˧˥')
  assert.equal(enrichJyutpingWithChao('si1˥'), 'si1˥', 'do not double-append Chao')

  // Continuous river biomes — deterministic cycle for the voyage chunks
  const biomes = Array.from({ length: 14 }, (_, i) => biomeForChunk(i))
  assert.equal(biomeForChunk(0), 'pier')
  assert.equal(biomeForChunk(1), 'village')
  assert.equal(biomeForChunk(7), biomeForChunk(0), 'biome cycle repeats')
  assert.ok(new Set(biomes).size >= 5, 'voyage should visit multiple biomes')
  assert.equal(biomeForChunk(-1), biomeForChunk(6), 'negative chunk wraps')

  // Correct-answer trumpet jingle stays in the 3–6s window
  assert.ok(HARBOR_FANFARE_NOTES.length >= 6, 'fanfare needs a real melody')
  assert.ok(
    HARBOR_FANFARE_DURATION_MS >= HARBOR_FANFARE_DURATION_BOUNDS_MS.min &&
      HARBOR_FANFARE_DURATION_MS <= HARBOR_FANFARE_DURATION_BOUNDS_MS.max,
    'fanfare duration must be 3–6s',
  )
  const fanfareMs = harborFanfareDurationMs()
  assert.ok(
    fanfareMs >= HARBOR_FANFARE_DURATION_BOUNDS_MS.min &&
      fanfareMs <= HARBOR_FANFARE_DURATION_BOUNDS_MS.max,
    `scheduled fanfare ${fanfareMs}ms out of 3–6s`,
  )

  // Original miss SFX assets (procedural — not ripped game samples)
  const publicRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../public')
  for (const [style, url] of Object.entries(HARBOR_MISS_SRC)) {
    const rel = url.replace(/^\//, '')
    const abs = join(publicRoot, rel)
    assert.ok(statSync(abs).size > 1000, `${style} wav too small`)
    const hdr = readFileSync(abs).subarray(0, 4).toString('ascii')
    assert.equal(hdr, 'RIFF', `${style} must be a WAV`)
  }

  assert.ok(HARBOR_SCENIC_TREES.includes('cherry'), 'cherry blossom trees')
  assert.ok(HARBOR_SCENIC_TREES.includes('ginkgo'), 'ginkgo trees')
  assert.ok(HARBOR_SCENIC_TREES.includes('poplar'), 'poplar trees')
  assert.equal(HARBOR_SCENIC_TREES.length, 5, 'scenic tree kit')

  console.log('harborQuest.smoke: ok', HARBOR_LEVELS.length, 'levels')
}

main()
