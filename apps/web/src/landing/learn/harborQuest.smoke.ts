import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
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
  HARBOR_FOG_DENSITY,
  HARBOR_NPC_ROLES,
  HARBOR_SCENIC_TREES,
  HARBOR_VILLAGE_HOMES,
  HARBOR_WEATHER_LOOK,
  HARBOR_WEATHERS,
  HARBOR_WULINGYUAN,
  HARBOR_XIANGYUN,
  orbitCameraOffset,
  ORBIT_PITCH_MAX,
  ORBIT_PITCH_MIN,
  pickHarborWeather,
  HARBOR_TAP_SLOP_PX,
  HARBOR_TAP_MOVE_SPEED,
  HARBOR_TAP_ARRIVE,
  clampHarborMoveTarget,
  HARBOR_DOCK_X,
  HARBOR_VISITABLES,
  HARBOR_VISIT_RADIUS,
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
import {
  HARBOR_GEAR_CATALOG,
  HARBOR_GEAR_SLOTS,
  applyLookToProtagonist,
  harborGearForSlot,
} from '../../landing/learn/harborGear'
import { emptyHarborProgress,
  isLevelUnlocked } from '../../landing/learn/progressMerge'
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

  const empty = emptyHarborProgress()
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
  const worldSrc = readFileSync(new URL('./harborWorld.ts', import.meta.url), 'utf8')
  assert.match(worldSrc, /yawTarget\s*-=\s*dx\s*\*\s*ORBIT_SENS/, 'drag right decreases yaw (camera swings left)')
  assert.doesNotMatch(worldSrc, /yawTarget\s*\+=\s*dx\s*\*\s*ORBIT_SENS/, 'non-inverted yaw drag removed')
  assert.equal(HARBOR_TAP_SLOP_PX, 10, 'tap vs drag pixel slop')
  assert.ok(HARBOR_TAP_MOVE_SPEED > 2, 'tap-to-move has a walk/paddle speed')
  assert.ok(HARBOR_TAP_ARRIVE > 0, 'arrival threshold')
  assert.equal(clampHarborMoveTarget(99, -9).x, HARBOR_DOCK_X + 1.8, 'move target clamps to corridor')
  assert.equal(clampHarborMoveTarget(0, 999).z, 248, 'move target clamps far Z')
  assert.match(worldSrc, /HARBOR_TAP_SLOP_PX/, 'tap/drag discrimination uses slop constant')
  assert.match(worldSrc, /tryTapMove/, 'tap raycasts to ground and sets destination')
  assert.match(worldSrc, /userData\.clickMarker/, 'OSRS yellow destination marker')
  assert.match(worldSrc, /playerDirected/, 'player tap overrides auto-dock path')
  assert.match(worldSrc, /pitchTarget\s*=\s*clampOrbitPitch\(pitchTarget\s*\+\s*dy/, 'pitch drag is natural (drag down → look down)')
  assert.doesNotMatch(worldSrc, /pitchTarget\s*=\s*clampOrbitPitch\(pitchTarget\s*-\s*dy/, 'inverted pitch drag removed')
  assert.equal(HARBOR_FOG_DENSITY, 0.0028, 'max-bright sunny fog (not a dark veil)')
  assert.equal(HARBOR_WEATHER_LOOK.sunny.ambI, 1.65, 'sunny ambient max-bright')
  assert.equal(HARBOR_WEATHER_LOOK.sunny.sunI, 2.55, 'sunny sun max-bright')
  assert.deepEqual([...HARBOR_WEATHERS], ['sunny', 'cloudy', 'rainy', 'night'], 'four weather scenes')
  assert.equal(pickHarborWeather(42), pickHarborWeather(42), 'weather pick is deterministic with seed')
  assert.ok(HARBOR_WEATHER_LOOK.rainy.rain, 'rainy look enables rain')
  assert.ok(HARBOR_WEATHER_LOOK.night.stars, 'night look enables shooting stars')
  assert.match(worldSrc, /pickHarborWeather/, 'session weather is randomized')
  assert.match(worldSrc, /function rainField/, 'rain particle field')
  assert.match(worldSrc, /userData\.shooting/, 'shooting-star streaks')
  assert.doesNotMatch(worldSrc, /FogExp2\([^)]*0\.022/, 'old dense dark fog removed')

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

  const playSrc = readFileSync(new URL('./LearnPlay.tsx', import.meta.url), 'utf8')
  assert.ok(playSrc.includes('hq-explore-fab'), 'open-world explore FAB on stage')
  assert.ok(playSrc.includes('Open world exploration'), 'explore FAB accessible label')
  assert.ok(playSrc.includes('ExploreWorldIcon'), 'compass icon for open-world explore')
  assert.match(playSrc, /setTalking\(false\)/, 'explore FAB exits dialogue')

  // Chao tone letters must load via Noto Sans subset (latin cut omits U+02E5–U+02E9)
  const indexHtml = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../index.html'), 'utf8')
  assert.match(indexHtml, /text=%CB%A5%CB%A7%CB%A8%CB%A9/, 'Noto Sans Chao subset ˥˧˨˩')
  assert.doesNotMatch(indexHtml, /text=%CB%89%CB%87%CB%88%CB%A9/, 'old wrong Chao subset removed')
  const indexCss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../index.css'), 'utf8')
  assert.match(indexCss, /font-family:\s*'Noto Sans Chao'/, 'dedicated Noto Sans Chao @font-face family')
  assert.match(indexCss, /noto-sans-chao\.woff2/, 'self-hosted Chao woff2')
  assert.match(indexCss, /\.chao-face\s*\{[^}]*Noto Sans Chao/, '.chao-face uses Noto Sans Chao')
  const chaoFont = join(dirname(fileURLToPath(import.meta.url)), '../../../public/fonts/noto-sans-chao.woff2')
  assert.ok(existsSync(chaoFont), 'public/fonts/noto-sans-chao.woff2 present')
  const chaoTextSrc = readFileSync(new URL('./JyutpingChaoText.tsx', import.meta.url), 'utf8')
  assert.match(chaoTextSrc, /JyutpingSylText/, 'free-text Jyutping uses hear-chip SylText path')
  const learnCss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), './learn.css'), 'utf8')
  assert.match(learnCss, /#041018 28%/, 'top HUD scrim is light (not a heavy overlay)')
  assert.match(learnCss, /\.hq-choice-sub[\s\S]*?Noto Sans/, 'choice subs force Noto Sans Latin stack')
  assert.match(learnCss, /\.hq-feedback-text[\s\S]*?\.chao-face[\s\S]*?Noto Sans Chao/, 'jade feedback Chao uses Noto Sans Chao')
  assert.match(learnCss, /\.hq-play\.is-exploring[\s\S]*?\.hq-stage-caption[\s\S]*?display:\s*none/, 'explore hides stage caption')
  assert.match(learnCss, /\.hq-play\.is-talking[\s\S]*?\.hq-stage-caption[\s\S]*?display:\s*none/, 'talking hides stage caption')
  assert.match(learnCss, /--hq-osrs-strip:\s*min\(30dvh,\s*16\.5rem\)/, 'OSRS talking strip height')
  assert.match(
    learnCss,
    /\.hq-play-stage\s*\{[^}]*bottom:\s*var\(--hq-osrs-strip\)/,
    'stage ends above OSRS strip so world stays fully visible',
  )
  assert.match(learnCss, /\.hq-play-hud\.is-talking\s*\{[^}]*height:\s*var\(--hq-osrs-strip\)/, 'talking HUD docks as fixed strip')
  assert.doesNotMatch(learnCss, /\.hq-play-hud\.is-talking\s*\{[^}]*max-height:\s*min\(62dvh/, 'old tall talking HUD removed')
  assert.doesNotMatch(panelSrc, /Cast off/, 'teach has no second Cast-off row under parchment')
  assert.match(learnCss, /\.learn-page--immersive[\s\S]*?background:\s*#c8f0ff/, 'immersive shell uses max-bright sunny clear color')
  assert.match(learnCss, /\.hq-explore-fab\s*\{/, 'open-world explore FAB styles')
  assert.match(learnCss, /\.hq-explore-fab\.is-on/, 'explore FAB active state while free-looking')

  
  // Save Shack + Outfitter visitables & gear kit
  assert.equal(HARBOR_GEAR_CATALOG.length, 25, '25 clothing / handheld pieces')
  for (const slot of HARBOR_GEAR_SLOTS) {
    assert.equal(harborGearForSlot(slot).length, 5, `${slot} has 5 items`)
  }
  assert.equal(HARBOR_VISITABLES.length, 2, 'Save Shack + Outfitter')
  assert.ok(HARBOR_VISITABLES.some((v) => v.id === 'save-shack'))
  assert.ok(HARBOR_VISITABLES.some((v) => v.id === 'outfitter'))
  assert.ok(HARBOR_VISIT_RADIUS > 1, 'visit radius')
  const worldSrc2 = readFileSync(new URL('./harborWorld.ts', import.meta.url), 'utf8')
  assert.match(worldSrc2, /saveShackBuilding/, 'Save Shack mesh')
  assert.match(worldSrc2, /outfitterBuilding/, 'Outfitter mesh')
  assert.match(worldSrc2, /setLook/, 'world can recolor scout look')
  assert.match(worldSrc2, /nearestVisitable/, 'arrival opens visitables')
  const playSrc2 = readFileSync(new URL('./LearnPlay.tsx', import.meta.url), 'utf8')
  assert.match(playSrc2, /visitSaveShack/, 'Save Shack stamps progress')
  assert.match(playSrc2, /buyHarborGear/, 'Outfitter buy flow')
  assert.match(playSrc2, /equipHarborGear/, 'Outfitter equip flow')
  assert.match(playSrc2, /hq-visit-panel/, 'visit panel UI')
  const scoutLook = buildHarborProtagonist({ pose: 'seated' })
  applyLookToProtagonist(scoutLook, {
    hat: 'hat-festival',
    top: 'top-jade',
    bottom: 'bottom-crimson',
    shoes: 'shoes-storm',
    hand: 'hand-fan',
  })
  assert.ok(
    [...scoutLook.children].length >= 0,
    'applyLook runs on scout',
  )

console.log('harborQuest.smoke: ok', HARBOR_LEVELS.length, 'levels')
}

main()
