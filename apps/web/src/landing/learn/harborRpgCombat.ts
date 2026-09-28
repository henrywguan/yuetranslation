/**
 * HarborRPG combat — class skills + legacy kit, GCD, threat, contested loot.
 * Client-authoritative; party/loot hooks for Realtime contested rolls.
 */
import {
  HARBOR_RPG_MONSTER_DEFS,
  HARBOR_RPG_ZONE_META,
  HARBOR_RPG_ZONE_SPAWNS,
  harborRpgAbilityById,
  harborRpgQuestById,
  type HarborRpgAbilityId,
  type HarborRpgItemId,
  type HarborRpgMonsterKind,
  type HarborRpgZoneId,
} from './harborRpgData'
import {
  harborRpgSkillById,
  harborRpgSkillPowerMult,
  type HarborRpgSkillDef,
} from './harborRpgClasses'
import {
  addRpgInventoryItem,
  awardHarborRpgClassKillXp,
  harborRpgActiveSkillRank,
  harborRpgAttackPower,
  harborRpgCdMultiplier,
  harborRpgCritBonus,
  harborRpgDefense,
  harborRpgHitBonus,
  harborRpgMaxHp,
  harborRpgMaxMp,
  rpgCreditMultiplier,
  rpgHasCompanion,
  rpgXpMultiplier,
  type HarborRpgBag,
} from './harborRpgProgress'

export type HarborRpgThreatEntry = { userId: string; threat: number }

export type HarborRpgMonsterRuntime = {
  id: string
  kind: HarborRpgMonsterKind
  x: number
  z: number
  hp: number
  maxHp: number
  homeX: number
  homeZ: number
  attackCd: number
  hitFlash: number
  alive: boolean
  respawnAt: number
  threat: HarborRpgThreatEntry[]
  /** Soft DoT ticks remaining. */
  dotTicks?: number
  dotDmg?: number
  /** Boss phase index (0-based). */
  phase?: number
}

export type HarborRpgLootDrop = { id: HarborRpgItemId; qty: number }

export type HarborRpgCombatEvent =
  | {
      type: 'player-hit'
      damage: number
      monsterId: string
      abilityId: string
      crit?: boolean
    }
  | { type: 'player-miss'; monsterId: string; abilityId: string }
  | { type: 'monster-hit'; damage: number; monsterId: string }
  | { type: 'heal'; amount: number }
  | {
      type: 'kill'
      monsterId: string
      kind: HarborRpgMonsterKind
      xp: number
      gold: number
      loot: HarborRpgLootDrop[]
      contested: boolean
    }
  | { type: 'player-down' }
  | { type: 'ability-gcd'; abilityId: string }
  | { type: 'resource'; mp: number; maxMp: number }
  | {
      type: 'boss-phase'
      monsterId: string
      kind: HarborRpgMonsterKind
      phase: number
      name: { en: string; zh: string }
      toast?: { en: string; zh: string }
    }

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function spawnRpgMonsters(
  zone: HarborRpgZoneId,
  seed: number,
): HarborRpgMonsterRuntime[] {
  const packs = HARBOR_RPG_ZONE_SPAWNS[zone]
  const rng = mulberry32(seed ^ 0x4d4f4e53)
  const out: HarborRpgMonsterRuntime[] = []
  let i = 0
  for (const pack of packs) {
    const def = HARBOR_RPG_MONSTER_DEFS[pack.kind]
    for (let n = 0; n < pack.count; n++) {
      const ang = rng() * Math.PI * 2
      const rad =
        HARBOR_RPG_MONSTER_DEFS[pack.kind].boss ? 2 + rng() * 3 : 6 + rng() * 18
      const x = Math.cos(ang) * rad
      const z = Math.sin(ang) * rad - (HARBOR_RPG_MONSTER_DEFS[pack.kind].boss ? 4 : 2)
      out.push({
        id: `mob-${zone}-${i++}`,
        kind: pack.kind,
        x,
        z,
        hp: def.hp,
        maxHp: def.hp,
        homeX: x,
        homeZ: z,
        attackCd: 0,
        hitFlash: 0,
        alive: true,
        respawnAt: 0,
        threat: [],
        phase: def.boss ? 0 : undefined,
      })
    }
  }
  return out
}

function rollLoot(
  kind: HarborRpgMonsterKind,
  rng: () => number,
): HarborRpgLootDrop[] {
  const def = HARBOR_RPG_MONSTER_DEFS[kind]
  const loot: HarborRpgLootDrop[] = []
  for (const row of def.loot) {
    if (rng() <= row.chance) loot.push({ id: row.item, qty: row.qty })
  }
  return loot
}

function addThreat(m: HarborRpgMonsterRuntime, userId: string, amount: number): void {
  const row = m.threat.find((t) => t.userId === userId)
  if (row) row.threat += amount
  else m.threat.push({ userId, threat: amount })
}

function topThreatUserId(m: HarborRpgMonsterRuntime, fallback: string): string {
  if (m.threat.length === 0) return fallback
  let best = m.threat[0]!
  for (const t of m.threat) {
    if (t.threat > best.threat) best = t
  }
  return best.userId
}

/** Advance boss phases when HP crosses thresholds; returns events. */
function maybeAdvanceBossPhase(
  m: HarborRpgMonsterRuntime,
  events: HarborRpgCombatEvent[],
): void {
  const def = HARBOR_RPG_MONSTER_DEFS[m.kind]
  if (!def.boss || !def.phases || def.phases.length === 0) return
  const ratio = m.hp / Math.max(1, m.maxHp)
  let next = m.phase ?? 0
  for (let i = 0; i < def.phases.length; i++) {
    if (ratio <= def.phases[i]!.atHpPct) next = i
  }
  if (next !== (m.phase ?? 0)) {
    m.phase = next
    const row = def.phases[next]!
    m.hitFlash = 0.45
    events.push({
      type: 'boss-phase',
      monsterId: m.id,
      kind: m.kind,
      phase: next,
      name: row.name,
      toast: row.toast,
    })
  }
}

function bossAtkMult(m: HarborRpgMonsterRuntime): number {
  const def = HARBOR_RPG_MONSTER_DEFS[m.kind]
  if (!def.phases || m.phase == null) return 1
  return def.phases[m.phase]?.atkMult ?? 1
}

function bossSpeedMult(m: HarborRpgMonsterRuntime): number {
  const def = HARBOR_RPG_MONSTER_DEFS[m.kind]
  if (!def.phases || m.phase == null) return 1
  return def.phases[m.phase]?.speedMult ?? 1
}

export type HarborRpgCombatTickInput = {
  bag: HarborRpgBag
  monsters: HarborRpgMonsterRuntime[]
  playerX: number
  playerZ: number
  playerHp: number
  /** Soft class resource (MP / focus / energy / fury / spirit). */
  playerMp: number
  userId: string
  partySize: number
  /** Class skill id or legacy ability id. */
  abilityId: string | null
  attacking: boolean
  dt: number
  now: number
  zone: HarborRpgZoneId
  guardBuffSec: number
  rng?: () => number
}

export type HarborRpgCombatTickResult = {
  monsters: HarborRpgMonsterRuntime[]
  playerHp: number
  playerMp: number
  bag: HarborRpgBag
  events: HarborRpgCombatEvent[]
  guardBuffSec: number
  gcdRemaining: number
  abilityCds: Record<string, number>
}

/** Soft hit / crit tables (client-authoritative). */
export const HARBOR_RPG_BASE_HIT = 0.94
export const HARBOR_RPG_BASE_CRIT = 0.08
export const HARBOR_RPG_CRIT_MULT = 1.75
export const HARBOR_RPG_MP_REGEN_PER_SEC = 4

const PLAYER_ATTACK_RANGE = 2.2
const MONSTER_ATTACK_RANGE = 1.6
const MONSTER_ATTACK_CD = 1.05
const RESPAWN_MS = 12_000
const INSTANCE_NO_RESPAWN = true

let playerGcd = 0
const abilityCds: Record<string, number> = {
  strike: 0,
  cleave: 0,
  bash: 0,
  guard: 0,
}

export function resetRpgCombatSessionCd() {
  playerGcd = 0
  for (const k of Object.keys(abilityCds)) abilityCds[k] = 0
}

export function getRpgCombatCds(): {
  gcdRemaining: number
  abilityCds: Record<string, number>
} {
  return { gcdRemaining: playerGcd, abilityCds: { ...abilityCds } }
}

function applyKillRewards(
  bag: HarborRpgBag,
  kind: HarborRpgMonsterKind,
  loot: HarborRpgLootDrop[],
  contested: boolean,
  now: number,
  skillId: string | null,
): { bag: HarborRpgBag; xp: number; gold: number } {
  const defM = HARBOR_RPG_MONSTER_DEFS[kind]
  const xpGain = defM.xp * rpgXpMultiplier(bag, now)
  const goldGain = defM.gold * rpgCreditMultiplier(bag, now)
  let next = {
    ...bag,
    xp: Math.min(50_000_000, bag.xp + xpGain),
    gold: Math.min(10_000_000, bag.gold + goldGain),
    kills: {
      ...bag.kills,
      [kind]: (bag.kills[kind] ?? 0) + 1,
    },
  }
  if (!contested) {
    for (const drop of loot) {
      next = addRpgInventoryItem(next, drop.id, drop.qty)
    }
  }
  next = {
    ...next,
    quests: next.quests.map((q) => {
      if (q.claimed || q.complete) return q
      const questDef = harborRpgQuestById(q.id)
      if (!questDef || questDef.kind !== 'kill' || questDef.target !== kind) return q
      const progress = Math.min(questDef.need, q.progress + 1)
      return { ...q, progress, complete: progress >= questDef.need }
    }),
  }
  next = awardHarborRpgClassKillXp(next, skillId, xpGain)
  return { bag: next, xp: xpGain, gold: goldGain }
}

type ResolvedCast = {
  id: string
  gcd: number
  cd: number
  range: number
  aoe?: number
  powerMult: number
  threatMult: number
  kind: 'damage' | 'burst' | 'guard' | 'heal' | 'dot'
  defBonus?: number
  seconds?: number
  healMult?: number
  dotTicks?: number
  mpCost: number
  anim?: string
}

function resolveCast(bag: HarborRpgBag, rawId: string | null): ResolvedCast | null {
  if (!rawId) return null
  const classSkill = harborRpgSkillById(rawId)
  if (classSkill) {
    if (bag.classId && classSkill.classId !== bag.classId) return null
    const rank = harborRpgActiveSkillRank(bag, classSkill.id)
    const mult = harborRpgSkillPowerMult(classSkill, rank)
    return skillToCast(classSkill, mult)
  }
  const legacy = harborRpgAbilityById(rawId as HarborRpgAbilityId)
  if (!legacy) return null
  return {
    id: legacy.id,
    gcd: legacy.gcd,
    cd: legacy.cd,
    range: legacy.range || PLAYER_ATTACK_RANGE,
    aoe: 'aoe' in legacy ? legacy.aoe : undefined,
    powerMult: legacy.powerMult,
    threatMult: legacy.threatMult,
    kind: legacy.id === 'guard' ? 'guard' : 'damage',
    defBonus: 'buffDefSec' in legacy ? 4 : undefined,
    seconds: 'buffDefSec' in legacy ? legacy.buffDefSec : undefined,
    mpCost: 0,
    anim: legacy.id === 'guard' ? 'guard' : 'slash',
  }
}

function skillToCast(skill: HarborRpgSkillDef, rankMult: number): ResolvedCast {
  const e = skill.effect
  const mpCost = Math.max(0, Math.floor(skill.mpCost ?? 0))
  const anim = skill.anim
  if (e.kind === 'guard') {
    return {
      id: skill.id,
      gcd: skill.gcd,
      cd: skill.cd,
      range: 0,
      powerMult: 0,
      threatMult: 0,
      kind: 'guard',
      defBonus: e.defBonus,
      seconds: e.seconds,
      mpCost,
      anim: anim ?? 'guard',
    }
  }
  if (e.kind === 'heal') {
    return {
      id: skill.id,
      gcd: skill.gcd,
      cd: skill.cd,
      range: 0,
      powerMult: 0,
      threatMult: 0,
      kind: 'heal',
      healMult: e.mult * rankMult,
      mpCost,
      anim: anim ?? 'heal',
    }
  }
  if (e.kind === 'dot') {
    return {
      id: skill.id,
      gcd: skill.gcd,
      cd: skill.cd,
      range: skill.range || PLAYER_ATTACK_RANGE,
      powerMult: e.mult * rankMult,
      threatMult: 0.8,
      kind: 'dot',
      dotTicks: e.ticks,
      mpCost,
      anim: anim ?? 'dot',
    }
  }
  return {
    id: skill.id,
    gcd: skill.gcd,
    cd: skill.cd,
    range: skill.range || PLAYER_ATTACK_RANGE,
    aoe: e.kind === 'damage' ? e.aoe : undefined,
    powerMult: e.mult * rankMult,
    threatMult: (e.kind === 'damage' || e.kind === 'burst' ? e.threatMult : 1) ?? 1,
    kind: e.kind === 'burst' ? 'burst' : 'damage',
    mpCost,
    anim: anim ?? (e.kind === 'burst' ? 'nova' : 'slash'),
  }
}

function defaultAutoId(bag: HarborRpgBag): string {
  if (bag.classId && bag.skillBar[0]) return bag.skillBar[0]!
  return 'strike'
}

export function tickRpgCombat(input: HarborRpgCombatTickInput): HarborRpgCombatTickResult {
  const rng = input.rng ?? Math.random
  const events: HarborRpgCombatEvent[] = []
  let bag = input.bag
  let playerHp = input.playerHp
  const maxMp = harborRpgMaxMp(bag)
  let playerMp = Math.min(maxMp, Math.max(0, input.playerMp))
  // Soft out-of-combat + in-combat regen
  playerMp = Math.min(maxMp, playerMp + HARBOR_RPG_MP_REGEN_PER_SEC * input.dt)
  let guardBuffSec = Math.max(0, input.guardBuffSec - input.dt)
  const atk = harborRpgAttackPower(bag)
  const def = harborRpgDefense(bag) + (guardBuffSec > 0 ? 4 : 0)
  const companion = rpgHasCompanion(bag, input.now)
  const contested = input.partySize > 1
  const instance = Boolean(HARBOR_RPG_ZONE_META[input.zone].instance)
  const cdMult = harborRpgCdMultiplier(bag)
  const critChance = Math.min(0.35, HARBOR_RPG_BASE_CRIT + harborRpgCritBonus(bag))
  const hitChance = Math.min(0.99, HARBOR_RPG_BASE_HIT + harborRpgHitBonus(bag))

  playerGcd = Math.max(0, playerGcd - input.dt)
  for (const id of Object.keys(abilityCds)) {
    abilityCds[id] = Math.max(0, (abilityCds[id] ?? 0) - input.dt)
  }

  const monsters = input.monsters.map((m) => ({
    ...m,
    threat: m.threat.map((t) => ({ ...t })),
  }))

  // Tick DoTs
  for (const m of monsters) {
    if (!m.alive || !m.dotTicks || m.dotTicks <= 0 || !m.dotDmg) continue
    if (rng() < input.dt / 0.85) {
      m.hp = Math.max(0, m.hp - m.dotDmg)
      m.dotTicks -= 1
      m.hitFlash = 0.15
      events.push({ type: 'player-hit', damage: m.dotDmg, monsterId: m.id, abilityId: 'dot' })
      if (m.hp <= 0) {
        m.alive = false
        m.respawnAt =
          instance && INSTANCE_NO_RESPAWN ? Number.POSITIVE_INFINITY : input.now + RESPAWN_MS
        const loot = rollLoot(m.kind, rng)
        const rewarded = applyKillRewards(bag, m.kind, loot, contested, input.now, null)
        bag = rewarded.bag
        events.push({
          type: 'kill',
          monsterId: m.id,
          kind: m.kind,
          xp: rewarded.xp,
          gold: rewarded.gold,
          loot,
          contested,
        })
      }
    }
  }

  let cast: ResolvedCast | null = null
  if (playerHp > 0 && playerGcd <= 0) {
    if (input.abilityId) {
      const resolved = resolveCast(bag, input.abilityId)
      if (
        resolved &&
        (abilityCds[resolved.id] ?? 0) <= 0 &&
        playerMp >= resolved.mpCost
      ) {
        cast = resolved
      }
    } else if (input.attacking) {
      const auto = resolveCast(bag, defaultAutoId(bag))
      if (auto && playerMp >= auto.mpCost) cast = auto
    }
  }

  if (cast) {
    playerGcd = cast.gcd * cdMult
    abilityCds[cast.id] = cast.cd * cdMult
    if (cast.mpCost > 0) playerMp = Math.max(0, playerMp - cast.mpCost)
    events.push({ type: 'ability-gcd', abilityId: cast.id })
    events.push({ type: 'resource', mp: Math.floor(playerMp), maxMp })

    if (cast.kind === 'guard') {
      guardBuffSec = Math.max(guardBuffSec, cast.seconds ?? 4)
    } else if (cast.kind === 'heal') {
      const amount = Math.max(1, Math.floor(atk * (cast.healMult ?? 0.5) + 8))
      playerHp = Math.min(harborRpgMaxHp(bag), playerHp + amount)
      events.push({ type: 'heal', amount })
      if (
        (bag.classId === 'jadeheart' && cast.id === 'jh-lotus') ||
        (bag.classId === 'mistweaver' && cast.id === 'mw-monsoon')
      ) {
        const near = monsters.filter((m) => {
          if (!m.alive) return false
          return Math.hypot(m.x - input.playerX, m.z - input.playerZ) <= 4
        })
        for (const m of near) {
          const dmg = Math.max(1, Math.floor(atk * 0.55))
          m.hp = Math.max(0, m.hp - dmg)
          m.hitFlash = 0.2
          addThreat(m, input.userId, dmg)
          events.push({ type: 'player-hit', damage: dmg, monsterId: m.id, abilityId: cast.id })
          maybeAdvanceBossPhase(m, events)
        }
      }
    } else {
      const targets = monsters.filter((m) => {
        if (!m.alive) return false
        const d = Math.hypot(m.x - input.playerX, m.z - input.playerZ)
        if (cast!.aoe) return d <= cast!.aoe
        return d <= cast!.range
      })
      let hitList = targets
      if (!cast.aoe && targets.length > 1) {
        hitList = [
          targets.reduce((best, m) => {
            const bd = Math.hypot(best.x - input.playerX, best.z - input.playerZ)
            const md = Math.hypot(m.x - input.playerX, m.z - input.playerZ)
            return md < bd ? m : best
          }),
        ]
      }
      for (const m of hitList) {
        if (rng() > hitChance) {
          events.push({ type: 'player-miss', monsterId: m.id, abilityId: cast.id })
          continue
        }
        if (cast.kind === 'dot') {
          const tick = Math.max(1, Math.floor(atk * cast.powerMult))
          m.dotDmg = tick
          m.dotTicks = cast.dotTicks ?? 3
          m.hitFlash = 0.2
          addThreat(m, input.userId, tick * cast.threatMult)
          events.push({ type: 'player-hit', damage: tick, monsterId: m.id, abilityId: cast.id })
          continue
        }
        let dmg = Math.max(1, Math.floor(atk * cast.powerMult) + Math.floor(rng() * 3))
        if (companion) dmg += Math.max(1, Math.floor(atk * 0.35))
        const crit = rng() < critChance
        if (crit) dmg = Math.max(1, Math.floor(dmg * HARBOR_RPG_CRIT_MULT))
        m.hp = Math.max(0, m.hp - dmg)
        m.hitFlash = crit ? 0.35 : 0.25
        addThreat(m, input.userId, dmg * cast.threatMult)
        events.push({
          type: 'player-hit',
          damage: dmg,
          monsterId: m.id,
          abilityId: cast.id,
          crit,
        })
        maybeAdvanceBossPhase(m, events)
        if (m.hp <= 0) {
          m.alive = false
          m.respawnAt =
            instance && INSTANCE_NO_RESPAWN
              ? Number.POSITIVE_INFINITY
              : input.now + RESPAWN_MS
          const loot = rollLoot(m.kind, rng)
          const rewarded = applyKillRewards(bag, m.kind, loot, contested, input.now, cast.id)
          bag = rewarded.bag
          events.push({
            type: 'kill',
            monsterId: m.id,
            kind: m.kind,
            xp: rewarded.xp,
            gold: rewarded.gold,
            loot,
            contested,
          })
        }
      }
    }
  }

  for (const m of monsters) {
    m.hitFlash = Math.max(0, m.hitFlash - input.dt)
    m.attackCd = Math.max(0, m.attackCd - input.dt)
    const defM = HARBOR_RPG_MONSTER_DEFS[m.kind]

    if (!m.alive) {
      if (
        !(instance && INSTANCE_NO_RESPAWN) &&
        Number.isFinite(m.respawnAt) &&
        input.now >= m.respawnAt
      ) {
        m.alive = true
        m.hp = m.maxHp
        m.x = m.homeX
        m.z = m.homeZ
        m.attackCd = 0.4
        m.threat = []
        m.dotTicks = 0
      }
      continue
    }

    const tankId = topThreatUserId(m, input.userId)
    const chasingLocal = tankId === input.userId || m.threat.every((t) => t.userId === input.userId)
    const dx = input.playerX - m.x
    const dz = input.playerZ - m.z
    const dist = Math.hypot(dx, dz)

    if (dist < defM.aggro && playerHp > 0 && chasingLocal) {
      if (dist > MONSTER_ATTACK_RANGE * 0.85) {
        const step = defM.speed * bossSpeedMult(m) * input.dt
        m.x += (dx / dist) * step
        m.z += (dz / dist) * step
      } else if (m.attackCd <= 0) {
        const raw = Math.max(
          1,
          Math.floor(defM.atk * bossAtkMult(m)) - Math.floor(def * 0.6),
        )
        const damage = companion ? Math.max(1, Math.floor(raw * 0.7)) : raw
        playerHp = Math.max(0, playerHp - damage)
        m.attackCd = MONSTER_ATTACK_CD / Math.max(0.5, bossSpeedMult(m))
        events.push({ type: 'monster-hit', damage, monsterId: m.id })
        if (playerHp <= 0) events.push({ type: 'player-down' })
      }
    } else if (!chasingLocal || dist >= defM.aggro) {
      const hx = m.homeX - m.x
      const hz = m.homeZ - m.z
      const hd = Math.hypot(hx, hz)
      if (hd > 0.4) {
        const step = defM.speed * 0.35 * input.dt
        m.x += (hx / hd) * step
        m.z += (hz / hd) * step
      }
    }
  }

  return {
    monsters,
    playerHp,
    playerMp: Math.floor(playerMp),
    bag,
    events,
    guardBuffSec,
    gcdRemaining: playerGcd,
    abilityCds: { ...abilityCds },
  }
}

export function nearestAliveMonster(
  monsters: HarborRpgMonsterRuntime[],
  x: number,
  z: number,
  maxDist = PLAYER_ATTACK_RANGE,
): HarborRpgMonsterRuntime | null {
  let best: HarborRpgMonsterRuntime | null = null
  let bestD = maxDist
  for (const m of monsters) {
    if (!m.alive) continue
    const d = Math.hypot(m.x - x, m.z - z)
    if (d < bestD) {
      bestD = d
      best = m
    }
  }
  return best
}

export function awardRpgContestedLoot(
  bag: HarborRpgBag,
  loot: HarborRpgLootDrop[],
): HarborRpgBag {
  let next = bag
  for (const drop of loot) {
    next = addRpgInventoryItem(next, drop.id, drop.qty)
  }
  return next
}
