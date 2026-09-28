/**
 * HarborRPG combat — soft classic depth (GCD abilities + threat).
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
  addRpgInventoryItem,
  harborRpgAttackPower,
  harborRpgDefense,
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
  /** Soft threat table (party + self). */
  threat: HarborRpgThreatEntry[]
}

export type HarborRpgLootDrop = { id: HarborRpgItemId; qty: number }

export type HarborRpgCombatEvent =
  | { type: 'player-hit'; damage: number; monsterId: string; abilityId: HarborRpgAbilityId }
  | { type: 'monster-hit'; damage: number; monsterId: string }
  | {
      type: 'kill'
      monsterId: string
      kind: HarborRpgMonsterKind
      xp: number
      gold: number
      loot: HarborRpgLootDrop[]
      /** When partySize > 1, UI/Realtime should open need/greed instead of auto-loot. */
      contested: boolean
    }
  | { type: 'player-down' }
  | { type: 'ability-gcd'; abilityId: HarborRpgAbilityId }

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
      const rad = pack.kind === 'crypt-boss' ? 2 + rng() * 3 : 6 + rng() * 18
      const x = Math.cos(ang) * rad
      const z = Math.sin(ang) * rad - (pack.kind === 'crypt-boss' ? 4 : 2)
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

function addThreat(
  m: HarborRpgMonsterRuntime,
  userId: string,
  amount: number,
): void {
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

export type HarborRpgCombatTickInput = {
  bag: HarborRpgBag
  monsters: HarborRpgMonsterRuntime[]
  playerX: number
  playerZ: number
  playerHp: number
  /** Local user id for threat table. */
  userId: string
  /** Party size including self — contested loot when > 1. */
  partySize: number
  /** Queued ability this frame (or auto strike). */
  abilityId: HarborRpgAbilityId | null
  attacking: boolean
  dt: number
  now: number
  zone: HarborRpgZoneId
  /** Temporary defense buff remaining (seconds). */
  guardBuffSec: number
  rng?: () => number
}

export type HarborRpgCombatTickResult = {
  monsters: HarborRpgMonsterRuntime[]
  playerHp: number
  bag: HarborRpgBag
  events: HarborRpgCombatEvent[]
  guardBuffSec: number
  gcdRemaining: number
  abilityCds: Partial<Record<HarborRpgAbilityId, number>>
}

const PLAYER_ATTACK_RANGE = 2.2
const MONSTER_ATTACK_RANGE = 1.6
const MONSTER_ATTACK_CD = 1.05
const RESPAWN_MS = 12_000
const INSTANCE_NO_RESPAWN = true

let playerGcd = 0
const abilityCds: Partial<Record<HarborRpgAbilityId, number>> = {
  strike: 0,
  cleave: 0,
  bash: 0,
  guard: 0,
}

export function resetRpgCombatSessionCd() {
  playerGcd = 0
  abilityCds.strike = 0
  abilityCds.cleave = 0
  abilityCds.bash = 0
  abilityCds.guard = 0
}

export function getRpgCombatCds(): {
  gcdRemaining: number
  abilityCds: Partial<Record<HarborRpgAbilityId, number>>
} {
  return { gcdRemaining: playerGcd, abilityCds: { ...abilityCds } }
}

function applyKillRewards(
  bag: HarborRpgBag,
  kind: HarborRpgMonsterKind,
  loot: HarborRpgLootDrop[],
  contested: boolean,
  now: number,
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
  return { bag: next, xp: xpGain, gold: goldGain }
}

export function tickRpgCombat(input: HarborRpgCombatTickInput): HarborRpgCombatTickResult {
  const rng = input.rng ?? Math.random
  const events: HarborRpgCombatEvent[] = []
  let bag = input.bag
  let playerHp = input.playerHp
  let guardBuffSec = Math.max(0, input.guardBuffSec - input.dt)
  const atk = harborRpgAttackPower(bag)
  const def = harborRpgDefense(bag) + (guardBuffSec > 0 ? 4 : 0)
  const companion = rpgHasCompanion(bag, input.now)
  const contested = input.partySize > 1
  const instance = Boolean(HARBOR_RPG_ZONE_META[input.zone].instance)

  playerGcd = Math.max(0, playerGcd - input.dt)
  for (const id of Object.keys(abilityCds) as HarborRpgAbilityId[]) {
    abilityCds[id] = Math.max(0, (abilityCds[id] ?? 0) - input.dt)
  }

  const monsters = input.monsters.map((m) => ({
    ...m,
    threat: m.threat.map((t) => ({ ...t })),
  }))

  // Resolve ability / auto-attack
  let castId: HarborRpgAbilityId | null = null
  if (input.abilityId && playerGcd <= 0 && playerHp > 0) {
    const ab = harborRpgAbilityById(input.abilityId)
    if (ab && (abilityCds[ab.id] ?? 0) <= 0) castId = ab.id
  } else if (input.attacking && playerGcd <= 0 && playerHp > 0) {
    castId = 'strike'
  }

  if (castId) {
    const ab = harborRpgAbilityById(castId)!
    playerGcd = ab.gcd
    abilityCds[castId] = ab.cd
    events.push({ type: 'ability-gcd', abilityId: castId })

    if (castId === 'guard') {
      const buff = 'buffDefSec' in ab ? ab.buffDefSec : 4
      guardBuffSec = Math.max(guardBuffSec, buff ?? 4)
    } else {
      const targets = monsters.filter((m) => {
        if (!m.alive) return false
        const d = Math.hypot(m.x - input.playerX, m.z - input.playerZ)
        const aoe = 'aoe' in ab ? ab.aoe : undefined
        if (aoe) return d <= aoe
        return d <= (ab.range || PLAYER_ATTACK_RANGE)
      })
      // Single-target: nearest only
      let hitList = targets
      const aoe = 'aoe' in ab ? ab.aoe : undefined
      if (!aoe && targets.length > 1) {
        hitList = [
          targets.reduce((best, m) => {
            const bd = Math.hypot(best.x - input.playerX, best.z - input.playerZ)
            const md = Math.hypot(m.x - input.playerX, m.z - input.playerZ)
            return md < bd ? m : best
          }),
        ]
      }
      for (const m of hitList) {
        let dmg = Math.max(1, Math.floor(atk * ab.powerMult) + Math.floor(rng() * 3))
        if (companion) dmg += Math.max(1, Math.floor(atk * 0.35))
        m.hp = Math.max(0, m.hp - dmg)
        m.hitFlash = 0.25
        addThreat(m, input.userId, dmg * ab.threatMult)
        events.push({ type: 'player-hit', damage: dmg, monsterId: m.id, abilityId: castId })
        if (m.hp <= 0) {
          m.alive = false
          m.respawnAt =
            instance && INSTANCE_NO_RESPAWN
              ? Number.POSITIVE_INFINITY
              : input.now + RESPAWN_MS
          const loot = rollLoot(m.kind, rng)
          const rewarded = applyKillRewards(bag, m.kind, loot, contested, input.now)
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
      }
      continue
    }

    const tankId = topThreatUserId(m, input.userId)
    // Soft: only local player is simulated as target (remotes handled by their clients).
    const chasingLocal = tankId === input.userId || m.threat.every((t) => t.userId === input.userId)
    const dx = input.playerX - m.x
    const dz = input.playerZ - m.z
    const dist = Math.hypot(dx, dz)

    if (dist < defM.aggro && playerHp > 0 && chasingLocal) {
      if (dist > MONSTER_ATTACK_RANGE * 0.85) {
        const step = defM.speed * input.dt
        m.x += (dx / dist) * step
        m.z += (dz / dist) * step
      } else if (m.attackCd <= 0) {
        const raw = Math.max(1, defM.atk - Math.floor(def * 0.6))
        const damage = companion ? Math.max(1, Math.floor(raw * 0.7)) : raw
        playerHp = Math.max(0, playerHp - damage)
        m.attackCd = MONSTER_ATTACK_CD
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

/** Award contested loot to the winner after need/greed. */
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
