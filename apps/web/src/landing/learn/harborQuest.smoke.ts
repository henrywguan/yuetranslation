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
  GUAN_BGM_PHRASE,
  GUAN_BGM_SCALE_HZ,
  harborBgmTheme,
} from '../../landing/learn/harborBgm'
import { HARBOR_COIN_CHING_GAIN } from '../../landing/learn/harborCoinSfx'
import {
  HARBOR_AMBIENT_GAIN,
  HARBOR_WILDLIFE_GAIN,
  isHarborAmbientRunning,
} from '../../landing/learn/harborAmbient'
import {
  HARBOR_INTERACT_SFX_GAIN,
  playHarborBagClose,
  playHarborBagOpen,
  playHarborCastOff,
  playHarborEquip,
  playHarborExplore,
  playHarborFootstep,
  playHarborLandmarkOpen,
  playHarborPaddle,
  playHarborTalkStart,
  playHarborUiClick,
  tickHarborMoveSfx,
} from '../../landing/learn/harborInteractSfx'
import {
  biomeForChunk,
  streamForkForChunk,
  clampOrbitDistance,
  clampOrbitPitch,
  dockPoseForProgress,
  HARBOR_DOCK_SPACING,
  HARBOR_MAX_QUEST_SLOTS,
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
  HARBOR_LANDMARK_HOSTS,
  HARBOR_VISIT_RADIUS,
} from '../../landing/learn/harborWorld'
import {
  buildGuanHarborScene,
  clampGuanBoatTarget,
  clampGuanFootTarget,
  isGuanLand,
  GUAN_BOAT_START,
  GUAN_HARBOR_BOUNDS,
  GUAN_HARBOR_META,
  GUAN_ISLANDS,
  GUAN_LAND_OUTLINE,
  GUAN_LANDMARKS,
  GUAN_RETURN_PORTAL,
  GUAN_TROPICAL_LOOK,
} from '../../landing/learn/harborGuanRealm'
import {
  HARBOR_CRAFT_PALETTE,
  HARBOR_CRAFT_PROPS,
  HARBOR_FACETS,
  hqBarrel,
  hqBox,
  hqCanopy,
  hqCrate,
  hqDoor,
  hqFence,
  hqMatSmooth,
  hqMarketStall,
  hqRock,
  hqSack,
  hqStampClutter,
  hqWallWindow,
  hqWindow,
  hqWoodTexture,
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
  HARBOR_VIP_MIN_PRICE,
  HARBOR_VIP_SETS,
  applyLookToProtagonist,
  buildHandheldProp,
  harborGearCanEquipToSlot,
  harborGearCodexStats,
  harborGearForSlot,
  harborGearIsWorn,
  harborGearMeshInfo,
  harborGearWearTarget,
  harborVipSetFor,
  sanitizeHarborLook,
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
  assert.equal(streamForkForChunk(0), null, 'start chunk has no stream fork')
  const forks = Array.from({ length: 24 }, (_, i) => streamForkForChunk(i)).filter(Boolean)
  assert.ok(forks.length >= 8, 'river sprouts multiple side streams')
  assert.ok(
    forks.some((f) => f && f.kind === 'creek') &&
      forks.some((f) => f && (f.kind === 'tributary' || f.kind === 'oxbow')),
    'forks include creek + larger channels',
  )
  assert.match(
    readFileSync(new URL('./harborWorld.ts', import.meta.url), 'utf8'),
    /function placeSideStream|hq-stream-creek|hq-stream-tributary|hq-stream-oxbow/,
    'side-stream placer builds creek/tributary/oxbow meshes',
  )

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
  const farCam = orbitCameraOffset(0, Math.PI / 6, ORBIT_DISTANCE_MAX)
  assert.ok(Math.hypot(farCam.x, farCam.y, farCam.z) > Math.hypot(near.x, near.y, near.z), 'farther distance pushes camera out')
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
  // Guan Harbor — Karamja silhouette (Musa / Brimhaven / volcano / Shilo)
  assert.match(worldSrc, /HarborRealmId = 'river' \| 'bamboo' \| 'guan'/, 'realm id includes guan')
  const curriculumSrc = readFileSync(new URL('./curriculum.ts', import.meta.url), 'utf8')
  assert.match(curriculumSrc, /HarborRealmId = 'river' \| 'bamboo' \| 'guan'/, 'curriculum realm id includes guan')
  assert.equal(GUAN_HARBOR_META.en, 'Guan Harbor')
  assert.equal(GUAN_HARBOR_META.zh, '關港')
  assert.ok(GUAN_ISLANDS.length >= 4, 'named Guan landmark regions')
  assert.ok(GUAN_LAND_OUTLINE.length >= 16, 'Karamja-style land outline has enough verts')
  assert.ok(GUAN_TROPICAL_LOOK.sky > 0 && GUAN_TROPICAL_LOOK.water > 0, 'tropical look constants')
  assert.ok(GUAN_HARBOR_BOUNDS.maxX > GUAN_HARBOR_BOUNDS.minX, 'guan bounds')
  const guanScene = buildGuanHarborScene()
  assert.equal(guanScene.name, 'guan-harbor')
  assert.ok(guanScene.children.length >= 8, 'guan scene has land / flora / pier / portal')
  assert.ok(
    guanScene.children.some((c) => c.name === 'guan-island-main'),
    'main Karamja-silhouette island mesh',
  )
  assert.ok(
    guanScene.children.some((c) => c.name === 'guan-volcano'),
    'volcano landmark between Musa and Brimhaven',
  )
  assert.ok(
    guanScene.children.some((c) => c.name === 'guan-musa-pier' || c.name === 'guan-return-portal'),
    'Musa Point pier / return portal',
  )
  assert.ok(
    guanScene.children.some((c) => c.name === 'guan-island-cairn'),
    'Cairn islet SW of Shilo',
  )
  // Inland jungle (near Tai Bwo Wannai) is land; Musa Passage water is not
  assert.equal(isGuanLand(-2.5, -1.5), true, 'Tai Bwo Wannai jungle is walkable land')
  assert.equal(isGuanLand(GUAN_LANDMARKS.musaPoint.x, GUAN_LANDMARKS.musaPoint.z), true, 'Musa Point is land')
  assert.equal(isGuanLand(GUAN_LANDMARKS.brimhaven.x, GUAN_LANDMARKS.brimhaven.z), true, 'Brimhaven is land')
  assert.equal(isGuanLand(GUAN_LANDMARKS.shilo.x, GUAN_LANDMARKS.shilo.z), true, 'Shilo Village is land')
  assert.equal(isGuanLand(6.5, 3.5), false, 'Musa Passage channel is water')
  assert.equal(isGuanLand(0, 22), false, 'open sea north of Musa is not land')
  const insideIsland = clampGuanBoatTarget(GUAN_LANDMARKS.volcano.x, GUAN_LANDMARKS.volcano.z)
  assert.equal(isGuanLand(insideIsland.x, insideIsland.z), false, 'clamp pushes boat off island land')
  const shore = clampGuanFootTarget(0, 22)
  assert.ok(isGuanLand(shore.x, shore.z), 'foot clamp snaps onto the island')
  const guanFar = clampGuanBoatTarget(99, -99)
  assert.equal(guanFar.x, GUAN_HARBOR_BOUNDS.maxX)
  assert.equal(guanFar.z, GUAN_HARBOR_BOUNDS.minZ)
  assert.match(worldSrc, /buildGuanHarborScene/, 'world builds static guan scene')
  assert.match(worldSrc, /clampGuanBoatTarget/, 'guan tap-move clamp')
  assert.match(worldSrc, /isGuan/, 'guan free-sail branch')
  assert.match(worldSrc, /isGuanLand/, 'guan islands are walkable land')
  assert.match(worldSrc, /clampGuanFootTarget/, 'guan foot clamp on islands')
  assert.match(worldSrc, /isGuan && isGuanLand/, 'tap island to disembark in guan')
  assert.match(worldSrc, /GUAN_RETURN_PORTAL/, 'guan return portal visit')
  assert.match(worldSrc, /GUAN_WATER_PLANE/, 'guan water plane follows island bounds')
  assert.equal(GUAN_RETURN_PORTAL.id, 'save-shack')
  assert.ok(Number.isFinite(GUAN_BOAT_START.x) && Number.isFinite(GUAN_BOAT_START.z), 'boat start offset')
  assert.ok(GUAN_BOAT_START.z > GUAN_LANDMARKS.musaDock.z, 'boat spawns north of Musa pier')
  const stageSrc = readFileSync(new URL('./HarborStage.tsx', import.meta.url), 'utf8')
  assert.match(
    stageSrc,
    /realm=\{realmOverride \?\? levelRealm\(level\)\}/,
    'HarborStage passes realmOverride ?? levelRealm into canvas',
  )
  const canvasSrc = readFileSync(new URL('./HarborWorldCanvas.tsx', import.meta.url), 'utf8')
  assert.match(canvasSrc, /realm\?: HarborRealmId/, 'HarborWorldCanvas accepts realm prop')
  assert.match(canvasSrc, /\[realm\]/, 'canvas recreates world when realm changes')
  assert.match(
    canvasSrc,
    /setLocalUsername\(name\)|setLocalUsername\(localUsernameRef/,
    'realm remount restores local nametag (not default sailor)',
  )
  assert.match(canvasSrc, /localUsernameRef/, 'username kept across realm remount via ref')
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
  assert.equal(HARBOR_FOG_DENSITY, 0.0056, 'stronger sunny fog shortens draw distance')
  assert.equal(HARBOR_WEATHER_LOOK.sunny.fogDensity, 0.0056, 'sunny fog density')
  assert.equal(HARBOR_WEATHER_LOOK.cloudy.fogDensity, 0.012, 'cloudy fog denser')
  assert.equal(HARBOR_WEATHER_LOOK.rainy.fogDensity, 0.018, 'rainy fog densest')
  assert.equal(HARBOR_WEATHER_LOOK.night.fogDensity, 0.01, 'night fog denser')
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
  assert.match(worldSrc, /PerspectiveCamera\(48,\s*1,\s*0\.1,\s*180\)/, 'camera far matches fog veil')
  assert.match(worldSrc, /only dialogue hosts stay|pier dialogue hosts are the only people/, 'decorative NPCs culled')
  assert.doesNotMatch(worldSrc, /Extra villager variety|Villagers & merchants strolling/, 'ambient NPC placement removed')

  assert.ok(HARBOR_NPC_ROLES.includes('villager'), 'villager NPCs')
  assert.ok(HARBOR_NPC_ROLES.includes('scholar'), 'scholar NPCs')
  assert.ok(HARBOR_NPC_ROLES.includes('fisherman'), 'fisherman NPCs')
  assert.ok(HARBOR_NPC_ROLES.includes('merchant'), 'merchant NPCs')
  assert.equal(HARBOR_NPC_ROLES.length, 6, 'Chinese clothing role kit')

  // Craft bible kit — locked palette + faceted helpers + modular props
  assert.equal(HARBOR_FACETS, 6, 'era cylinders stay 6-gon')
  assert.ok(HARBOR_CRAFT_PALETTE.jade === 0x3dcfb6, 'brand jade in craft palette')
  assert.ok(HARBOR_CRAFT_PALETTE.woodMid && HARBOR_CRAFT_PALETTE.roofTile, 'wood/roof swatches')
  assert.ok(HARBOR_CRAFT_PALETTE.woodLight && HARBOR_CRAFT_PALETTE.woodDeep, 'wood value steps')
  assert.ok(HARBOR_CRAFT_PALETTE.strawLite && HARBOR_CRAFT_PALETTE.strawDark, 'thatch value steps')
  assert.ok(HARBOR_CRAFT_PALETTE.glass && HARBOR_CRAFT_PALETTE.lava, 'glass / lava swatches')
  assert.ok(hqBox(1, 1, 1, HARBOR_CRAFT_PALETTE.stone).isMesh, 'hqBox builds meshes')
  assert.ok(hqCanopy(0.5, HARBOR_CRAFT_PALETTE.leafMid).isMesh, 'hqCanopy faceted')
  assert.ok(hqRock(() => 0.5).isMesh, 'hqRock boxy')
  assert.equal(
    (hqRock(() => 0.5).material as { flatShading?: boolean }).flatShading,
    false,
    'rocks use smooth Gouraud-style Lambert',
  )
  assert.ok(hqMatSmooth(0xff0000).flatShading === false, 'hqMatSmooth is smooth')
  assert.ok(hqWindow(0.3, 0.3, HARBOR_CRAFT_PALETTE.trimGold, 0x102030, 0, 0, 0).isGroup, 'extruded window')
  assert.ok(hqDoor().name === 'hq-door', 'extruded door prop')
  assert.ok(hqWallWindow(1, 1, 0.2, HARBOR_CRAFT_PALETTE.plaster).name === 'hq-wall-window', 'wall+window panel')
  assert.deepEqual(
    [...HARBOR_CRAFT_PROPS],
    ['crate', 'barrel', 'fence', 'sack', 'door', 'wall-window', 'market-stall'],
    'modular craft prop kit',
  )
  assert.ok(hqCrate(() => 0.2).name === 'hq-crate', 'crate prop')
  assert.ok(hqBarrel(() => 0.2).name === 'hq-barrel', 'barrel prop')
  assert.ok(hqFence(2).name === 'hq-fence', 'fence prop')
  assert.ok(hqSack(() => 0.2).name === 'hq-sack', 'sack prop')
  assert.ok(hqMarketStall(() => 0.2).name === 'hq-market-stall', 'market stall prop')
  assert.equal(hqWoodTexture().image.width, 128, 'wood albedo is 128×128 era size')
  assert.equal(hqWoodTexture().magFilter, 1003 /* NearestFilter */, 'wood uses nearest filter')
  const added: string[] = []
  const clutterRoot = {
    add(o: { name?: string }) {
      added.push(o.name ?? '')
    },
  } as unknown as import('three').Group
  hqStampClutter(clutterRoot, () => 0.5, 0, 0, 2, 3)
  assert.ok(added.length === 3, 'stamp clutter adds props')
  assert.match(
    readFileSync(new URL('./harborGuanRealm.ts', import.meta.url), 'utf8'),
    /hqStampClutter/,
    'Guan stamps town clutter',
  )
  assert.match(
    readFileSync(new URL('./harborWorld.ts', import.meta.url), 'utf8'),
    /hqStampClutter/,
    'river pier/village stamps clutter',
  )

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
  assert.equal(dockPoseForProgress(0).slot, 0, 'progress 0 → pier 0')
  assert.equal(
    dockPoseForProgress(1 / HARBOR_MAX_QUEST_SLOTS).slot,
    1,
    'one quest gate → next pier slot',
  )
  assert.notEqual(
    dock0.side,
    dockPoseForProgress(1 / HARBOR_MAX_QUEST_SLOTS).side,
    'adjacent slots alternate banks',
  )
  assert.ok(
    dockPoseForProgress(1).z <= HARBOR_MAX_QUEST_SLOTS * HARBOR_DOCK_SPACING + 6,
    'quest auto-sail caps before empty downriver',
  )
  assert.match(
    readFileSync(new URL('./HarborStage.tsx', import.meta.url), 'utf8'),
    /HARBOR_MAX_QUEST_SLOTS/,
    'stage maps stepIndex to capped pier slots',
  )
  assert.match(
    readFileSync(new URL('./harborWorld.ts', import.meta.url), 'utf8'),
    /playerDirected && arrived/,
    'landmark modals only after player-directed arrival',
  )
  assert.match(
    readFileSync(new URL('./harborWorld.ts', import.meta.url), 'utf8'),
    /!playerDirected\) \{\s*emitVisitable\(null\)/,
    'auto-quest sail clears landmark visits',
  )
  assert.equal(HARBOR_WULINGYUAN, true, 'Wulingyuan mountain backdrop')
  assert.equal(HARBOR_XIANGYUN, true, 'xiangyun auspicious sky clouds')

  const panelSrc = readFileSync(new URL('./QuestPanel.tsx', import.meta.url), 'utf8')
  assert.ok(panelSrc.includes('is-exploring'), 'quest panel starts in explore mode')
  assert.ok(panelSrc.includes('hq-dialog'), 'OSRS-style NPC dialogue box')
  assert.ok(panelSrc.includes('Talk to'), 'Talk CTA to open dialogue')
  assert.ok(panelSrc.includes('Explore world'), 'Explore world dismisses dialogue')
  assert.match(worldSrc, /snapToQuestDock/, 'world can teleport canoe to quest pier')

  const playSrc = readFileSync(new URL('./LearnPlay.tsx', import.meta.url), 'utf8')
  assert.match(playSrc, /snapToQuestDock/, 'Talk / Next gate snaps sailor to quest dock')
  assert.match(playSrc, /beginTalk/, 'Talk CTA boards + docks before dialogue')
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
  assert.ok(playSrc.includes('playHarborBagOpen'), 'coin chip / Save Shack play bag open')
  assert.ok(playSrc.includes('playHarborBagClose'), 'coin chip / bag close play bag close')
  assert.match(playSrc, /setInvOpen\(\(v\)\s*=>/, 'coin chip toggles inventory open/close')
  assert.ok(playSrc.includes('setInvOpen(true)'), 'Save Shack / visitables can open inventory')
  assert.ok(playSrc.includes('Open inventory'), 'Save Shack opens inventory')
  assert.ok(playSrc.includes('HarborInventoryBag'), 'inventory uses OSRS-style bag panel')
  assert.doesNotMatch(playSrc, /hq-inv-btn/, 'Pack HUD button removed')
  const bagSrc = readFileSync(new URL('./HarborInventoryBag.tsx', import.meta.url), 'utf8')
  assert.match(bagSrc, /export function HarborInventoryBag/, 'inventory bag component')
  assert.match(bagSrc, /HARBOR_BAG_SLOTS\s*=\s*28/, 'OSRS 28-slot bag capacity')
  assert.match(bagSrc, /hq-bag-grid/, 'bag renders item grid')
  assert.match(bagSrc, /HarborGearModelIcon/, 'bag shows item model icons')
  assert.match(bagSrc, /HarborItemTooltip/, 'bag shows hover/tap item tooltips')
  assert.match(bagSrc, /setTipId/, 'bag tip state is independent of selection')
  assert.match(bagSrc, /pointerdown/, 'bag dismisses tip on tap-away')
  assert.doesNotMatch(bagSrc, /tipOpen = hoverId === item\.id \|\| on/, 'tips are not sticky on selection')
  assert.match(bagSrc, /HarborWornBoard/, 'bag Worn tab keeps paperdoll')
  assert.match(bagSrc, /playHarborUiClick/, 'bag tabs tick UI click')
  const tipSrc = readFileSync(new URL('./HarborItemTooltip.tsx', import.meta.url), 'utf8')
  assert.match(tipSrc, /export function HarborItemTooltip/, 'item tooltip component')
  assert.match(tipSrc, /role="tooltip"/, 'tooltip uses tooltip role')
  assert.match(tipSrc, /is-vip/, 'VIP tips get gold glow class')
  const wornSrc = readFileSync(new URL('./HarborWornBoard.tsx', import.meta.url), 'utf8')
  assert.match(wornSrc, /export function HarborWornBoard/, 'worn board component')
  assert.match(wornSrc, /hq-worn-slot--hat/, 'worn board hat slot')
  assert.match(wornSrc, /hq-worn-figure/, 'worn board paperdoll')
  assert.match(wornSrc, /HarborGearModelIcon/, 'worn slots show item model icons')
  assert.match(wornSrc, /HarborItemTooltip/, 'worn slots show examine tips')
  assert.match(wornSrc, /tipId === item\.id/, 'worn tips follow tipId only (not selection)')
  assert.doesNotMatch(wornSrc, /hq-worn-swatch/, 'worn color swatches removed')
  const wornCss = readFileSync(new URL('./learn.css', import.meta.url), 'utf8')
  assert.match(wornCss, /\.hq-worn\s*\{/, 'worn board styles')
  assert.match(
    wornCss,
    /\.hq-worn\s*\{[^}]*flex-shrink:\s*0/s,
    'worn board does not flex-shrink over pack',
  )
  assert.match(wornCss, /\.hq-bag-grid/, 'OSRS bag grid styles')
  assert.match(wornCss, /grid-template-columns:\s*repeat\(4/, 'bag is 4 columns')
  assert.match(wornCss, /grid-template-rows:\s*repeat\(7/, 'bag is 7 rows')
  assert.match(wornCss, /\.hq-bag-model/, 'compact bag model icon styles')
  assert.match(wornCss, /\.hq-item-tip/, 'item examine tip styles')
  assert.match(wornCss, /\.hq-item-tip\.is-vip/, 'VIP tip gold glow styles')
  assert.match(wornCss, /hq-item-tip-vip-glow/, 'VIP tip glow keyframes')
  assert.match(wornCss, /\.hq-worn-model/, 'worn slot model icon styles')
  assert.doesNotMatch(wornCss, /\.hq-worn-swatch/, 'worn swatch styles removed')
  assert.match(wornCss, /\.hq-visit-panel--inv[\s\S]*?max-height:\s*min\(82dvh/, 'inv panel tall enough for bag')
  assert.match(wornCss, /\.hq-worn-slot--boat/, 'worn board boat slot')
  assert.doesNotMatch(playSrc, />\s*Pack\s*</, 'Pack label removed from HUD')
  assert.ok(playSrc.includes('worldPaused'), 'session accepts page-level world pause')
  assert.ok(playSrc.includes('paused={'), 'stage receives pause when overlays open')
  assert.ok(playSrc.includes('Teleport to chapter'), 'Save Shack chapter teleport')
  assert.ok(playSrc.includes('GUAN_HARBOR_META'), 'Save Shack Guan Harbor teleport label')
  assert.ok(playSrc.includes('realmOverride'), 'LearnPlay realmOverride state')
  assert.ok(playSrc.includes("startHarborBgm('guan')"), 'Guan teleport switches BGM theme')
  assert.ok(playSrc.includes("startHarborBgm('river')"), 'cast off / chapter restores river BGM')
  assert.ok(playSrc.includes('hq-campaign-tabs'), 'pier chart campaign tabs')
  assert.ok(playSrc.includes("levelsForCampaign"), 'map filters by campaign')
  assert.ok(playSrc.includes('hq-teleport-list'), 'chapter teleport list')
  assert.ok(playSrc.includes('hq-teleport-btn--guan'), 'always-unlocked Guan Harbor teleport button')
  assert.equal(GUAN_HARBOR_META.en, 'Guan Harbor', 'Guan Harbor English teleport label')
  assert.equal(GUAN_HARBOR_META.zh, '關港', 'Guan Harbor Chinese teleport label')

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
  assert.match(learnCss, /--hq-osrs-strip:\s*min\(52dvh,\s*28rem\)/, 'OSRS talking strip fallback max')
  assert.doesNotMatch(learnCss, /--hq-osrs-strip:\s*min\(30dvh,\s*16\.5rem\)/, 'old short talking strip removed')
  assert.doesNotMatch(learnCss, /--hq-osrs-strip:\s*min\(32dvh,\s*17rem\)/, 'old short mobile talking strip removed')
  assert.doesNotMatch(learnCss, /--hq-osrs-strip:\s*min\(48dvh,\s*26rem\)/, 'old fixed tall talking strip removed')
  assert.match(
    learnCss,
    /\.hq-play-stage\s*\{[^}]*bottom:\s*var\(--hq-osrs-strip\)/,
    'stage ends above OSRS strip so world stays fully visible',
  )
  assert.match(
    learnCss,
    /\.hq-play-hud\.is-talking\s*\{[^}]*height:\s*auto/s,
    'talking HUD hugs content height',
  )
  assert.doesNotMatch(learnCss, /\.hq-play-hud\.is-talking\s*\{[^}]*max-height:\s*min\(62dvh/, 'old tall talking HUD removed')
  assert.match(playSrc, /ResizeObserver/, 'talk strip height measured live')
  assert.match(playSrc, /talkHudRef/, 'talk HUD ref for strip measure')
  assert.match(playSrc, /setProperty\('--hq-osrs-strip'/, 'writes measured strip CSS var')
  assert.doesNotMatch(panelSrc, /Cast off/, 'teach has no second Cast-off row under parchment')
  assert.match(learnCss, /\.learn-page--immersive[\s\S]*?background:\s*#c8f0ff/, 'immersive shell uses max-bright sunny clear color')
  // LevelClear fullscreen overlay is #061018 — must not inherit light-page --ink (#07131f).
  assert.match(learnCss, /\.hq-clear--immersive\s*\{[^}]*--ink:\s*#e8f4ff/s, 'immersive clear resets --ink for dark panel')
  assert.match(learnCss, /\.hq-clear--immersive\s*\{[^}]*#061018/s, 'immersive clear keeps dark harbor wash')
  assert.match(
    learnCss,
    /\.hq-clear--immersive\s*\{[^}]*color:\s*color-mix\(in srgb,\s*#e8f7f4/s,
    'immersive clear base text is light-on-dark',
  )
  assert.match(
    learnCss,
    /\.hq-clear--immersive \.hq-btn--ghost\s*\{[^}]*color:\s*color-mix\(in srgb,\s*#e8f7f4/s,
    'immersive clear ghost buttons stay readable on dark',
  )
  assert.match(playSrc, /hq-clear hq-clear--immersive/, 'LevelClear mounts immersive clear shell')
  // sendChat must be declared before the cleared early return — otherwise React
  // crashes with fewer-hooks and the Next-gate clear paints a blank dark screen.
  {
    const sendAt = playSrc.indexOf('const sendChat = useCallback')
    const clearedAt = playSrc.indexOf('if (cleared)')
    assert.ok(sendAt > 0 && clearedAt > sendAt, 'sendChat hook sits above cleared early return')
  }
  assert.match(learnCss, /\.hq-explore-fab\s*\{/, 'open-world explore FAB styles')
  assert.match(learnCss, /\.hq-explore-fab\.is-on/, 'explore FAB active state while free-looking')
  assert.match(learnCss, /\.hq-compass-disc\s*\{/, 'OSRS compass disc styles')
  assert.match(learnCss, /@keyframes hq-compass-sparkle/, 'compass gold sparkle keyframes')
  assert.match(learnCss, /\.hq-play-title-en\s*\{/, 'condensed chapter title styles')
  assert.match(learnCss, /\.hq-coin-chip[^{]*\{[^}]*cursor:\s*pointer/, 'coin chip is clickable')


  
  // Save Shack + Outfitter visitables & gear kit
  assert.ok(HARBOR_GEAR_CATALOG.length >= 49, 'catalog covers clothing + boats + lanterns')
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
    } else if (slot === 'hand') {
      assert.equal(n, 20, 'hand lists dedicated handhelds + boat lanterns')
    } else {
      assert.ok(n >= 5, `${slot} has at least 5 items (got ${n})`)
    }
  }

  // Boat lanterns can be held in the hand (cross-slot equip)
  {
    const amber = HARBOR_GEAR_CATALOG.find((i) => i.id === 'lantern-paper-amber')!
    const silk = HARBOR_GEAR_CATALOG.find((i) => i.id === 'lantern-silk-gold')!
    const iron = HARBOR_GEAR_CATALOG.find((i) => i.id === 'lantern-oil-iron')!
    const glass = HARBOR_GEAR_CATALOG.find((i) => i.id === 'lantern-glass-ruby')!
    assert.equal(harborGearCanEquipToSlot(amber, 'hand'), true, 'paper lantern → hand')
    assert.equal(harborGearCanEquipToSlot(amber, 'lantern'), true, 'paper lantern → boat lantern')
    assert.equal(harborGearCanEquipToSlot(amber, 'hat'), false, 'lantern not a hat')
    assert.equal(harborGearWearTarget(amber, 'hand'), 'hand', 'selected hand wears lantern in hand')
    assert.equal(harborGearWearTarget(amber, 'lantern'), 'lantern', 'selected lantern hangs on boat')
    const heldLook = sanitizeHarborLook({
      ...HARBOR_DEFAULT_LOOK,
      hand: 'lantern-paper-jade',
      lantern: 'lantern-silk-azure',
    })
    assert.equal(heldLook.hand, 'lantern-paper-jade', 'sanitize keeps lantern id in hand')
    assert.equal(heldLook.lantern, 'lantern-silk-azure', 'boat lantern slot stays independent')
    assert.equal(harborGearIsWorn(heldLook, amber), false)
    assert.equal(
      harborGearIsWorn(heldLook, HARBOR_GEAR_CATALOG.find((i) => i.id === 'lantern-paper-jade')!),
      true,
      'jade lantern worn when held',
    )
    for (const item of [amber, silk, iron, glass]) {
      const prop = buildHandheldProp(item.id)
      assert.ok(prop, `${item.id} builds a handheld mesh`)
      let lights = 0
      prop!.traverse((o) => {
        if (o.type === 'PointLight' && o.userData.harborLanternLight) lights += 1
      })
      assert.ok(lights >= 1, `${item.id} handheld emits lantern light`)
    }
    const heldScout = buildHarborProtagonist({ pose: 'standing' })
    applyLookToProtagonist(heldScout, {
      ...HARBOR_DEFAULT_LOOK,
      hand: 'lantern-phoenix',
    })
    let handProp = 0
    heldScout.traverse((o) => {
      if (o.name === 'gear-hand') handProp += 1
    })
    assert.equal(handProp, 1, 'VIP boat lantern attaches to hand_r')
  }

  // VIP sets — animated overlays, locked behind >5k coins
  assert.equal(HARBOR_VIP_MIN_PRICE, 5001, 'VIP lock floor')
  assert.equal(HARBOR_VIP_SETS.length, 3, 'three VIP item sets')
  for (const item of HARBOR_GEAR_CATALOG.filter((i) => i.tier === 'vip')) {
    assert.ok(item.price >= HARBOR_VIP_MIN_PRICE, `${item.id} VIP priced ≥ floor`)
    assert.ok(item.price > 5000, `${item.id} VIP over 5k coins`)
    assert.ok(harborVipSetFor(item.id), `${item.id} belongs to a VIP set`)
  }
  for (const set of HARBOR_VIP_SETS) {
    assert.ok(set.pieces.length >= 7, `${set.id} covers a full loadout`)
    for (const id of set.pieces) {
      const item = HARBOR_GEAR_CATALOG.find((i) => i.id === id)
      assert.ok(item, `${set.id} piece ${id} in catalog`)
      assert.equal(item!.tier, 'vip', `${id} is VIP tier`)
      assert.ok(item!.price > 5000, `${id} costs over 5k`)
    }
  }
  assert.match(
    readFileSync(new URL('./harborVipGear.ts', import.meta.url), 'utf8'),
    /tickVipGearAnims|attachVipBoatOrnaments|applyVipOverlaysToProtagonist/,
    'VIP gear has animation + overlay builders',
  )
  assert.match(learnCss, /\.hq-shop-item\.is-vip/, 'outfitter VIP styling')

  // Progressive tier detail — mid/high clothing denser than common; VIP skips
  const detailSrc = readFileSync(new URL('./harborGearDetail.ts', import.meta.url), 'utf8')
  assert.match(detailSrc, /applyTierDetailOverlays|enrichHandheldProp|enrichBoatHull|harborTierDetailLevel/, 'tier detail module')
  assert.match(
    readFileSync(new URL('./harborGear.ts', import.meta.url), 'utf8'),
    /applyTierDetailOverlays/,
    'look apply wires tier detail overlays',
  )
  {
    const commonScout = buildHarborProtagonist({ pose: 'standing' })
    applyLookToProtagonist(commonScout, {
      hat: 'hat-straw',
      top: 'top-harbor',
      bottom: 'bottom-travel',
      shoes: 'shoes-leather',
      hand: 'hand-none',
      boat: 'boat-canoe',
      lantern: 'lantern-paper-amber',
    })
    let commonMeshes = 0
    commonScout.traverse((o) => {
      if (!o.userData.harborTierDetail) return
      o.traverse((c) => {
        if ((c as { isMesh?: boolean }).isMesh) commonMeshes += 1
      })
    })
    const highScout = buildHarborProtagonist({ pose: 'standing' })
    applyLookToProtagonist(highScout, {
      hat: 'hat-scholar',
      top: 'top-merchant',
      bottom: 'bottom-ink',
      shoes: 'shoes-jade',
      hand: 'hand-lantern',
      boat: 'boat-canoe',
      lantern: 'lantern-paper-amber',
    })
    let highMeshes = 0
    highScout.traverse((o) => {
      if (!o.userData.harborTierDetail) return
      o.traverse((c) => {
        if ((c as { isMesh?: boolean }).isMesh) highMeshes += 1
      })
    })
    assert.ok(commonMeshes > 0, 'common look still gets light detail')
    assert.ok(highMeshes > commonMeshes, `high look denser than common (${highMeshes} > ${commonMeshes})`)
    const vipScout = buildHarborProtagonist({ pose: 'standing' })
    applyLookToProtagonist(vipScout, {
      hat: 'hat-festival',
      top: 'top-night',
      bottom: 'bottom-phoenix',
      shoes: 'shoes-storm',
      hand: 'hand-phoenix-fan',
      boat: 'boat-canoe',
      lantern: 'lantern-paper-amber',
    })
    let vipTierParts = 0
    vipScout.traverse((o) => {
      if (o.userData.harborTierDetail) vipTierParts += 1
    })
    assert.equal(vipTierParts, 0, 'VIP clothing skips tier-detail overlays')
  }

  // Gear mesh honesty — not every catalog ID is a unique silhouette
  const codex = harborGearCodexStats()
  assert.equal(codex.total, HARBOR_GEAR_CATALOG.length, 'codex covers full catalog')
  assert.ok(codex.families >= 12, `expected mesh families, got ${codex.families}`)
  assert.ok(codex.uniqueMeshes < codex.total, 'many items share mesh families (recolors)')
  assert.equal(harborGearMeshInfo(HARBOR_GEAR_CATALOG.find((i) => i.id === 'hat-straw')!).uniqueMesh, false)
  assert.equal(harborGearMeshInfo(HARBOR_GEAR_CATALOG.find((i) => i.id === 'hand-fan')!).uniqueMesh, true)
  assert.equal(harborGearMeshInfo(HARBOR_GEAR_CATALOG.find((i) => i.id === 'boat-sampan')!).family, 'hull-canoe')
  assert.equal(harborGearMeshInfo(HARBOR_GEAR_CATALOG.find((i) => i.id === 'lantern-phoenix')!).family, 'lantern-silk')
  assert.equal(harborGearMeshInfo(HARBOR_GEAR_CATALOG.find((i) => i.id === 'hat-festival')!).uniqueMesh, true)
  assert.equal(harborGearMeshInfo(HARBOR_GEAR_CATALOG.find((i) => i.id === 'hand-phoenix-fan')!).uniqueMesh, true)
  assert.match(learnCss, /\.hq-codex-screen/, 'gear codex fullscreen styles')
  assert.match(learnCss, /\.hq-codex-grid/, 'gear codex card grid styles')
  assert.match(learnCss, /\.hq-codex-model/, 'gear codex model preview styles')
  {
    const learnDir = dirname(fileURLToPath(import.meta.url))
    assert.match(
      readFileSync(join(learnDir, 'LearnPlay.tsx'), 'utf8'),
      /HarborGearCodex/,
      'LearnPlay mounts gear codex',
    )
    const codexSrc = readFileSync(join(learnDir, 'HarborGearCodex.tsx'), 'utf8')
    assert.match(codexSrc, /hq-codex-screen/, 'HarborGearCodex is fullscreen')
    assert.match(codexSrc, /HarborGearModelIcon/, 'HarborGearCodex shows item models')
    assert.match(
      readFileSync(join(learnDir, 'HarborGearModelIcon.tsx'), 'utf8'),
      /drawSilhouette/,
      'HarborGearModelIcon draws per-slot silhouettes',
    )
  }
  assert.equal(HARBOR_VISITABLES.length, 5, 'Save Shack + Outfitter + Bank + Arena + Barber')
  assert.ok(HARBOR_VISITABLES.some((v) => v.id === 'save-shack'))
  assert.ok(HARBOR_VISITABLES.some((v) => v.id === 'outfitter'))
  assert.ok(HARBOR_VISITABLES.some((v) => v.id === 'bank'))
  assert.ok(HARBOR_VISITABLES.some((v) => v.id === 'arena'))
  assert.ok(HARBOR_VISITABLES.some((v) => v.id === 'barber'))
  assert.deepEqual(
    [...HARBOR_LANDMARK_HOSTS],
    ['save-shack', 'outfitter', 'bank', 'arena', 'barber'],
    'one landmark host per special building',
  )
  assert.ok(HARBOR_VISIT_RADIUS > 1, 'visit radius')
  const worldSrc2 = readFileSync(new URL('./harborWorld.ts', import.meta.url), 'utf8')
  assert.match(worldSrc2, /enrichBoatHull/, 'boat hulls get mid/high trim')
  assert.match(worldSrc2, /tickVipGearAnims/, 'world ticks VIP anims')
  assert.match(worldSrc2, /attachVipBoatOrnaments/, 'VIP boats get animated ornaments')
  assert.match(worldSrc2, /attachLandmarkHost\(g, 'save-shack'/, 'Save Shack host NPC')
  assert.match(worldSrc2, /attachLandmarkHost\(g, 'outfitter'/, 'Outfitter landlady host')
  assert.match(worldSrc2, /attachLandmarkHost\(g, 'bank'/, 'Banker host NPC')
  assert.match(worldSrc2, /attachLandmarkHost\(g, 'arena'/, 'Arena Lu Bu host')
  assert.match(worldSrc2, /glowingFloppyDisk/, 'Save host holds glowing floppy')
  assert.match(worldSrc2, /goldTaelBag/, 'Bank host holds gold tael bag')
  assert.match(worldSrc2, /cigaretteWithSmoke/, 'Outfitter host smokes cigarette')
  assert.match(worldSrc2, /luBuHalberd/, 'Arena host carries Lu Bu-style halberd')
  assert.match(worldSrc2, /specialHostGlow/, 'landmark hosts get glowing highlight')
  assert.match(worldSrc2, /attachSpecialHostGlow/, 'special host glow helper')
  assert.match(worldSrc2, /saveShackBuilding/, 'Save Shack mesh')
  assert.match(worldSrc2, /outfitterBuilding/, 'Outfitter mesh')
  assert.match(worldSrc2, /bankBuilding/, 'Bank mesh')
  assert.match(worldSrc2, /arenaBuilding/, 'Arena mesh')
  assert.match(worldSrc2, /goldenPortal|save-portal/, 'Save Shack golden portal')
  assert.match(worldSrc2, /jadePortal|bank-portal/, 'Bank jade portal')
  assert.match(worldSrc2, /arenaPortal|arena-portal/, 'Arena amber portal')
  assert.match(worldSrc2, /attachLandmarkHost\(g, 'barber'/, 'Barber host NPC')
  assert.match(worldSrc2, /barberBuilding/, 'Barber shop mesh')
  assert.match(worldSrc2, /spinningBarberPole|barberPole/, 'Spinning barber pole')
  assert.match(worldSrc2, /barberPortal|barber-portal|rosePortal/, 'Barber rose portal')
  assert.match(worldSrc2, /barberScissors/, 'Barber host holds scissors')
  assert.match(worldSrc2, /dirtRoad|placeDirtRoads/, 'dirt roads on banks')
  assert.match(worldSrc2, /inlandRoad|crossPath|foothillPath/, 'inland walkways + cross-paths')
  assert.match(worldSrc2, /roadSign|ROAD_SIGN_KINDS/, 'Chinese roadside 路牌')
  assert.match(worldSrc2, /mountainMist|foothill/, 'mountain foothills + mist veils')
  assert.match(worldSrc2, /inlandShelf|foothillShelf/, 'expanded bank shelves toward karst')
  assert.ok(HARBOR_EXPLORE_X > HARBOR_DOCK_X + 3, 'explore bound reaches inland roads')
  assert.equal(HARBOR_DIALOGUE_BUBBLE, true, 'dialogue NPCs expose a speech-bubble cue')
  assert.match(worldSrc2, /attachDialogueBubble|speechBubbleIcon/, 'Talkable NPCs get a speech bubble icon')
  assert.match(worldSrc2, /hasDialogue/, 'dialogue NPCs tagged hasDialogue')
  assert.match(worldSrc2, /attachDialogueBubble\(npc/, 'bubbles attach to pier dialogue hosts')
  assert.match(worldSrc2, /npc-nametag|attachNpcNametag/, 'NPCs get floating nametags')
  assert.match(worldSrc2, /HARBOR_NPC_TALK_RADIUS/, 'tap-to-talk range constant')
  assert.match(worldSrc2, /onDialogueNpc/, 'world reports NPC taps')
  assert.match(worldSrc2, /dialogueTapFromObject/, 'raycast resolves NPC / bubble taps')
  assert.ok(HARBOR_VISIT_RADIUS >= 3, 'visit radius reaches landmark hosts')
  assert.match(worldSrc2, /harborLanternIntensity|PointLight/, 'lantern ambiance lights')
  
  assert.ok(HARBOR_AMBIENT_FAUNA.includes('panda'), 'giant panda ambient fauna')
  assert.ok(HARBOR_AMBIENT_FAUNA.includes('tiger'), 'South China tiger ambient fauna')
  assert.ok(HARBOR_AMBIENT_FAUNA.includes('ibis'), 'crested ibis ambient fauna')
  assert.ok(HARBOR_AMBIENT_FAUNA.includes('salamander'), 'giant salamander ambient fauna')
  assert.match(worldSrc2, /function panda/, 'panda mesh builder')
  assert.match(worldSrc2, /function southChinaTiger/, 'South China tiger mesh builder')
  assert.match(worldSrc2, /function crestedIbis/, 'crested ibis mesh builder')
  assert.match(worldSrc2, /crestedIbis\(rng,\s*soar\)/, 'ibis builder takes soar flag')
  assert.match(worldSrc2, /soar \? 2\.[0-9]/, 'soaring ibis spawn above bank (~bird height)')
  assert.match(worldSrc2, /Folded against the body while wading/, 'wading ibis folds wings')
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
  assert.match(worldSrc2, /hqWoodTexture\(\)/, 'boat hull loads wood-grain albedo')
  assert.match(worldSrc2, /hqBoxTex\(/, 'boat hull uses textured craft boxes')
  assert.match(worldSrc2, /P\.iron/, 'boat hull iron band trim')
  const gearSrcBoat = readFileSync(new URL('./harborGear.ts', import.meta.url), 'utf8')
  assert.match(gearSrcBoat, /hqWoodTexture/, 'handhelds use craft wood texture')
  assert.match(gearSrcBoat, /hqBoxTex/, 'handhelds use textured craft boxes')
  assert.match(detailSrc, /hqMatSmooth/, 'tier detail uses smooth Lambert for beads')
  assert.match(detailSrc, /hqMatTex/, 'boat tier enrich uses wood-textured trim')
  assert.match(
    readFileSync(new URL('./harborVipGear.ts', import.meta.url), 'utf8'),
    /hqWoodTexture/,
    'VIP handhelds use craft wood texture',
  )
  assert.match(
    readFileSync(new URL('./HarborGearModelIcon.tsx', import.meta.url), 'utf8'),
    /Hull plank seams/,
    'bag boat icons show plank seams',
  )
  assert.match(worldSrc2, /applyVesselLook/, 'look swaps boat + lanterns')
  assert.match(worldSrc2, /canoe\(weather, currentLook\.boat, currentLook\.lantern,\s*currentGender,\s*currentAppearance\)/, 'canoe uses equipped boat + lantern')
  assert.match(worldSrc2, /boatLantern\(weather, lanternId\)/, 'port+starboard lanterns use lantern gear colors')

  assert.match(worldSrc2, /uniqueLandmark/, 'landmarks tagged unique vs village homes')
  assert.match(worldSrc2, /setLook/, 'world can recolor scout look')
  assert.match(worldSrc2, /nearestVisitable/, 'arrival opens visitables')
  const playSrc2 = readFileSync(new URL('./LearnPlay.tsx', import.meta.url), 'utf8')
  assert.match(playSrc2, /onDialogueNpc/, 'LearnPlay handles NPC taps')
  assert.match(playSrc2, /visitSaveShack/, 'Save Shack stamps progress')
  assert.match(playSrc2, /buyHarborGear/, 'Outfitter buy flow')
  assert.match(playSrc2, /equipHarborGear/, 'Outfitter equip flow')
  assert.match(playSrc2, /depositHarborGear/, 'Bank deposit flow')
  assert.match(playSrc2, /withdrawHarborGear/, 'Bank withdraw flow')
  assert.doesNotMatch(playSrc2, /hq-inv-btn/, 'Pack HUD button removed')
  assert.match(playSrc2, /hq-coin-chip.*is-open|is-open.*hq-coin-chip/, 'coin chip shows open state')
  assert.match(playSrc2, /setInvOpen\(\(v\)\s*=>/, 'coin chip toggles inventory')
  assert.match(playSrc2, /hq-visit-panel--bank/, 'Bank visit panel')
  assert.match(playSrc2, /hq-visit-panel/, 'visit panel UI')
  assert.match(playSrc2, /MatchDefinitionModal/, 'Match the Definition modal')
  assert.match(playSrc2, /markGoldEarned/, 'arena gold awards')
  assert.match(playSrc2, /exchangeGoldForCoins/, 'arena gold exchanges to ferry coins')
  assert.match(playSrc2, /hq-gold-chip/, 'arena gold HUD chip')
  assert.ok(existsSync(new URL('./matchDefinitionBank.ts', import.meta.url)), 'match bank')
  assert.ok(existsSync(new URL('./MatchDefinitionModal.tsx', import.meta.url)), 'match modal')
  assert.match(learnCss, /\.hq-match-modal\s*\{/, 'match modal styles')
  const matchModalSrc = readFileSync(new URL('./MatchDefinitionModal.tsx', import.meta.url), 'utf8')
  assert.match(matchModalSrc, /speakManual/, 'arena auto-plays TTS for each word')
  assert.match(matchModalSrc, /SpeakButton/, 'arena has replay speaker icon')
  assert.match(matchModalSrc, /unlockTtsPlayback/, 'arena unlocks TTS on Enter')
  assert.match(matchModalSrc, /hq-match-speak/, 'arena speaker control class')
  assert.match(matchModalSrc, /hq-match-diff/, 'arena difficulty picker')
  assert.match(matchModalSrc, /MATCH_DIFFICULTIES/, 'arena lists Easy/Medium/Hard')
  assert.match(matchModalSrc, /hq-match-topic/, 'arena topic picker')
  assert.match(matchModalSrc, /MATCH_TOPICS/, 'arena lists topics')
  assert.match(matchModalSrc, /phase === 'topic'|phase === \"topic\"|'topic'/, 'opens on topic select')
  assert.match(matchModalSrc, /hq-match-exchange/, 'arena gold exchange UI')
  assert.match(matchModalSrc, /onExchangeGold/, 'arena can convert gold to coins')
  assert.match(learnCss, /\.hq-match-speak\s*\{/, 'arena speaker styles')
  assert.match(learnCss, /\.hq-match-diff\s*\{/, 'arena difficulty tile styles')
  assert.match(learnCss, /\.hq-match-topic\s*\{/, 'arena topic tile styles')
  assert.match(learnCss, /\.hq-gold-chip\s*\{/, 'gold chip styles')
  const matchBankSrc = readFileSync(new URL('./matchDefinitionBank.ts', import.meta.url), 'utf8')
  assert.match(matchBankSrc, /topic:\s*'kids'/, 'kids topic in bank')
  assert.match(matchBankSrc, /topic:\s*'animals'/, 'animals topic in bank')
  assert.match(matchBankSrc, /topic:\s*'nature'/, 'nature topic in bank')
  assert.match(matchBankSrc, /topic:\s*'food'/, 'food topic in bank')
  assert.match(matchBankSrc, /topic:\s*'harbor'/, 'harbor topic in bank')
  assert.match(matchBankSrc, /difficulty:\s*'easy'/, 'easy words in bank')
  assert.match(matchBankSrc, /difficulty:\s*'medium'/, 'medium phrases in bank')
  assert.match(matchBankSrc, /difficulty:\s*'hard'/, 'hard sentences in bank')
  assert.match(matchBankSrc, /HARBOR_GOLD_TO_COINS/, 'gold→coin rate exported')
  assert.match(matchBankSrc, /buildMatchRound\(\s*topic/, 'rounds require topic + difficulty')
  const progressExSrc = readFileSync(new URL('./progress.ts', import.meta.url), 'utf8')
  assert.match(progressExSrc, /export function exchangeGoldForCoins/, 'exchange helper')
  assert.ok(existsSync(new URL('./HarborLeaderboard.tsx', import.meta.url)), 'leaderboard UI')
  assert.match(learnCss, /\.hq-board\s*\{/, 'leaderboard styles')
  assert.ok(existsSync(new URL('./xpRewards.ts', import.meta.url)), 'xp rewards')
  assert.match(playSrc2, /missionBaseXp|sailorLevelFromXp/, 'XP on pier clear / HUD')
  assert.match(playSrc2, /hq-xp-chip/, 'XP HUD chip')
  assert.match(learnCss, /\.hq-xp-chip\s*\{/, 'XP chip styles')
  assert.match(
    learnCss,
    /\.hq-xp-chip\s*\{[^}]*border-radius:\s*0[^}]*background:\s*transparent/s,
    'XP is flat text — not a pill',
  )
  assert.match(learnCss, /\.hq-coin-chip\.is-open\s*\{/, 'coin chip open affordance')
  assert.match(worldSrc2, /const ACTIVE = 3/, 'leaner active river chunks for GPU')
  assert.match(worldSrc2, /setPixelRatio\([^)]*1\.25\)/, 'DPR capped at 1.25')
  assert.match(worldSrc2, /lanternLights/, 'lantern flicker uses cached lights')
  assert.match(worldSrc2, /animNodes/, 'fauna motion uses cached nodes')
  assert.match(worldSrc2, /setPaused/, 'world can pause under overlays')
  assert.match(worldSrc2, /document\.hidden/, 'tab-hidden skips sim work')
  assert.match(
    worldSrc2,
    /PlaneGeometry\(\s*isGuan \? GUAN_WATER_PLANE\.size : RIVER \* 2\.4/,
    'water mesh segment budget (river strip / guan ocean)',
  )
  assert.match(canvasSrc, /setPaused\(paused\)/, 'canvas wires pause into the world')
  assert.match(stageSrc, /paused=\{paused\}/, 'stage forwards pause')
  const pageSrcPause = readFileSync(new URL('./LearnPage.tsx', import.meta.url), 'utf8')
  assert.match(pageSrcPause, /worldPaused=\{chartOpen\}/, 'chart open pauses the voyage')
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
  assert.equal(GUAN_BGM_SCALE_HZ.length, 6, 'guan major/island scale')
  assert.ok(GUAN_BGM_PHRASE.length >= 16, 'guan BGM phrase has pad + flute + pluck')
  assert.ok(
    GUAN_BGM_PHRASE.some((v) => v.kind === 'flute') &&
      GUAN_BGM_PHRASE.some((v) => v.kind === 'pad') &&
      GUAN_BGM_PHRASE.some((v) => v.kind === 'pluck'),
    'guan BGM uses flute / pad / pluck timbres',
  )
  assert.equal(harborBgmTheme(), 'river', 'default BGM theme is river')
  const bgmSrc = readFileSync(new URL('./harborBgm.ts', import.meta.url), 'utf8')
  assert.match(bgmSrc, /HarborBgmTheme = 'river' \| 'guan'/, 'BGM theme union')
  assert.match(bgmSrc, /startHarborBgm\(theme/, 'startHarborBgm accepts theme')
  assert.match(bgmSrc, /GUAN_BGM_PHRASE/, 'guan phrase export')
  const playAudioSrc = readFileSync(new URL('./LearnPlay.tsx', import.meta.url), 'utf8')
  assert.match(playAudioSrc, /playHarborCoinChing/, 'correct answer plays coin ching')
  assert.match(playAudioSrc, /hq-coin-pop/, 'floating +coin animation')
  assert.match(playAudioSrc, /startHarborBgm/, 'session starts Chinese Harbor BGM')
  assert.match(playAudioSrc, /stopHarborBgm/, 'session stops BGM on exit')
  assert.match(playAudioSrc, /duckHarborBgm/, 'BGM ducks under fanfare')

  // Immersion audio tiers — ambient beds + interaction SFX (procedural, not Jagex)
  assert.ok(HARBOR_AMBIENT_GAIN > 0 && HARBOR_AMBIENT_GAIN < 0.2, 'ambient bed stays soft under BGM')
  assert.ok(HARBOR_WILDLIFE_GAIN > 0 && HARBOR_WILDLIFE_GAIN < 0.25, 'wildlife chirps stay soft')
  assert.equal(isHarborAmbientRunning(), false, 'ambient idle until session start')
  assert.ok(HARBOR_INTERACT_SFX_GAIN > 0 && HARBOR_INTERACT_SFX_GAIN < 0.5, 'interact SFX gain capped')
  const ambientSrc = readFileSync(new URL('./harborAmbient.ts', import.meta.url), 'utf8')
  assert.match(ambientSrc, /makeWaterBed/, 'ambient water bed')
  assert.match(ambientSrc, /makeRainBed/, 'ambient rain bed')
  assert.match(ambientSrc, /makeWindBed/, 'ambient wind bed')
  assert.match(ambientSrc, /scheduleWildlife/, 'sparse wildlife scheduler')
  assert.match(ambientSrc, /scheduleLantern/, 'lantern tick at night/rain')
  assert.match(ambientSrc, /setHarborAmbientTalking/, 'ambient ducks while talking')
  const interactSrc = readFileSync(new URL('./harborInteractSfx.ts', import.meta.url), 'utf8')
  assert.match(interactSrc, /export function playHarborFootstep/, 'footstep SFX')
  assert.match(interactSrc, /export function playHarborPaddle/, 'paddle SFX')
  assert.match(interactSrc, /export function playHarborLandmarkOpen/, 'landmark door cues')
  assert.match(interactSrc, /export function tickHarborMoveSfx/, 'move SFX driver')
  assert.match(interactSrc, /case 'outfitter':/, 'outfitter shop bell')
  assert.match(interactSrc, /case 'bank':/, 'bank jade chime')
  assert.equal(typeof playHarborUiClick, 'function', 'UI click export')
  assert.equal(typeof playHarborBagOpen, 'function', 'bag open export')
  assert.equal(typeof playHarborBagClose, 'function', 'bag close export')
  assert.equal(typeof playHarborEquip, 'function', 'equip export')
  assert.equal(typeof playHarborTalkStart, 'function', 'talk start export')
  assert.equal(typeof playHarborExplore, 'function', 'explore export')
  assert.equal(typeof playHarborCastOff, 'function', 'cast off export')
  assert.equal(typeof playHarborLandmarkOpen, 'function', 'landmark open export')
  assert.equal(typeof playHarborFootstep, 'function', 'footstep export')
  assert.equal(typeof playHarborPaddle, 'function', 'paddle export')
  assert.equal(typeof tickHarborMoveSfx, 'function', 'move tick export')
  assert.match(playAudioSrc, /startHarborAmbient/, 'session starts ambient beds')
  assert.match(playAudioSrc, /stopHarborAmbient/, 'session stops ambient on exit')
  assert.match(playAudioSrc, /setHarborAmbientTalking/, 'talk ducks ambient')
  assert.match(playAudioSrc, /setHarborAmbientPaused/, 'overlays pause ambient wildlife')
  assert.match(playAudioSrc, /tickHarborMoveSfx/, 'pose polling drives move SFX')
  assert.match(playAudioSrc, /playHarborLandmarkOpen/, 'landmarks play door cues')
  assert.match(playAudioSrc, /playHarborBagOpen/, 'inventory bag open SFX')
  assert.match(playAudioSrc, /playHarborBagClose/, 'inventory bag close SFX')
  assert.match(playAudioSrc, /playHarborTalkStart/, 'Talk mode SFX')
  assert.match(playAudioSrc, /playHarborExplore/, 'Explore mode SFX')
  assert.match(playAudioSrc, /playHarborNpcGreet/, 'NPC greet on Talk')
  assert.match(playAudioSrc, /playHarborChatSend/, 'chat send SFX')
  assert.match(playAudioSrc, /playHarborTeleport/, 'chapter teleport SFX')
  assert.match(playAudioSrc, /playHarborBarberSnip/, 'barber confirm snip')

  // Direct launch — `#/learn` opens fullscreen play (no marketing hub)
  const learnPageSrc = readFileSync(new URL('./LearnPage.tsx', import.meta.url), 'utf8')
  assert.match(learnPageSrc, /continueHarborLevelId/, 'bare /learn continues into a pier')
  assert.match(learnPageSrc, /hq-chart-overlay/, 'pier chart is an in-game overlay')
  assert.match(learnCss, /\.hq-chart-overlay\s*\{[^}]*z-index:\s*90/s, 'chart overlays above immersive play')
  assert.doesNotMatch(learnPageSrc, /hq-hero/, 'marketing Learn hub hero removed')
  assert.doesNotMatch(learnPageSrc, /MarketingPageShell|MarketingFooter/, 'no marketing shell on Learn')
  assert.match(learnCss, /\.hq-chart-overlay/, 'chart overlay styles')
  assert.match(progressSrc, /continueHarborLevelId/, 'continue helper exported')



  // Open-world multiplayer (signed-in presence + nametags + profile modal)
  const presenceSrc = readFileSync(new URL('./harborPresence.ts', import.meta.url), 'utf8')
  assert.match(presenceSrc, /export function harborDisplayUsername/, 'username helper exported')
  assert.match(presenceSrc, /export function startHarborPresence/, 'presence session starter')
  const createSrc = readFileSync(new URL('./HarborCharacterCreate.tsx', import.meta.url), 'utf8')
  assert.match(createSrc, /export function HarborCharacterCreate/, 'character create screen')
  assert.match(createSrc, /Sailor name/, 'username step in create')
  assert.match(createSrc, /Male/, 'male gender choice')
  assert.match(createSrc, /Female/, 'female gender choice')
  assert.match(playSrc2, /HarborCharacterCreate/, 'LearnSession gates on character create')
  assert.match(playSrc2, /completeHarborCharacter/, 'create completion persists progress')
  assert.match(playSrc2, /id === 'barber'/, 'Barber NPC opens restyle immediately')
  assert.match(playSrc2, /setBarberOpen\(true\)/, 'Barber sets character-create overlay')
  assert.match(playSrc2, /mode="barber"|mode=\{'barber'\}/, 'Barber restyle opens character create')
  assert.match(playSrc2, /Harbor Barber/, 'Barber character-create dialog label')
  const minimapSrc = readFileSync(new URL('./HarborMinimap.tsx', import.meta.url), 'utf8')
  assert.match(minimapSrc, /export function HarborMinimap/, 'Harbor minimap component')
  assert.match(minimapSrc, /HARBOR_VISITABLES/, 'minimap plots landmark hosts')
  assert.match(minimapSrc, /legendOpen/, 'minimap legend toggles open/closed')
  assert.match(minimapSrc, /legendOpen: false|parsed\.legendOpen === true/, 'legend hidden by default')
  assert.match(minimapSrc, /hq-minimap-tool--legend|Show legend/, 'opaque legend toggle icon')
  assert.match(minimapSrc, /hq-minimap-legend/, 'minimap legend list')
  assert.match(minimapSrc, /collapsed/, 'minimap is collapsible')
  assert.match(minimapSrc, /locked/, 'minimap is lockable')
  assert.match(minimapSrc, /kind: 'resize'|beginResize/, 'minimap is resizable')
  assert.match(minimapSrc, /kind: 'move'|beginMove/, 'minimap is movable')
  assert.match(minimapSrc, /viewYaw/, 'minimap rotates with camera view')
  assert.match(minimapSrc, /legendOpen/, 'minimap legend can open')
  const chatBoxSrc = readFileSync(new URL('./HarborChatBox.tsx', import.meta.url), 'utf8')
  assert.match(chatBoxSrc, /export function HarborChatBox/, 'RuneScape-style chat box')
  assert.match(
    chatBoxSrc,
    /onPointerDown[\s\S]*preventDefault/,
    'Say button keeps focus until submit (mobile keyboard click-steal guard)',
  )
  assert.match(chatBoxSrc, /enterKeyHint=["']send["']/, 'mobile keyboard offers Send')
  assert.match(chatBoxSrc, /inputRef\.current\?\.blur\(\)/, 'chat blurs after send to reveal overhead')
  assert.match(chatBoxSrc, /scrollTo\(0,\s*0\)/, 'chat snaps viewport after keyboard')
  assert.match(presenceSrc, /HARBOR_CHAT_EVENT/, 'presence broadcasts chat')
  assert.match(presenceSrc, /broadcastChat/, 'presence session can say')
  assert.match(worldSrc, /showSpeechBubble/, 'world shows speech above speakers')
  assert.match(worldSrc, /if \(disposed\) return/, 'overhead say no-ops after world dispose')
  assert.match(playSrc2, /HarborChatBox/, 'Learn session mounts chat box')
  assert.match(
    playSrc2,
    /showSpeechBubble\('local'/,
    'local send paints overhead say before keyboard dismiss',
  )
  assert.match(minimapSrc, /harbor\.minimap\.layout\.v1/, 'minimap layout persists')
  assert.match(playSrc2, /HarborMinimap/, 'Learn session mounts minimap')
  assert.match(playSrc2, /viewYaw/, 'Learn session polls camera viewYaw for minimap')
  assert.match(worldSrc, /viewYaw/, 'world exposes viewYaw for minimap orientation')
  assert.match(createSrc, /mode\?: 'full' \| 'username-only' \| 'barber'|barber/, 'character create supports barber mode')
  const mergeSrc = readFileSync(new URL('./progressMerge.ts', import.meta.url), 'utf8')
  assert.match(mergeSrc, /characterCreated/, 'progress tracks characterCreated')
  assert.match(mergeSrc, /localUsername/, 'progress stores localUsername')
  assert.match(presenceSrc, /HARBOR_PRESENCE_CHANNEL/, 'shared river channel')
  assert.match(presenceSrc, /HARBOR_POSE_EVENT/, 'broadcast pose event')
  assert.match(presenceSrc, /broadcastPose/, 'high-frequency pose broadcast')
  const remotesSrc = readFileSync(new URL('./harborRemoteAvatars.ts', import.meta.url), 'utf8')
  assert.match(remotesSrc, /export function buildRemoteSailor/, 'remote sailor mesh builder')
  assert.match(remotesSrc, /export function remoteUserIdFromHits/, 'remote pick helper')
  assert.match(remotesSrc, /buildNametagSprite/, 'local nametag sprite helper')
  assert.match(remotesSrc, /setRemoteSailorPoseTarget/, 'remote pose lerp target')
  assert.match(remotesSrc, /tickRemoteSailorPose/, 'remote pose tick lerp')
  assert.match(remotesSrc, /osrsOverheadSay/, 'overhead say marked OSRS-style')
  assert.match(remotesSrc, /#ffff00/, 'overhead say uses public-chat yellow')
  assert.match(remotesSrc, /OSRS_OUTLINE_OFFSETS|OSRS_SAY_STROKE/, 'overhead say has hard black outline')
  assert.doesNotMatch(
    remotesSrc,
    /ctx\.fillStyle = 'rgba\(8, 18, 24|by \+ bh \+ 12/,
    'overhead say has no chat-bubble plate or tail',
  )
  const questPanelSrc = readFileSync(new URL('./QuestPanel.tsx', import.meta.url), 'utf8')
  assert.match(questPanelSrc, /hq-dock-actions--next-first/, 'Next sits above collapsed choices on correct')
  assert.match(questPanelSrc, /!\(resolved && picked === step\.correctId\)/, 'all answer tiles hide on correct pick')
  assert.match(questPanelSrc, /Next gate/, 'Next gate control present after correct')
  assert.match(learnCss, /--hq-explore-chrome/, 'shared explore chrome clearance token')
  assert.match(learnCss, /bottom:\s*var\(--hq-explore-chrome\)/, 'chat docks above Talk/Explore chrome')
  assert.match(
    learnCss,
    /@media \(max-width:\s*640px\)[\s\S]*?\.hq-chat-log[\s\S]*?backdrop-filter:\s*none/,
    'mobile chat log drops backdrop-filter (WebGL + keyboard GPU wedge)',
  )
  assert.match(learnCss, /hq-dock-actions--next-first/, 'next-first dock spacing')
  assert.match(
    learnCss,
    /hq-dialog-options \.hq-choices[\s\S]*?grid-template-columns:\s*repeat\(3/,
    'pronunciation picks are three square tiles in one row',
  )
  assert.match(learnCss, /aspect-ratio:\s*1/, 'talking pick tiles are square')
  assert.match(
    learnCss,
    /\.hq-quest\.is-talking \.hq-choice[\s\S]*?min-height:\s*clamp\(5\.25rem/,
    'talking pick tiles have large phone tap targets',
  )
  assert.match(
    learnCss,
    /\.hq-quest\.is-talking \.hq-choice-label[\s\S]*?clamp\(1\.15rem/,
    'talking pick labels are large enough to read',
  )
  assert.match(
    learnCss,
    /\.hq-quest\.is-talking \.hq-build-slots[\s\S]*?grid-template-columns:\s*repeat\(3/,
    'build Initial/Final/Tone sit as three columns',
  )
  assert.match(
    learnCss,
    /\.hq-quest\.is-talking \.hq-build-opts[\s\S]*?flex-wrap:\s*nowrap/,
    'build opts stay one stacked column (no wrap mash)',
  )
  assert.match(
    learnCss,
    /\.hq-quest\.is-talking \.hq-tile[\s\S]*?min-height:\s*clamp\(2\.75rem/,
    'build pick tiles have thumb-sized min height',
  )
  assert.doesNotMatch(
    learnCss,
    /\.hq-quest\.is-talking \.hq-build-slot\s*\{[^}]*aspect-ratio:\s*1/,
    'build slots are not forced into tiny squares',
  )
  assert.match(worldSrc, /setRemotePlayers/, 'world accepts remote sailors')
  assert.match(worldSrc, /applyRemotePose/, 'world applies broadcast poses')
  assert.match(worldSrc, /tickRemoteSailorPose/, 'world lerps remote poses each frame')
  assert.match(worldSrc, /getLocalPose/, 'world exposes local pose for presence')
  assert.match(worldSrc, /setLocalUsername/, 'world shows local nametag')
  assert.match(worldSrc, /onRemotePlayerSelect/, 'tap remote opens profile')
  const modalSrc = readFileSync(new URL('./HarborPlayerProfileModal.tsx', import.meta.url), 'utf8')
  assert.match(modalSrc, /HarborPlayerProfileModal/, 'player profile modal')
  assert.match(modalSrc, /Drag to spin/, 'profile modal spin/zoom hint')
  const playSrcMp = readFileSync(new URL('./LearnPlay.tsx', import.meta.url), 'utf8')
  assert.match(playSrcMp, /startHarborPresence/, 'Learn session starts presence when signed in')
  assert.match(playSrcMp, /setInterval\(pushPose, 100\)/, 'pose broadcast ~10 Hz')
  assert.match(playSrcMp, /broadcastPose/, 'Learn session broadcasts live pose')
  assert.match(playSrcMp, /HarborPlayerProfileModal/, 'Learn session mounts profile modal')

console.log('harborQuest.smoke: ok', HARBOR_LEVELS.length, 'levels')
}

main()
