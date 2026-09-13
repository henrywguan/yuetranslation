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
import {
  biomeForChunk,
  clampOrbitPitch,
  dockPoseForProgress,
  HARBOR_DOCK_SPACING,
  HARBOR_NPC_ROLES,
  HARBOR_SCENIC_TREES,
  HARBOR_VILLAGE_HOMES,
  HARBOR_WULINGYUAN,
  HARBOR_XIANGYUN,
  orbitCameraOffset,
  ORBIT_PITCH_MAX,
  ORBIT_PITCH_MIN,
} from '../../landing/learn/harborWorld'
import {
  HARBOR_CRAFT_PALETTE,
  HARBOR_FACETS,
  hqBox,
  hqCanopy,
  hqRock,
  hqWindow,
} from '../../landing/learn/harborCraft'
import {
  buildHarborProtagonist,
  countProtagonistMeshes,
  HARBOR_PROTAGONIST_ID,
  HARBOR_PROTAGONIST_PALETTE,
  HARBOR_PROTAGONIST_SOCKETS,
  listProtagonistSockets,
} from '../../landing/learn/harborProtagonist'
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

  const biomes = Array.from({ length: 14 }, (_, i) => biomeForChunk(i))
  assert.equal(biomeForChunk(0), 'pier')
  assert.equal(biomeForChunk(1), 'village')
  assert.equal(biomeForChunk(7), biomeForChunk(0), 'biome cycle repeats')
  assert.ok(new Set(biomes).size >= 5, 'voyage should visit multiple biomes')
  assert.equal(biomeForChunk(-1), biomeForChunk(6), 'negative chunk wraps')

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
  assert.ok(HARBOR_VILLAGE_HOMES.includes('jiangnan'), 'jiangnan homes')
  assert.ok(HARBOR_VILLAGE_HOMES.includes('stilt'), 'riverside stilt shops')
  assert.equal(HARBOR_VILLAGE_HOMES.length, 4, 'village home kit')

  assert.equal(clampOrbitPitch(ORBIT_PITCH_MIN - 1), ORBIT_PITCH_MIN)
  assert.equal(clampOrbitPitch(ORBIT_PITCH_MAX + 1), ORBIT_PITCH_MAX)
  const behind = orbitCameraOffset(0, Math.PI / 6)
  assert.ok(behind.z < 0, 'yaw 0 sits behind the canoe')
  const side = orbitCameraOffset(Math.PI / 2, Math.PI / 6)
  assert.ok(Math.abs(side.x) > Math.abs(side.z), 'yaw π/2 swings to the side')
  const around = orbitCameraOffset(Math.PI * 2, Math.PI / 6)
  assert.ok(Math.abs(around.x - behind.x) < 1e-9 && Math.abs(around.z - behind.z) < 1e-9, 'yaw wraps 360°')

  assert.ok(HARBOR_NPC_ROLES.includes('villager'), 'villager NPCs')
  assert.ok(HARBOR_NPC_ROLES.includes('scholar'), 'scholar NPCs')
  assert.ok(HARBOR_NPC_ROLES.includes('fisherman'), 'fisherman NPCs')
  assert.ok(HARBOR_NPC_ROLES.includes('merchant'), 'merchant NPCs')
  assert.equal(HARBOR_NPC_ROLES.length, 6, 'Chinese clothing role kit')

  // Craft bible kit — locked palette + faceted helpers
  assert.equal(HARBOR_FACETS, 6, 'era cylinders stay 6-gon')
  assert.ok(HARBOR_CRAFT_PALETTE.jade === 0x3dcfb6, 'brand jade in craft palette')
  assert.ok(HARBOR_CRAFT_PALETTE.woodMid && HARBOR_CRAFT_PALETTE.roofTile, 'wood/roof swatches')
  assert.ok(hqBox(1, 1, 1, HARBOR_CRAFT_PALETTE.stone).isMesh, 'hqBox builds meshes')
  assert.ok(hqCanopy(0.5, HARBOR_CRAFT_PALETTE.leafMid).isMesh, 'hqCanopy faceted')
  assert.ok(hqRock(() => 0.5).isMesh, 'hqRock boxy')
  assert.ok(hqWindow(0.3, 0.3, HARBOR_CRAFT_PALETTE.trimGold, 0x102030, 0, 0, 0).isGroup, 'extruded window')

  // Original River Scout protagonist (not Jagex Bob / cache mesh)
  assert.equal(HARBOR_PROTAGONIST_ID, 'river-scout')
  assert.ok(HARBOR_PROTAGONIST_PALETTE.jade === 0x3dcfb6, 'jade sash brand color')
  assert.equal(HARBOR_PROTAGONIST_SOCKETS.length, 5, 'kitbash sockets')
  const scout = buildHarborProtagonist({ pose: 'seated' })
  assert.equal(scout.userData.protagonistId, HARBOR_PROTAGONIST_ID)
  assert.equal(scout.userData.originalHarborAsset, true)
  assert.equal(scout.userData.player, true)
  const meshes = countProtagonistMeshes(scout)
  assert.ok(meshes >= 18 && meshes <= 40, `mesh budget smell-test got ${meshes}`)
  const sockets = listProtagonistSockets(scout)
  for (const name of HARBOR_PROTAGONIST_SOCKETS) {
    assert.ok(sockets.includes(name), `missing socket ${name}`)
  }
  const standing = buildHarborProtagonist({ pose: 'standing' })
  assert.ok(countProtagonistMeshes(standing) >= meshes, 'standing has at least seated complexity')

  const dock0 = dockPoseForProgress(0)
  const dockMid = dockPoseForProgress(0.5)
  assert.ok(dockMid.z > dock0.z, 'later progress docks further downriver')
  assert.notEqual(dock0.side, dockPoseForProgress(HARBOR_DOCK_SPACING / 240).side, 'adjacent slots alternate banks')
  assert.equal(HARBOR_WULINGYUAN, true, 'Wulingyuan mountain backdrop')
  assert.equal(HARBOR_XIANGYUN, true, 'xiangyun auspicious sky clouds')

  const panelSrc = readFileSync(new URL('./QuestPanel.tsx', import.meta.url), 'utf8')
  assert.ok(panelSrc.includes('is-exploring'), 'quest panel starts in explore mode')
  assert.ok(panelSrc.includes('hq-dialog'), 'OSRS-style NPC dialogue box')
  assert.ok(panelSrc.includes('Talk to'), 'Talk CTA to open dialogue')
  assert.ok(panelSrc.includes('Explore world'), 'Explore world dismisses dialogue')

  // Chao tone letters must load via Noto Sans subset (latin cut omits U+02E5–U+02E9)
  const indexHtml = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../index.html'), 'utf8')
  assert.match(indexHtml, /text=%CB%A5%CB%A7%CB%A8%CB%A9/, 'Noto Sans Chao subset ˥˧˨˩')
  assert.doesNotMatch(indexHtml, /text=%CB%89%CB%87%CB%88%CB%A9/, 'old wrong Chao subset removed')
  const learnCss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), './learn.css'), 'utf8')
  assert.match(learnCss, /\.hq-play\.is-exploring[\s\S]*?\.hq-stage-caption[\s\S]*?display:\s*none/, 'explore hides stage caption')

  console.log('harborQuest.smoke: ok', HARBOR_LEVELS.length, 'levels')
}

main()
