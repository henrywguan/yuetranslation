/**
 * HarborRPG soft combat — client-authoritative.
 * Pure helpers + runtime monster state; world tick drives chase/hits.
 */
import {
  HARBOR_RPG_MONSTER_DEFS,
  HARBOR_RPG_ZONE_SPAWNS,
  harborRpgQuestById,
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
}

export type HarborRpgCombatEvent =
  | { type: 'player-hit'; damage: number; monsterId: string }
  | { type: 'monster-hit'; damage: number; monsterId: string }
  | {
      type: 'kill'
      monsterId: string
      kind: HarborRpgMonsterKind
      xp: number
      gold: number
      loot: { id: HarborRpgItemId; qty: number }[]
    }
  | { type: 'player-down' }

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
      const rad = 6 + rng() * 18
      const x = Math.cos(ang) * rad
      const z = Math.sin(ang) * rad - 2
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
      })
    }
  }
  return out
}

function rollLoot(
  kind: HarborRpgMonsterKind,
  rng: () => number,
): { id: HarborRpgItemId; qty: number }[] {
  const def = HARBOR_RPG_MONSTER_DEFS[kind]
  const loot: { id: HarborRpgItemId; qty: number }[] = []
  for (const row of def.loot) {
    if (rng() <= row.chance) loot.push({ id: row.item, qty: row.qty })
  }
  return loot
}

export type HarborRpgCombatTickInput = {
  bag: HarborRpgBag
  monsters: HarborRpgMonsterRuntime[]
  playerX: number
  playerZ: number
  playerHp: number
  /** Player auto-attacks nearest in range when true (always soft on). */
  attacking: boolean
  dt: number
  now: number
  rng?: () => number
}

export type HarborRpgCombatTickResult = {
  monsters: HarborRpgMonsterRuntime[]
  playerHp: number
  bag: HarborRpgBag
  events: HarborRpgCombatEvent[]
}

const PLAYER_ATTACK_RANGE = 2.1
const PLAYER_ATTACK_CD = 0.55
const MONSTER_ATTACK_RANGE = 1.55
const MONSTER_ATTACK_CD = 1.05
const RESPAWN_MS = 12_000

/** Module-local player attack cooldown (session). */
let playerAttackCd = 0

export function resetRpgCombatSessionCd() {
  playerAttackCd = 0
}

export function tickRpgCombat(input: HarborRpgCombatTickInput): HarborRpgCombatTickResult {
  const rng = input.rng ?? Math.random
  const events: HarborRpgCombatEvent[] = []
  let bag = input.bag
  let playerHp = input.playerHp
  const atk = harborRpgAttackPower(bag)
  const def = harborRpgDefense(bag)
  const companion = rpgHasCompanion(bag, input.now)
  playerAttackCd = Math.max(0, playerAttackCd - input.dt)

  const monsters = input.monsters.map((m) => ({ ...m }))

  for (const m of monsters) {
    m.hitFlash = Math.max(0, m.hitFlash - input.dt)
    m.attackCd = Math.max(0, m.attackCd - input.dt)
    const defM = HARBOR_RPG_MONSTER_DEFS[m.kind]

    if (!m.alive) {
      if (input.now >= m.respawnAt) {
        m.alive = true
        m.hp = m.maxHp
        m.x = m.homeX
        m.z = m.homeZ
        m.attackCd = 0.4
      }
      continue
    }

    const dx = input.playerX - m.x
    const dz = input.playerZ - m.z
    const dist = Math.hypot(dx, dz)

    if (dist < defM.aggro && playerHp > 0) {
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
    } else {
      // Idle wander toward home
      const hx = m.homeX - m.x
      const hz = m.homeZ - m.z
      const hd = Math.hypot(hx, hz)
      if (hd > 0.4) {
        const step = defM.speed * 0.35 * input.dt
        m.x += (hx / hd) * step
        m.z += (hz / hd) * step
      }
    }

    // Player (and companion) strike
    if (
      input.attacking &&
      playerHp > 0 &&
      dist <= PLAYER_ATTACK_RANGE &&
      playerAttackCd <= 0
    ) {
      let dmg = atk + Math.floor(rng() * 3)
      if (companion) dmg += Math.max(1, Math.floor(atk * 0.45))
      m.hp = Math.max(0, m.hp - dmg)
      m.hitFlash = 0.25
      playerAttackCd = PLAYER_ATTACK_CD
      events.push({ type: 'player-hit', damage: dmg, monsterId: m.id })
      if (m.hp <= 0) {
        m.alive = false
        m.respawnAt = input.now + RESPAWN_MS
        const xpGain = defM.xp * rpgXpMultiplier(bag, input.now)
        const goldGain = defM.gold * rpgCreditMultiplier(bag, input.now)
        const loot = rollLoot(m.kind, rng)
        bag = {
          ...bag,
          xp: Math.min(50_000_000, bag.xp + xpGain),
          gold: Math.min(10_000_000, bag.gold + goldGain),
          kills: {
            ...bag.kills,
            [m.kind]: (bag.kills[m.kind] ?? 0) + 1,
          },
        }
        for (const drop of loot) {
          bag = addRpgInventoryItem(bag, drop.id, drop.qty)
        }
        // Quest kill progress
        bag = {
          ...bag,
          quests: bag.quests.map((q) => {
            if (q.claimed || q.complete) return q
            const questDef = harborRpgQuestById(q.id)
            if (!questDef || questDef.kind !== 'kill' || questDef.target !== m.kind) return q
            const progress = Math.min(questDef.need, q.progress + 1)
            return {
              ...q,
              progress,
              complete: progress >= questDef.need,
            }
          }),
        }
        events.push({
          type: 'kill',
          monsterId: m.id,
          kind: m.kind,
          xp: xpGain,
          gold: goldGain,
          loot,
        })
      }
    }
  }

  return { monsters, playerHp, bag, events }
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
