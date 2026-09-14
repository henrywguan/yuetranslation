import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  HARBOR_CAMPAIGNS,
  HARBOR_LEVELS,
  levelById,
  levelCampaign,
  levelRealm,
  levelsForCampaign,
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
  HARBOR_BGM_GAIN,
  HARBOR_BGM_LOOP_SEC,
  HARBOR_BGM_PHRASE,
  HARBOR_BGM_SCALE_HZ,
} from '../../landing/learn/harborBgm'
import { HARBOR_COIN_CHING_GAIN } from '../../landing/learn/harborCoinSfx'
import {
  biomeForChunk,
  clampOrbitDistance,
  clampOrbitPitch,
  dockPoseForProgress,
  HARBOR_DOCK_SPACING,
  HARBOR_FOG_DENSITY,
  HARBOR_NPC_ROLES,
  HARBOR_DIALOGUE_BUBBLE,
  HARBOR_SCENIC_TREES,
  HARBOR_SCENIC_SHRUBS,
  HARBOR_BAMBOO_FLORA,
  HARBOR_BAMBOO_FAUNA,
  HARBOR_VILLAGE_HOMES,
  HARBOR_AMBIENT_FAUNA,
  HARBOR_WEATHER_LOOK,
  HARBOR_WEATHERS,
  HARBOR_WULINGYUAN,
  HARBOR_XIANGYUN,
  orbitCameraOffset,
  orbitDistanceFromPinch,
  ORBIT_DISTANCE,
  ORBIT_DISTANCE_MAX,
  ORBIT_DISTANCE_MIN,
  ORBIT_PITCH_MAX,
  ORBIT_PITCH_MIN,
  pickHarborWeather,
  HARBOR_TAP_SLOP_PX,
  HARBOR_TAP_MOVE_SPEED,
  HARBOR_LAND_EDGE,
  HARBOR_WALK_SPEED,
  HARBOR_REBOARD_RADIUS,
  isHarborLand,
  HARBOR_TAP_ARRIVE,
  clampHarborMoveTarget,
  HARBOR_EXPLORE_X,
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
  HARBOR_DEFAULT_LOOK,
  HARBOR_STARTER_OWNED,
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
  assert.equal(HARBOR_CAMPAIGNS.length, 2, 'Sounds + Life Unit 0 campaigns')
  assert.equal(levelsForCampaign('life0').length, 5, 'Unit 0 campaign pier count')
  assert.equal(levelCampaign(levelById('life0-guess')!), 'life0')
  assert.equal(levelRealm(levelById('life0-classroom')!), 'bamboo')
  assert.equal(nextLevelId('life0-guess'), 'life0-classroom', 'Life0 next stays in campaign')
  const soundsLast = levelsForCampaign('sounds').at(-1)!.id
  assert.equal(nextLevelId(soundsLast), null, 'Sounds campaign ends at final pier')
  assert.match(
    openCantoneseLessonUrl(levelById('life0-daily')!),
    /unit-0\/3-daily-expressions/,
    'Life0 OC urls point at unit-0',
  )

  assert.equal(HARBOR_LEVELS[0]!.id, 'introduction')
  assert.ok(HARBOR_LEVELS.some((l) => l.id === 'jyutping-chart'), 'Sounds chart pier remains')
  assert.ok(HARBOR_LEVELS.some((l) => l.id === 'life0-intro'), 'Life0 closer pier present')

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
  assert.ok(HARBOR_SCENIC_SHRUBS.includes('china-tea-cup-rose'), 'China tea-cup rose bushes')
  assert.ok(HARBOR_SCENIC_SHRUBS.includes('hawthorn-berry'), 'hawthorn berry bushes')
  assert.ok(HARBOR_SCENIC_SHRUBS.includes('chinese-fringe-flower'), 'Chinese fringe flower shrubs')
  assert.equal(HARBOR_SCENIC_SHRUBS.length, 3, 'scenic shrub kit')
  assert.ok(HARBOR_BAMBOO_FLORA.includes('bamboo-clump'), 'bamboo realm flora')
  assert.ok(HARBOR_BAMBOO_FAUNA.includes('magpie'), 'bamboo realm fauna')
  assert.ok(HARBOR_VILLAGE_HOMES.includes('jiangnan'), 'jiangnan homes')
  assert.ok(HARBOR_VILLAGE_HOMES.includes('stilt'), 'riverside stilt shops')
  assert.equal(HARBOR_VILLAGE_HOMES.length, 4, 'village home kit')

  assert.equal(clampOrbitPitch(ORBIT_PITCH_MIN - 1), ORBIT_PITCH_MIN)
  assert.equal(clampOrbitPitch(ORBIT_PITCH_MAX + 1), ORBIT_PITCH_MAX)
  assert.equal(clampOrbitDistance(ORBIT_DISTANCE_MIN - 1), ORBIT_DISTANCE_MIN)
  assert.equal(clampOrbitDistance(ORBIT_DISTANCE_MAX + 1), ORBIT_DISTANCE_MAX)
  assert.ok(ORBIT_DISTANCE_MIN < ORBIT_DISTANCE && ORBIT_DISTANCE < ORBIT_DISTANCE_MAX, 'default zoom sits mid-range')
  const near = orbitCameraOffset(0, Math.PI / 6, ORBIT_DISTANCE_MIN)
  const far = orbitCameraOffset(0, Math.PI / 6, ORBIT_DISTANCE_MAX)
  assert.ok(Math.hypot(far.x, far.y, far.z) > Math.hypot(near.x, near.y, near.z), 'farther distance pushes camera out')
  const behind = orbitCameraOffset(0, Math.PI / 6)
  assert.ok(behind.z < 0, 'yaw 0 sits behind the canoe')
  const side = orbitCameraOffset(Math.PI / 2, Math.PI / 6)
  assert.ok(Math.abs(side.x) > Math.abs(side.z), 'yaw π/2 swings to the side')
  const around = orbitCameraOffset(Math.PI * 2, Math.PI / 6)
  assert.ok(Math.abs(around.x - behind.x) < 1e-9 && Math.abs(around.z - behind.z) < 1e-9, 'yaw wraps 360°')
  const worldSrc = readFileSync(new URL('./harborWorld.ts', import.meta.url), 'utf8')
  assert.match(worldSrc, /realm === 'bamboo'/, 'voyage dresses bamboo realm')
  assert.match(worldSrc, /HARBOR_BAMBOO_FLORA/, 'bamboo flora dressing export')
  assert.match(worldSrc, /function bambooClump/, 'bamboo clump mesh builder')
  assert.match(worldSrc, /function magpie/, 'magpie mesh builder')
  assert.match(worldSrc, /function koi/, 'koi mesh builder')
  assert.match(worldSrc, /realm === 'bamboo' \? 0x2a6a42/, 'bamboo realm grass tint')
  const stageSrc = readFileSync(new URL('./HarborStage.tsx', import.meta.url), 'utf8')
  assert.match(stageSrc, /realm=\{levelRealm\(level\)\}/, 'HarborStage passes realm into canvas')
  const canvasSrc = readFileSync(new URL('./HarborWorldCanvas.tsx', import.meta.url), 'utf8')
  assert.match(canvasSrc, /realm\?: HarborRealmId/, 'HarborWorldCanvas accepts realm prop')
  assert.match(canvasSrc, /\[realm\]/, 'canvas recreates world when realm changes')
  assert.match(worldSrc, /yawTarget\s*-=\s*dx\s*\*\s*ORBIT_SENS/, 'drag right decreases yaw (camera swings left)')
  assert.doesNotMatch(worldSrc, /yawTarget\s*\+=\s*dx\s*\*\s*ORBIT_SENS/, 'non-inverted yaw drag removed')
  assert.equal(HARBOR_TAP_SLOP_PX, 10, 'tap vs drag pixel slop')
  assert.ok(HARBOR_TAP_MOVE_SPEED > 2, 'tap-to-move has a walk/paddle speed')
  assert.ok(HARBOR_TAP_ARRIVE > 0, 'arrival threshold')
  assert.equal(clampHarborMoveTarget(99, -9).x, HARBOR_EXPLORE_X, 'move target clamps to inland explore bound')
  assert.equal(clampHarborMoveTarget(0, 999).z, 248, 'move target clamps far Z')
  assert.match(worldSrc, /HARBOR_TAP_SLOP_PX/, 'tap/drag discrimination uses slop constant')
  assert.match(worldSrc, /tryTapMove/, 'tap raycasts to ground and sets destination')
  assert.match(worldSrc, /userData\.clickMarker/, 'OSRS yellow destination marker')
  assert.match(worldSrc, /playerDirected/, 'player tap overrides auto-dock path')
  assert.match(worldSrc, /pitchTarget\s*=\s*clampOrbitPitch\(pitchTarget\s*\+\s*dy/, 'pitch drag is natural (drag down → look down)')
  assert.doesNotMatch(worldSrc, /pitchTarget\s*=\s*clampOrbitPitch\(pitchTarget\s*-\s*dy/, 'inverted pitch drag removed')
  assert.match(worldSrc, /beginPinch|pinchStartSpan/, 'two-finger pinch zoom')
  assert.match(worldSrc, /orbitDistanceFromPinch/, 'pinch uses maps-style distance helper')
  assert.ok(
    orbitDistanceFromPinch(ORBIT_DISTANCE, 100, 200) < ORBIT_DISTANCE,
    'fingers spreading apart zooms in (closer camera)',
  )
  assert.ok(
    orbitDistanceFromPinch(ORBIT_DISTANCE, 100, 50) > ORBIT_DISTANCE,
    'pinching fingers together zooms out (farther camera)',
  )
  assert.equal(
    orbitDistanceFromPinch(ORBIT_DISTANCE, 100, 100),
    ORBIT_DISTANCE,
    'unchanged span keeps distance',
  )
  assert.match(worldSrc, /onWheel|WHEEL_ZOOM_SENS/, 'mouse-wheel zoom')
  assert.match(worldSrc, /orbitCameraOffset\(yaw,\s*pitch,\s*distance\)/, 'orbit uses live zoom distance')
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
  assert.ok(playSrc.includes('hq-compass-disc'), 'OSRS compass disc on explore FAB')
  assert.ok(playSrc.includes('hq-compass-sparkle'), 'gold sparkle animation on compass')
  assert.ok(playSrc.includes('hq-play-title-en'), 'chapter title condensed to English line + Chinese line')
  assert.ok(playSrc.includes('hq-play-bar-title--tap'), 'chapter title is tappable')
  assert.ok(playSrc.includes('hq-scroll-modal'), 'chapter opens Chinese scroll modal')
  assert.ok(playSrc.includes('playHarborScrollOpen'), 'scroll open plays unfurl SFX')
  assert.ok(playSrc.includes('playHarborScrollClose'), 'scroll close plays roll-up SFX')
  assert.ok(playSrc.includes('setInvOpen(true)'), 'coin chip opens inventory')
  assert.ok(playSrc.includes('Open inventory'), 'Save Shack opens inventory')
  assert.ok(playSrc.includes('Teleport to chapter'), 'Save Shack chapter teleport')
  assert.ok(playSrc.includes('hq-campaign-tabs'), 'pier chart campaign tabs')
  assert.ok(playSrc.includes("levelsForCampaign"), 'map filters by campaign')
  assert.ok(playSrc.includes('hq-teleport-list'), 'chapter teleport list')

  assert.doesNotMatch(playSrc, /hq-btn--hud[^>]*>\s*Textbook/, 'top Textbook button removed')

  assert.match(playSrc, /setTalking\(false\)/, 'explore FAB exits dialogue')

  const scrollSfxSrc = readFileSync(new URL('./harborScrollSfx.ts', import.meta.url), 'utf8')
  assert.match(scrollSfxSrc, /export function playHarborScrollOpen/, 'scroll open SFX export')
  assert.match(scrollSfxSrc, /export function playHarborScrollClose/, 'scroll close SFX export')

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
  assert.match(learnCss, /\.hq-scroll-sheet\s*\{/, 'scroll sheet styles')
  assert.match(learnCss, /hq-scroll-unfurl/, 'scroll unfurl animation')
  assert.match(learnCss, /\.hq-play-bar-title--tap\s*\{/, 'tappable chapter title styles')
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
  assert.match(learnCss, /\.hq-compass-disc\s*\{/, 'OSRS compass disc styles')
  assert.match(learnCss, /@keyframes hq-compass-sparkle/, 'compass gold sparkle keyframes')
  assert.match(learnCss, /\.hq-play-title-en\s*\{/, 'condensed chapter title styles')
  assert.match(learnCss, /\.hq-coin-chip[^{]*\{[^}]*cursor:\s*pointer/, 'coin chip is clickable')


  
  // Save Shack + Outfitter visitables & gear kit
  assert.equal(HARBOR_GEAR_CATALOG.length, 49, '25 clothing + 12 boats + 12 lanterns')
  assert.ok(HARBOR_GEAR_SLOTS.includes('boat'), 'boat gear slot')
  assert.ok(HARBOR_GEAR_SLOTS.includes('lantern'), 'boat-lantern gear slot')
  assert.equal(HARBOR_GEAR_CATALOG.filter((i) => i.slot === 'boat').length, 12, '12 boats across 4 tiers')
  assert.equal(HARBOR_GEAR_CATALOG.filter((i) => i.slot === 'lantern').length, 12, '12 boat lanterns across 4 tiers')
  assert.equal(HARBOR_DEFAULT_LOOK.boat, 'boat-canoe')
  assert.equal(HARBOR_DEFAULT_LOOK.lantern, 'lantern-paper-amber')
  assert.ok(HARBOR_STARTER_OWNED.includes('boat-canoe'))
  assert.ok(HARBOR_STARTER_OWNED.includes('lantern-paper-amber'))

  for (const slot of HARBOR_GEAR_SLOTS) {
    const n = harborGearForSlot(slot).length
    if (slot === 'boat' || slot === 'lantern') {
      assert.equal(n, 12, `${slot} has 12 items (3 × 4 tiers)`)
    } else {
      assert.equal(n, 5, `${slot} has 5 items`)
    }
  }
  assert.equal(HARBOR_VISITABLES.length, 4, 'Save Shack + Outfitter + Bank + Arena')
  assert.ok(HARBOR_VISITABLES.some((v) => v.id === 'save-shack'))
  assert.ok(HARBOR_VISITABLES.some((v) => v.id === 'outfitter'))
  assert.ok(HARBOR_VISITABLES.some((v) => v.id === 'bank'))
  assert.ok(HARBOR_VISITABLES.some((v) => v.id === 'arena'))
  assert.ok(HARBOR_VISIT_RADIUS > 1, 'visit radius')
  const worldSrc2 = readFileSync(new URL('./harborWorld.ts', import.meta.url), 'utf8')
  assert.match(worldSrc2, /saveShackBuilding/, 'Save Shack mesh')
  assert.match(worldSrc2, /outfitterBuilding/, 'Outfitter mesh')
  assert.match(worldSrc2, /bankBuilding/, 'Bank mesh')
  assert.match(worldSrc2, /arenaBuilding/, 'Arena mesh')
  assert.match(worldSrc2, /goldenPortal|save-portal/, 'Save Shack golden portal')
  assert.match(worldSrc2, /jadePortal|bank-portal/, 'Bank jade portal')
  assert.match(worldSrc2, /arenaPortal|arena-portal/, 'Arena amber portal')
  assert.match(worldSrc2, /dirtRoad|placeDirtRoads/, 'dirt roads on banks')
  assert.match(worldSrc2, /inlandRoad|crossPath|foothillPath/, 'inland walkways + cross-paths')
  assert.match(worldSrc2, /roadSign|ROAD_SIGN_KINDS/, 'Chinese roadside 路牌')
  assert.match(worldSrc2, /mountainMist|foothill/, 'mountain foothills + mist veils')
  assert.match(worldSrc2, /inlandShelf|foothillShelf/, 'expanded bank shelves toward karst')
  assert.ok(HARBOR_EXPLORE_X > HARBOR_DOCK_X + 3, 'explore bound reaches inland roads')
  assert.equal(HARBOR_DIALOGUE_BUBBLE, true, 'dialogue NPCs expose a speech-bubble cue')
  assert.match(worldSrc2, /attachDialogueBubble|speechBubbleIcon/, 'Talkable NPCs get a speech bubble icon')
  assert.match(worldSrc2, /hasDialogue/, 'dialogue NPCs tagged hasDialogue')
  assert.match(worldSrc2, /attachDialogueBubble\(npc\)/, 'bubbles attach to pier dialogue hosts')
  assert.match(worldSrc2, /harborLanternIntensity|PointLight/, 'lantern ambiance lights')
  
  assert.ok(HARBOR_AMBIENT_FAUNA.includes('panda'), 'giant panda ambient fauna')
  assert.ok(HARBOR_AMBIENT_FAUNA.includes('tiger'), 'South China tiger ambient fauna')
  assert.ok(HARBOR_AMBIENT_FAUNA.includes('ibis'), 'crested ibis ambient fauna')
  assert.ok(HARBOR_AMBIENT_FAUNA.includes('salamander'), 'giant salamander ambient fauna')
  assert.match(worldSrc2, /function panda/, 'panda mesh builder')
  assert.match(worldSrc2, /function southChinaTiger/, 'South China tiger mesh builder')
  assert.match(worldSrc2, /function crestedIbis/, 'crested ibis mesh builder')
  assert.match(worldSrc2, /function giantSalamander/, 'giant salamander mesh builder')
  assert.match(worldSrc2, /function chinaTeaCupRose/, 'tea-cup rose mesh builder')
  assert.match(worldSrc2, /function hawthornBush/, 'hawthorn berry mesh builder')
  assert.match(worldSrc2, /function chineseFringeFlower/, 'Chinese fringe flower mesh builder')
  assert.ok(HARBOR_LAND_EDGE > 3, 'land edge sits outside the river channel')
  assert.ok(HARBOR_WALK_SPEED > 2, 'on-foot walk speed')
  assert.ok(HARBOR_REBOARD_RADIUS > 1, 'reboard radius')
  assert.equal(isHarborLand(HARBOR_LAND_EDGE), true, 'bank is land')
  assert.equal(isHarborLand(0), false, 'river center is not land')
  assert.match(worldSrc2, /travelMode === 'foot'/, 'on-foot travel mode')
  assert.match(worldSrc2, /river-scout-walk/, 'standing walk Scout for land')
  assert.match(worldSrc2, /pose: 'standing'/, 'standing protagonist pose on land')
  assert.match(worldSrc2, /const disembark|function disembark|const boardBoat/, 'disembark / board helpers')

  assert.match(worldSrc2, /fauna === 'panda'/, 'panda idle animation')
  assert.match(worldSrc2, /fauna === 'tiger'/, 'tiger pace animation')

  assert.match(worldSrc2, /function boatLantern/, 'boat gunwale lantern helper')
  assert.match(worldSrc2, /function buildBoatHull/, 'tiered boat hull builder')
  assert.match(worldSrc2, /applyVesselLook/, 'look swaps boat + lanterns')
  assert.match(worldSrc2, /canoe\(weather, currentLook\.boat, currentLook\.lantern\)/, 'canoe uses equipped boat + lantern')
  assert.match(worldSrc2, /boatLantern\(weather, lanternId\)/, 'port+starboard lanterns use lantern gear colors')

  assert.match(worldSrc2, /uniqueLandmark/, 'landmarks tagged unique vs village homes')
  assert.match(worldSrc2, /setLook/, 'world can recolor scout look')
  assert.match(worldSrc2, /nearestVisitable/, 'arrival opens visitables')
  const playSrc2 = readFileSync(new URL('./LearnPlay.tsx', import.meta.url), 'utf8')
  assert.match(playSrc2, /visitSaveShack/, 'Save Shack stamps progress')
  assert.match(playSrc2, /buyHarborGear/, 'Outfitter buy flow')
  assert.match(playSrc2, /equipHarborGear/, 'Outfitter equip flow')
  assert.match(playSrc2, /depositHarborGear/, 'Bank deposit flow')
  assert.match(playSrc2, /withdrawHarborGear/, 'Bank withdraw flow')
  assert.match(playSrc2, /hq-inv-btn/, 'Inventory HUD button')
  assert.match(playSrc2, /hq-visit-panel--bank/, 'Bank visit panel')
  assert.match(playSrc2, /hq-visit-panel/, 'visit panel UI')
  assert.match(playSrc2, /MatchDefinitionModal/, 'Match the Definition modal')
  assert.match(playSrc2, /markGoldEarned/, 'arena gold awards')
  assert.match(playSrc2, /hq-gold-chip/, 'arena gold HUD chip')
  assert.ok(existsSync(new URL('./matchDefinitionBank.ts', import.meta.url)), 'match bank')
  assert.ok(existsSync(new URL('./MatchDefinitionModal.tsx', import.meta.url)), 'match modal')
  assert.match(learnCss, /\.hq-match-modal\s*\{/, 'match modal styles')
  assert.match(learnCss, /\.hq-gold-chip\s*\{/, 'gold chip styles')
  assert.ok(existsSync(new URL('./HarborLeaderboard.tsx', import.meta.url)), 'leaderboard UI')
  assert.match(learnCss, /\.hq-board\s*\{/, 'leaderboard styles')
  assert.ok(existsSync(new URL('./xpRewards.ts', import.meta.url)), 'xp rewards')
  assert.match(playSrc2, /missionBaseXp|sailorLevelFromXp/, 'XP on pier clear / HUD')
  assert.match(playSrc2, /hq-xp-chip/, 'XP HUD chip')
  assert.match(learnCss, /\.hq-xp-chip\s*\{/, 'XP chip styles')
  const scoutLook = buildHarborProtagonist({ pose: 'seated' })
  applyLookToProtagonist(scoutLook, {
    hat: 'hat-festival',
    top: 'top-jade',
    bottom: 'bottom-crimson',
    shoes: 'shoes-storm',
    hand: 'hand-fan',
    boat: 'boat-canoe',
    lantern: 'lantern-paper-amber',
  })
  assert.ok(
    [...scoutLook.children].length >= 0,
    'applyLook runs on scout',
  )


  // Coin reward feedback + Chinese-themed Harbor BGM
  const progressSrc = readFileSync(new URL('./progress.ts', import.meta.url), 'utf8')
  assert.match(progressSrc, /HARBOR_COINS_PER_CORRECT\s*=\s*\d+/, 'correct casts award ferry coins')
  assert.ok(HARBOR_COIN_CHING_GAIN > 0 && HARBOR_COIN_CHING_GAIN < 0.5, 'coin ching stays soft')
  assert.ok(HARBOR_BGM_GAIN > 0 && HARBOR_BGM_GAIN < 0.25, 'BGM stays under SFX')
  assert.ok(HARBOR_BGM_LOOP_SEC >= 24 && HARBOR_BGM_LOOP_SEC <= 64, 'BGM loop length')
  assert.equal(HARBOR_BGM_SCALE_HZ.length, 6, 'pentatonic + octave scale')
  assert.ok(HARBOR_BGM_PHRASE.length >= 16, 'BGM phrase has pad + flute + pluck voices')
  assert.ok(
    HARBOR_BGM_PHRASE.some((v) => v.kind === 'flute') &&
      HARBOR_BGM_PHRASE.some((v) => v.kind === 'pad') &&
      HARBOR_BGM_PHRASE.some((v) => v.kind === 'pluck'),
    'BGM uses flute / pad / pluck timbres',
  )
  const playAudioSrc = readFileSync(new URL('./LearnPlay.tsx', import.meta.url), 'utf8')
  assert.match(playAudioSrc, /playHarborCoinChing/, 'correct answer plays coin ching')
  assert.match(playAudioSrc, /hq-coin-pop/, 'floating +coin animation')
  assert.match(playAudioSrc, /startHarborBgm/, 'session starts Chinese Harbor BGM')
  assert.match(playAudioSrc, /stopHarborBgm/, 'session stops BGM on exit')
  assert.match(playAudioSrc, /duckHarborBgm/, 'BGM ducks under fanfare')

  // Direct launch — `#/learn` opens fullscreen play (no marketing hub)
  const learnPageSrc = readFileSync(new URL('./LearnPage.tsx', import.meta.url), 'utf8')
  assert.match(learnPageSrc, /continueHarborLevelId/, 'bare /learn continues into a pier')
  assert.match(learnPageSrc, /hq-chart-overlay/, 'pier chart is an in-game overlay')
  assert.doesNotMatch(learnPageSrc, /hq-hero/, 'marketing Learn hub hero removed')
  assert.doesNotMatch(learnPageSrc, /MarketingPageShell|MarketingFooter/, 'no marketing shell on Learn')
  assert.match(learnCss, /\.hq-chart-overlay/, 'chart overlay styles')
  assert.match(progressSrc, /continueHarborLevelId/, 'continue helper exported')


console.log('harborQuest.smoke: ok', HARBOR_LEVELS.length, 'levels')
}

main()
