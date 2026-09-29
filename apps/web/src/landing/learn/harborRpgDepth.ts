/**
 * HarborRPG depth — real duel math, delve/rift packs, lockpick, world quests,
 * tide charts, and loadout shapes. Soft trust only.
 */
import {
  HARBOR_RPG_MONSTER_KINDS,
  HARBOR_RPG_ZONES,
  isHarborRpgZoneId,
  type HarborRpgMonsterKind,
  type HarborRpgZoneId,
} from './harborRpgData'

export type HarborRpgFleetRank = 'leader' | 'officer' | 'member'

export type HarborRpgFleetStack = { id: string; qty: number }

export type HarborRpgPledge = { id: string; text: string; by: string; t: number }

export type HarborRpgWhisper = { id: string; from: string; body: string; t: number; read: boolean }

export type HarborRpgDuel = {
  foe: string
  phase: 'challenge' | 'active'
  selfHp: number
  foeHp: number
}

export type HarborRpgTideChart = {
  zone: HarborRpgZoneId
  x: number
  z: number
  dug: boolean
}

export type HarborRpgLoadout = {
  specId: string | null
  talents: Record<string, number>
  skillBar: string[]
}

export type HarborRpgBuff = { id: 'might'; until: number }

export type HarborRpgWorldQuest = {
  id: string
  period: 'day' | 'week'
  kind: 'kill' | 'visit'
  monster?: HarborRpgMonsterKind
  zone?: HarborRpgZoneId
  need: number
  gold: number
  en: string
  zh: string
}

export const HARBOR_RPG_WORLD_QUESTS: HarborRpgWorldQuest[] = [
  { id: 'daily-slime', period: 'day', kind: 'kill', monster: 'slime', need: 3, gold: 8, en: 'Cull meadow slimes', zh: '清草地史萊姆' },
  { id: 'daily-wolf', period: 'day', kind: 'kill', monster: 'wolf', need: 2, gold: 8, en: 'Thin the pine wolves', zh: '疏松林狼' },
  { id: 'daily-bandit', period: 'day', kind: 'kill', monster: 'bandit', need: 2, gold: 10, en: 'Route a bandit pair', zh: '驅兩名盜匪' },
  { id: 'daily-town', period: 'day', kind: 'visit', zone: 'town', need: 1, gold: 6, en: 'Check the crossroads', zh: '巡十字鎮' },
  { id: 'daily-marsh', period: 'day', kind: 'visit', zone: 'marsh', need: 1, gold: 6, en: 'Patrol the reed marsh', zh: '巡蘆葦澤' },
  { id: 'daily-ash', period: 'day', kind: 'visit', zone: 'ashreach', need: 1, gold: 8, en: 'Scout Ash Reach', zh: '探灰燼灘' },
  { id: 'week-golem', period: 'week', kind: 'kill', monster: 'golem', need: 4, gold: 25, en: 'Crack four golems', zh: '破四具魔像' },
  { id: 'week-wraith', period: 'week', kind: 'kill', monster: 'wraith', need: 4, gold: 25, en: 'Quiet four wraiths', zh: '靜四隻怨靈' },
  { id: 'week-colossus', period: 'week', kind: 'kill', monster: 'world-colossus', need: 1, gold: 40, en: 'Strike the Ash Colossus', zh: '擊灰燼巨像' },
  { id: 'week-moon', period: 'week', kind: 'visit', zone: 'moonpier', need: 1, gold: 20, en: 'Walk Moon Pier', zh: '走月碼頭' },
]

const WORLD_IDS = new Set(HARBOR_RPG_WORLD_QUESTS.map((q) => q.id))
const MONSTER_SET = new Set<string>(HARBOR_RPG_MONSTER_KINDS)
const TIDE_ZONES: HarborRpgZoneId[] = ['meadow', 'pinewood', 'ruins', 'marsh', 'town', 'ashreach', 'moonpier']

export function harborRpgDayKey(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10)
}

export function harborRpgWeekKey(now = Date.now()): string {
  const d = new Date(now)
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)))
  return monday.toISOString().slice(0, 10)
}

function hashKey(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0
  return h
}

export function harborRpgWorldBoard(now = Date.now()): HarborRpgWorldQuest[] {
  const dailies = HARBOR_RPG_WORLD_QUESTS.filter((q) => q.period === 'day')
  const weeklies = HARBOR_RPG_WORLD_QUESTS.filter((q) => q.period === 'week')
  const start = hashKey(harborRpgDayKey(now)) % dailies.length
  const picked = [0, 1, 2].map((i) => dailies[(start + i) % dailies.length]!)
  const weekly = weeklies[hashKey(harborRpgWeekKey(now)) % weeklies.length]!
  return [...picked, weekly]
}

export function harborRpgWorldQuestById(id: string): HarborRpgWorldQuest | null {
  return HARBOR_RPG_WORLD_QUESTS.find((q) => q.id === id) ?? null
}

export function isHarborRpgWorldQuestId(id: string): boolean {
  return WORLD_IDS.has(id)
}

/** Floor changes the pack. Odd floors bandits, even floors golems. Count grows with the floor. */
export function delvePack(floor: number): { kind: HarborRpgMonsterKind; count: number }[] {
  const f = Math.min(8, Math.max(1, Math.floor(floor)))
  return [{ kind: f % 2 === 0 ? 'golem' : 'bandit', count: 2 + f }]
}

const RIFT_KINDS: HarborRpgMonsterKind[] = ['slime', 'wraith', 'golem', 'wolf']

/** Seeded rift layout — kind and count change with the seed. */
export function riftPack(seed: number): { kind: HarborRpgMonsterKind; count: number }[] {
  const s = Math.abs(Math.floor(seed)) || 1
  return [{ kind: RIFT_KINDS[s % RIFT_KINDS.length]!, count: 4 + (s % 4) }]
}

export function harborRpgSpawnPacks(
  zone: string,
  delveFloor: number,
  riftSeed: number,
): { kind: HarborRpgMonsterKind; count: number }[] | undefined {
  if (zone === 'delve') return delvePack(delveFloor)
  if (zone === 'rift') return riftPack(riftSeed)
  return undefined
}

/** Three pins in 1–3, stable for a floor. */
export function lockpickPattern(floor: number): [number, number, number] {
  const f = Math.min(8, Math.max(1, Math.floor(floor)))
  const n = (f * 17) % 27
  return [1 + (n % 3), 1 + (Math.floor(n / 3) % 3), 1 + (Math.floor(n / 9) % 3)]
}

export function lockpickMatches(floor: number, pins: number[]): boolean {
  if (pins.length !== 3) return false
  const pattern = lockpickPattern(floor)
  return pins[0] === pattern[0] && pins[1] === pattern[1] && pins[2] === pattern[2]
}

export function tideSite(seed: number): { zone: HarborRpgZoneId; x: number; z: number } {
  const s = Math.abs(Math.floor(seed)) || 1
  const zone = TIDE_ZONES[s % TIDE_ZONES.length]!
  const x = (s * 13) % 21 - 10
  const z = (s * 7) % 21 - 10
  return { zone, x, z }
}

export function tideSeedForDay(now = Date.now()): number {
  return (hashKey(`${harborRpgDayKey(now)}:tide`) % 9000) + 1
}

export function duelStrikeDamage(level: number): number {
  return 8 + Math.max(1, Math.floor(level))
}

export const HARBOR_RPG_DUEL_POST_HP = 40
export const HARBOR_RPG_DUEL_POST_HIT = 6
export const HARBOR_RPG_MIGHT_MS = 60_000
export const HARBOR_RPG_MIGHT_ATK = 4

export function harborRpgMightBonus(
  buffs: { id: string; until: number }[] | undefined,
  now: number,
): number {
  if (!buffs) return 0
  return buffs.some((b) => b.id === 'might' && b.until > now) ? HARBOR_RPG_MIGHT_ATK : 0
}

export function worldQuestProgress(input: {
  quest: HarborRpgWorldQuest
  kills: Record<string, number>
  killMark: Record<string, number>
  visits: string[]
}): number {
  if (input.quest.kind === 'kill' && input.quest.monster) {
    const now = input.kills[input.quest.monster] ?? 0
    const mark = input.killMark[input.quest.monster] ?? 0
    return Math.max(0, now - mark)
  }
  if (input.quest.kind === 'visit' && input.quest.zone) {
    return input.visits.includes(input.quest.zone) ? 1 : 0
  }
  return 0
}

export function sanitizeKillMark(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!MONSTER_SET.has(k)) continue
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) continue
    out[k] = Math.min(1_000_000, Math.floor(v))
  }
  return out
}

export function sanitizeZoneList(raw: unknown): string[] {
  const out: string[] = []
  if (!Array.isArray(raw)) return out
  for (const z of raw) {
    if (typeof z === 'string' && isHarborRpgZoneId(z) && !out.includes(z)) out.push(z)
  }
  return out
}

export function sanitizeWorldClaims(raw: unknown): string[] {
  const out: string[] = []
  if (!Array.isArray(raw)) return out
  for (const id of raw) {
    if (typeof id === 'string' && WORLD_IDS.has(id) && !out.includes(id)) out.push(id)
  }
  return out
}

export function clipFinite(n: unknown, min: number, max: number, fallback: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.floor(n)))
}

export function knownZone(raw: unknown): HarborRpgZoneId | null {
  return typeof raw === 'string' && (HARBOR_RPG_ZONES as readonly string[]).includes(raw)
    ? (raw as HarborRpgZoneId)
    : null
}
