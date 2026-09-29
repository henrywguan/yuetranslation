/**
 * HarborRPG medium systems — soft social + world depth (no anti-cheat).
 * Friends, fleet, mail, emotes, duels, deed rewards, rifts, delves, mount race, weather label.
 */
import {
  HARBOR_RPG_ACHIEVEMENT_IDS,
  harborRpgAchievementDone,
  type HarborRpgAchievementId,
} from './harborRpgAchievements'
import { isHarborRpgItemId, isHarborRpgZoneId, type HarborRpgItemId, type HarborRpgZoneId } from './harborRpgData'
import {
  HARBOR_RPG_DUEL_POST_HIT,
  HARBOR_RPG_DUEL_POST_HP,
  HARBOR_RPG_MIGHT_MS,
  duelStrikeDamage,
  harborRpgDayKey,
  harborRpgWeekKey,
  harborRpgWorldBoard,
  harborRpgWorldQuestById,
  isHarborRpgWorldQuestId,
  lockpickMatches,
  sanitizeKillMark,
  sanitizeWorldClaims,
  sanitizeZoneList,
  tideSeedForDay,
  tideSite,
  worldQuestProgress,
  type HarborRpgBuff,
  type HarborRpgDuel,
  type HarborRpgFleetRank,
  type HarborRpgFleetStack,
  type HarborRpgLoadout,
  type HarborRpgPledge,
  type HarborRpgTideChart,
  type HarborRpgWhisper,
} from './harborRpgDepth'
import { isHarborRpgPerformClip } from './harborRpgAnims'
import { isHarborRpgSpecId } from './harborRpgSpecs'
import type { HarborRpgBag } from './harborRpgProgress'

export const HARBOR_RPG_EMOTES = [
  { id: 'wave', en: 'Wave', zh: '揮手' },
  { id: 'bow', en: 'Bow', zh: '鞠躬' },
  { id: 'cheer', en: 'Cheer', zh: '歡呼' },
  { id: 'sit-toast', en: 'Toast', zh: '舉杯' },
] as const

export type HarborRpgEmoteId = (typeof HARBOR_RPG_EMOTES)[number]['id']

export type HarborRpgMail = {
  id: string
  from: string
  subject: string
  body: string
  gold: number
  read: boolean
  t: number
}

export type HarborRpgMediumSlice = {
  friends: string[]
  afk: boolean
  afkNote: string
  fleetName: string | null
  fleetMotto: string
  fleetRank: HarborRpgFleetRank
  fleetBank: HarborRpgFleetStack[]
  fleetPledges: HarborRpgPledge[]
  inbox: HarborRpgMail[]
  whispers: HarborRpgWhisper[]
  claimedDeeds: string[]
  delveFloor: number
  delveBest: number
  delveMark: number
  riftClears: number
  riftMark: number
  riftSeed: number
  raceBestMs: number | null
  raceRuns: number
  /** 0 idle, 1 passed start, 2 passed the mid gate. */
  raceStep: 0 | 1 | 2
  duel: HarborRpgDuel | null
  worldDay: string
  worldWeek: string
  worldKillMark: Record<string, number>
  worldClaims: string[]
  worldVisits: string[]
  tideChart: HarborRpgTideChart | null
  loadoutB: HarborRpgLoadout | null
  activeLoadout: 'a' | 'b'
  buffs: HarborRpgBuff[]
}

export type HarborRpgSocialNotice = {
  kind: 'mail' | 'whisper' | 'duel-challenge' | 'duel-accept' | 'duel-hit' | 'pledge'
  to: string
  mail?: HarborRpgMail
  body?: string
  damage?: number
  text?: string
  id?: string
}

export const HARBOR_RPG_RAVENPOST = {
  id: 'rpg-ravenpost' as const,
  zone: 'town' as const,
  x: 16,
  z: -6,
  radius: 2.2,
  name: { en: 'Ravenpost', zh: '渡鴉信站' },
}

export const HARBOR_RPG_RELIQUARY = {
  id: 'rpg-reliquary' as const,
  zone: 'town' as const,
  x: -16,
  z: -2,
  radius: 2.2,
  name: { en: 'Reliquary', zh: '聖物架' },
}

export const HARBOR_RPG_RACE_START = {
  id: 'rpg-race-start' as const,
  zone: 'town' as const,
  x: 16,
  z: 12,
  radius: 2.2,
  name: { en: 'Race start', zh: '賽馬起點' },
}

export const HARBOR_RPG_RACE_MID = {
  id: 'rpg-race-mid' as const,
  zone: 'town' as const,
  x: 10,
  z: -12,
  radius: 2.2,
  name: { en: 'Race mid', zh: '賽馬中閘' },
}

export const HARBOR_RPG_RACE_FINISH = {
  id: 'rpg-race-finish' as const,
  zone: 'town' as const,
  x: 16,
  z: -14,
  radius: 2.2,
  name: { en: 'Race finish', zh: '賽馬終點' },
}

const DEED_SET = new Set<string>(HARBOR_RPG_ACHIEVEMENT_IDS)
const EMOTE_SET = new Set<string>(HARBOR_RPG_EMOTES.map((e) => e.id))

function clipName(raw: string, max = 24): string {
  return raw.replace(/[\u0000-\u001f]/g, '').trim().slice(0, max)
}

function clipBody(raw: string, max = 180): string {
  return raw.replace(/[\u0000-\u001f]/g, '').trim().slice(0, max)
}

function sanitizeStacks(raw: unknown): HarborRpgFleetStack[] {
  const out: HarborRpgFleetStack[] = []
  if (!Array.isArray(raw)) return out
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    if (!isHarborRpgItemId(r.id)) continue
    const qty = typeof r.qty === 'number' && Number.isFinite(r.qty) ? Math.min(99, Math.floor(r.qty)) : 0
    if (qty <= 0 || out.some((s) => s.id === r.id)) continue
    out.push({ id: r.id, qty })
    if (out.length >= 24) break
  }
  return out
}

function sanitizePledges(raw: unknown): HarborRpgPledge[] {
  const out: HarborRpgPledge[] = []
  if (!Array.isArray(raw)) return out
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const id = typeof r.id === 'string' ? r.id.slice(0, 40) : ''
    const text = typeof r.text === 'string' ? clipBody(r.text, 80) : ''
    if (!id || !text) continue
    out.push({
      id,
      text,
      by: typeof r.by === 'string' ? clipName(r.by) || 'sailor' : 'sailor',
      t: typeof r.t === 'number' && Number.isFinite(r.t) ? Math.floor(r.t) : 0,
    })
    if (out.length >= 12) break
  }
  return out
}

function sanitizeWhispers(raw: unknown): HarborRpgWhisper[] {
  const out: HarborRpgWhisper[] = []
  if (!Array.isArray(raw)) return out
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const id = typeof r.id === 'string' ? r.id.slice(0, 40) : ''
    const from = typeof r.from === 'string' ? clipName(r.from) : ''
    const body = typeof r.body === 'string' ? clipBody(r.body, 140) : ''
    if (!id || !from || !body) continue
    out.push({
      id,
      from,
      body,
      t: typeof r.t === 'number' && Number.isFinite(r.t) ? Math.floor(r.t) : 0,
      read: r.read === true,
    })
    if (out.length >= 20) break
  }
  return out
}

function sanitizeDuel(raw: unknown): HarborRpgDuel | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const foe = typeof r.foe === 'string' ? clipName(r.foe) : ''
  if (!foe || (r.phase !== 'challenge' && r.phase !== 'active')) return null
  const hp = (n: unknown) =>
    typeof n === 'number' && Number.isFinite(n) ? Math.min(500, Math.max(0, Math.floor(n))) : 0
  return { foe, phase: r.phase, selfHp: hp(r.selfHp), foeHp: hp(r.foeHp) }
}

function sanitizeTide(raw: unknown): HarborRpgTideChart | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!isHarborRpgZoneId(r.zone)) return null
  const x = typeof r.x === 'number' && Number.isFinite(r.x) ? Math.max(-40, Math.min(40, r.x)) : 0
  const z = typeof r.z === 'number' && Number.isFinite(r.z) ? Math.max(-40, Math.min(40, r.z)) : 0
  return { zone: r.zone, x, z, dug: r.dug === true }
}

function sanitizeLoadout(raw: unknown): HarborRpgLoadout | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const specId = typeof r.specId === 'string' && isHarborRpgSpecId(r.specId) ? r.specId : null
  const talents: Record<string, number> = {}
  if (r.talents && typeof r.talents === 'object' && !Array.isArray(r.talents)) {
    for (const [k, v] of Object.entries(r.talents as Record<string, unknown>)) {
      if (!/^[a-z0-9-]{1,40}$/i.test(k)) continue
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) continue
      talents[k] = Math.min(5, Math.floor(v))
    }
  }
  const skillBar: string[] = []
  if (Array.isArray(r.skillBar)) {
    for (const id of r.skillBar) {
      if (typeof id !== 'string' || !/^[a-z0-9-]{1,40}$/i.test(id) || skillBar.includes(id)) continue
      skillBar.push(id)
      if (skillBar.length >= 5) break
    }
  }
  return { specId, talents, skillBar }
}

function sanitizeBuffs(raw: unknown): HarborRpgBuff[] {
  if (!Array.isArray(raw)) return []
  const out: HarborRpgBuff[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    if (r.id !== 'might') continue
    if (typeof r.until !== 'number' || !Number.isFinite(r.until)) continue
    out.push({ id: 'might', until: Math.floor(r.until) })
  }
  return out.slice(0, 4)
}

function mergeById<T extends { id: string }>(a: T[], b: T[]): T[] {
  const out = [...a]
  for (const row of b) {
    if (!out.some((x) => x.id === row.id)) out.push(row)
  }
  return out
}

function mergeStacks(a: HarborRpgFleetStack[], b: HarborRpgFleetStack[]): HarborRpgFleetStack[] {
  const map = new Map<string, number>()
  for (const row of [...a, ...b]) map.set(row.id, Math.max(map.get(row.id) ?? 0, row.qty))
  return [...map.entries()].slice(0, 24).map(([id, qty]) => ({ id, qty }))
}

function mergeBuffs(a: HarborRpgBuff[], b: HarborRpgBuff[]): HarborRpgBuff[] {
  const until = Math.max(a.find((x) => x.id === 'might')?.until ?? 0, b.find((x) => x.id === 'might')?.until ?? 0)
  return until > 0 ? [{ id: 'might', until }] : []
}

function consumeOne(bag: HarborRpgBag, id: HarborRpgItemId): HarborRpgBag | null {
  const inventory = bag.inventory.map((s) => ({ ...s }))
  const idx = inventory.findIndex((s) => s.id === id)
  if (idx < 0 || inventory[idx]!.qty < 1) return null
  inventory[idx]!.qty -= 1
  if (inventory[idx]!.qty <= 0) inventory.splice(idx, 1)
  return { ...bag, inventory }
}

function giveOne(bag: HarborRpgBag, id: HarborRpgItemId): HarborRpgBag {
  const inventory = bag.inventory.map((s) => ({ ...s }))
  const existing = inventory.find((s) => s.id === id)
  if (existing) existing.qty = Math.min(99, existing.qty + 1)
  else if (inventory.length < 32) inventory.push({ id, qty: 1 })
  return { ...bag, inventory }
}

function noteVisit(bag: HarborRpgBag): HarborRpgBag {
  if (bag.worldVisits.includes(bag.zone)) return bag
  return { ...bag, worldVisits: [...bag.worldVisits, bag.zone].slice(0, 16) }
}

function syncWorld(bag: HarborRpgBag, now: number): HarborRpgBag {
  const day = harborRpgDayKey(now)
  const week = harborRpgWeekKey(now)
  let next = bag
  if (next.worldDay !== day) {
    const mark: Record<string, number> = {}
    for (const [k, v] of Object.entries(next.kills)) mark[k] = v ?? 0
    const keep = next.worldClaims.filter((id) => harborRpgWorldQuestById(id)?.period === 'week')
    next = { ...next, worldDay: day, worldKillMark: mark, worldClaims: keep, worldVisits: [] }
  }
  if (next.worldWeek !== week) {
    next = {
      ...next,
      worldWeek: week,
      worldClaims: next.worldClaims.filter((id) => harborRpgWorldQuestById(id)?.period === 'day'),
    }
  }
  return noteVisit(next)
}

export function emptyRpgMedium(): HarborRpgMediumSlice {
  return {
    friends: [],
    afk: false,
    afkNote: '',
    fleetName: null,
    fleetMotto: '',
    fleetRank: 'member',
    fleetBank: [],
    fleetPledges: [],
    inbox: [],
    whispers: [],
    claimedDeeds: [],
    delveFloor: 1,
    delveBest: 0,
    delveMark: 0,
    riftClears: 0,
    riftMark: 0,
    riftSeed: 1,
    raceBestMs: null,
    raceRuns: 0,
    raceStep: 0,
    duel: null,
    worldDay: '',
    worldWeek: '',
    worldKillMark: {},
    worldClaims: [],
    worldVisits: [],
    tideChart: null,
    loadoutB: null,
    activeLoadout: 'a',
    buffs: [],
  }
}

export function sanitizeRpgMedium(raw: unknown): HarborRpgMediumSlice {
  const base = emptyRpgMedium()
  if (!raw || typeof raw !== 'object') return base
  const o = raw as Record<string, unknown>
  const friends: string[] = []
  if (Array.isArray(o.friends)) {
    for (const name of o.friends) {
      if (typeof name !== 'string') continue
      const n = clipName(name)
      if (!n || friends.includes(n)) continue
      friends.push(n)
      if (friends.length >= 16) break
    }
  }
  const inbox: HarborRpgMail[] = []
  if (Array.isArray(o.inbox)) {
    for (const row of o.inbox) {
      if (!row || typeof row !== 'object') continue
      const r = row as Record<string, unknown>
      const id = typeof r.id === 'string' ? r.id.slice(0, 40) : ''
      const from = typeof r.from === 'string' ? clipName(r.from) : ''
      if (!id || !from) continue
      inbox.push({
        id,
        from,
        subject: typeof r.subject === 'string' ? clipName(r.subject, 40) : 'Letter',
        body: typeof r.body === 'string' ? r.body.replace(/[\u0000-\u001f]/g, '').slice(0, 180) : '',
        gold:
          typeof r.gold === 'number' && Number.isFinite(r.gold) && r.gold > 0
            ? Math.min(5000, Math.floor(r.gold))
            : 0,
        read: r.read === true,
        t: typeof r.t === 'number' && Number.isFinite(r.t) ? Math.floor(r.t) : 0,
      })
      if (inbox.length >= 20) break
    }
  }
  const claimedDeeds: string[] = []
  if (Array.isArray(o.claimedDeeds)) {
    for (const id of o.claimedDeeds) {
      if (typeof id === 'string' && DEED_SET.has(id) && !claimedDeeds.includes(id)) {
        claimedDeeds.push(id)
      }
    }
  }
  const delveFloor =
    typeof o.delveFloor === 'number' && Number.isFinite(o.delveFloor)
      ? Math.min(8, Math.max(1, Math.floor(o.delveFloor)))
      : 1
  const num = (k: string, max: number) =>
    typeof o[k] === 'number' && Number.isFinite(o[k] as number) && (o[k] as number) >= 0
      ? Math.min(max, Math.floor(o[k] as number))
      : 0
  const fleetName = typeof o.fleetName === 'string' ? clipName(o.fleetName, 24) || null : null
  const fleetRank: HarborRpgFleetRank =
    o.fleetRank === 'leader' || o.fleetRank === 'officer' || o.fleetRank === 'member'
      ? o.fleetRank
      : 'member'
  const whispers = sanitizeWhispers(o.whispers)
  const duel = sanitizeDuel(o.duel)
  const tideChart = sanitizeTide(o.tideChart)
  const loadoutB = sanitizeLoadout(o.loadoutB)
  const raceStep: 0 | 1 | 2 = o.raceStep === 1 || o.raceStep === 2 ? o.raceStep : 0
  return {
    friends,
    afk: o.afk === true,
    afkNote: typeof o.afkNote === 'string' ? clipName(o.afkNote, 80) : '',
    fleetName,
    fleetMotto: typeof o.fleetMotto === 'string' ? clipName(o.fleetMotto, 80) : '',
    fleetRank,
    fleetBank: sanitizeStacks(o.fleetBank),
    fleetPledges: sanitizePledges(o.fleetPledges),
    inbox,
    whispers,
    claimedDeeds,
    delveFloor,
    delveBest: num('delveBest', 8),
    delveMark: num('delveMark', 1_000_000),
    riftClears: num('riftClears', 1_000_000),
    riftMark: num('riftMark', 1_000_000),
    riftSeed: num('riftSeed', 100_000) || 1,
    raceBestMs:
      typeof o.raceBestMs === 'number' && Number.isFinite(o.raceBestMs) && o.raceBestMs > 0
        ? Math.min(600_000, Math.floor(o.raceBestMs))
        : null,
    raceRuns: num('raceRuns', 1_000_000),
    raceStep,
    duel,
    worldDay: typeof o.worldDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.worldDay) ? o.worldDay : '',
    worldWeek: typeof o.worldWeek === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.worldWeek) ? o.worldWeek : '',
    worldKillMark: sanitizeKillMark(o.worldKillMark),
    worldClaims: sanitizeWorldClaims(o.worldClaims),
    worldVisits: sanitizeZoneList(o.worldVisits),
    tideChart,
    loadoutB,
    activeLoadout: o.activeLoadout === 'b' ? 'b' : 'a',
    buffs: sanitizeBuffs(o.buffs),
  }
}

export function mergeRpgMedium(a: HarborRpgMediumSlice, b: HarborRpgMediumSlice): HarborRpgMediumSlice {
  const friends = [...a.friends]
  for (const n of b.friends) if (!friends.includes(n) && friends.length < 16) friends.push(n)
  const inbox = [...b.inbox]
  for (const m of a.inbox) {
    if (!inbox.some((x) => x.id === m.id) && inbox.length < 20) inbox.push(m)
  }
  const claimed = [...new Set([...a.claimedDeeds, ...b.claimedDeeds])].filter((id) => DEED_SET.has(id))
  return {
    friends,
    afk: b.afk,
    afkNote: b.afkNote || a.afkNote,
    fleetName: b.fleetName ?? a.fleetName,
    fleetMotto: b.fleetMotto || a.fleetMotto,
    fleetRank: b.fleetName ? b.fleetRank : a.fleetRank,
    fleetBank: mergeStacks(a.fleetBank, b.fleetBank),
    fleetPledges: mergeById(a.fleetPledges, b.fleetPledges),
    inbox,
    whispers: mergeById(b.whispers, a.whispers).slice(0, 20),
    claimedDeeds: claimed,
    delveFloor: Math.max(a.delveFloor, b.delveFloor),
    delveBest: Math.max(a.delveBest, b.delveBest),
    delveMark: Math.max(a.delveMark, b.delveMark),
    riftClears: Math.max(a.riftClears, b.riftClears),
    riftMark: Math.max(a.riftMark, b.riftMark),
    riftSeed: b.riftSeed || a.riftSeed,
    raceBestMs:
      a.raceBestMs == null
        ? b.raceBestMs
        : b.raceBestMs == null
          ? a.raceBestMs
          : Math.min(a.raceBestMs, b.raceBestMs),
    raceRuns: Math.max(a.raceRuns, b.raceRuns),
    raceStep: Math.max(a.raceStep, b.raceStep) as 0 | 1 | 2,
    duel: b.duel ?? a.duel,
    worldDay: b.worldDay || a.worldDay,
    worldWeek: b.worldWeek || a.worldWeek,
    worldKillMark: { ...a.worldKillMark, ...b.worldKillMark },
    worldClaims: [...new Set([...a.worldClaims, ...b.worldClaims])].filter((id) =>
      isHarborRpgWorldQuestId(id),
    ),
    worldVisits: [...new Set([...a.worldVisits, ...b.worldVisits])],
    tideChart: b.tideChart ?? a.tideChart,
    loadoutB: b.loadoutB ?? a.loadoutB,
    activeLoadout: b.activeLoadout,
    buffs: mergeBuffs(a.buffs, b.buffs),
  }
}

function killSum(bag: HarborRpgBag): number {
  return Object.values(bag.kills).reduce((n, v) => n + (v ?? 0), 0)
}

export function deedRewardGold(id: string): number {
  return DEED_SET.has(id) ? 15 : 0
}

export function isHarborRpgEmoteId(id: string): id is HarborRpgEmoteId {
  return EMOTE_SET.has(id)
}

/** Deterministic render-only weather per zone (no combat effect). */
export function harborRpgWeatherForZone(zone: string): 'sunny' | 'cloudy' | 'rainy' | 'night' {
  let h = 0
  for (let i = 0; i < zone.length; i++) h = (h + zone.charCodeAt(i) * (i + 3)) >>> 0
  const table = ['sunny', 'cloudy', 'rainy', 'night'] as const
  return table[h % table.length]!
}

export type HarborRpgMediumAction =
  | { type: 'add-friend'; name: string }
  | { type: 'remove-friend'; name: string }
  | { type: 'afk'; on: boolean; note: string }
  | { type: 'fleet'; name: string | null; motto: string }
  | { type: 'mail'; to: string; subject: string; body: string; gold: number }
  | { type: 'read-mail'; id: string }
  | { type: 'receive-mail'; mail: HarborRpgMail }
  | { type: 'claim-deed'; id: string }
  | { type: 'enter-delve'; floor: number }
  | { type: 'claim-delve'; roll?: number; pins?: number[] }
  | { type: 'enter-rift' }
  | { type: 'claim-rift'; roll: number }
  | { type: 'race'; elapsedMs: number; mounted: boolean; checkpoint?: boolean }
  | { type: 'race-mark'; gate: 'start' | 'mid' }
  | { type: 'emote'; id: string }
  | { type: 'perform'; clip: string }
  | { type: 'duel'; foe: string }
  | { type: 'duel-accept' }
  | { type: 'duel-hit' }
  | { type: 'receive-duel'; from: string }
  | { type: 'receive-duel-accept'; from: string }
  | { type: 'receive-duel-hit'; damage: number }
  | { type: 'whisper'; to: string; body: string }
  | { type: 'receive-whisper'; whisper: HarborRpgWhisper }
  | { type: 'read-whisper'; id: string }
  | { type: 'fleet-rank'; rank: HarborRpgFleetRank }
  | { type: 'fleet-deposit'; id: HarborRpgItemId }
  | { type: 'fleet-withdraw'; id: HarborRpgItemId }
  | { type: 'fleet-pledge'; text: string }
  | { type: 'receive-pledge'; pledge: HarborRpgPledge; fleet: string }
  | { type: 'zone'; zone: HarborRpgZoneId }
  | { type: 'sync-world' }
  | { type: 'claim-world'; id: string }
  | { type: 'draw-chart' }
  | { type: 'dig-chart'; x: number; z: number }
  | { type: 'save-loadout' }
  | { type: 'swap-loadout' }
  | { type: 'drink-might' }

export type HarborRpgMediumResult = {
  bag: HarborRpgBag
  toast: string
  /** Zone to travel to, when the action moves the sailor. */
  zone?: HarborRpgZoneId
  /** Soft broadcast for the other sailor. */
  social?: HarborRpgSocialNotice
}

export function applyRpgMedium(
  bag: HarborRpgBag,
  action: HarborRpgMediumAction,
  now = Date.now(),
): HarborRpgMediumResult | null {
  switch (action.type) {
    case 'add-friend': {
      const name = clipName(action.name)
      if (!name) return null
      if (bag.friends.includes(name)) return { bag, toast: 'Already a friend' }
      if (bag.friends.length >= 16) return null
      return { bag: { ...bag, friends: [...bag.friends, name] }, toast: `Friend added · ${name}` }
    }
    case 'remove-friend': {
      const name = clipName(action.name)
      return {
        bag: { ...bag, friends: bag.friends.filter((n) => n !== name) },
        toast: 'Friend removed',
      }
    }
    case 'afk':
      return {
        bag: { ...bag, afk: action.on, afkNote: clipName(action.note, 80) },
        toast: action.on ? 'AFK' : 'Back',
      }
    case 'fleet': {
      const name = action.name ? clipName(action.name) : ''
      if (!name) {
        return {
          bag: { ...bag, fleetName: null, fleetMotto: '', fleetRank: 'member', fleetBank: [], fleetPledges: [] },
          toast: 'Left fleet',
        }
      }
      return {
        bag: {
          ...bag,
          fleetName: name,
          fleetMotto: clipName(action.motto, 80),
          fleetRank: 'leader',
        },
        toast: `Fleet · ${name}`,
      }
    }
    case 'mail': {
      const to = clipName(action.to)
      const subject = clipName(action.subject, 40) || 'Letter'
      const body = action.body.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 180)
      const gold = Math.max(0, Math.min(5000, Math.floor(action.gold)))
      if (!to || !body) return null
      if (bag.gold < gold) return null
      const mail: HarborRpgMail = {
        id: `mail-${now.toString(36)}`,
        from: 'you',
        subject,
        body,
        gold,
        read: false,
        t: now,
      }
      // Sender keeps a "→ to" copy. Remotes apply receive-mail with the real letter.
      return {
        bag: {
          ...bag,
          gold: bag.gold - gold,
          inbox: [{ ...mail, from: `→ ${to}` }, ...bag.inbox].slice(0, 20),
        },
        toast: gold ? `Raven sent · ${gold}g` : 'Raven sent',
        social: { kind: 'mail', to, mail },
      }
    }
    case 'read-mail':
      return {
        bag: {
          ...bag,
          inbox: bag.inbox.map((m) => (m.id === action.id ? { ...m, read: true } : m)),
        },
        toast: 'Letter read',
      }
    case 'receive-mail': {
      if (bag.inbox.some((m) => m.id === action.mail.id)) return { bag, toast: 'Already received' }
      const gold = Math.min(5000, Math.max(0, Math.floor(action.mail.gold)))
      return {
        bag: {
          ...bag,
          gold: Math.min(10_000_000, bag.gold + gold),
          inbox: [{ ...action.mail, gold, read: false }, ...bag.inbox].slice(0, 20),
        },
        toast: 'Ravenpost delivery',
      }
    }
    case 'claim-deed': {
      if (!DEED_SET.has(action.id)) return null
      if (bag.claimedDeeds.includes(action.id)) return { bag, toast: 'Already shelved' }
      if (!harborRpgAchievementDone(bag, action.id as HarborRpgAchievementId)) {
        return null
      }
      const gold = deedRewardGold(action.id)
      return {
        bag: {
          ...bag,
          gold: Math.min(10_000_000, bag.gold + gold),
          claimedDeeds: [...bag.claimedDeeds, action.id],
        },
        toast: `Reliquary · +${gold}g`,
      }
    }
    case 'enter-delve': {
      const floor = Math.min(8, Math.max(1, Math.floor(action.floor)))
      return {
        bag: { ...bag, delveFloor: floor, delveMark: killSum(bag), zone: 'delve' },
        toast: `Delve floor ${floor}`,
        zone: 'delve',
      }
    }
    case 'claim-delve': {
      if (bag.zone !== 'delve') return null
      const gained = killSum(bag) - bag.delveMark
      if (gained < 1) return null
      const pins = action.pins
      const lock = pins
        ? lockpickMatches(bag.delveFloor, pins)
        : typeof action.roll === 'number' && action.roll < 0.45 + bag.delveFloor * 0.05
      const gold = lock ? 6 * bag.delveFloor : 2
      return {
        bag: {
          ...bag,
          gold: Math.min(10_000_000, bag.gold + gold),
          delveBest: Math.max(bag.delveBest, bag.delveFloor),
          delveMark: killSum(bag),
        },
        toast: lock ? `Lock picked · +${gold}g` : `Lock stuck · +${gold}g`,
      }
    }
    case 'enter-rift': {
      const riftSeed = (Math.abs(Math.floor(now)) % 9973) || 1
      return {
        bag: { ...bag, riftMark: killSum(bag), riftSeed, zone: 'rift' },
        toast: `Rift opened · seed ${riftSeed}`,
        zone: 'rift',
      }
    }
    case 'claim-rift': {
      if (bag.zone !== 'rift') return null
      if (killSum(bag) <= bag.riftMark) return null
      const gold = action.roll < 0.7 ? 25 : 8
      return {
        bag: {
          ...bag,
          gold: Math.min(10_000_000, bag.gold + gold),
          riftClears: bag.riftClears + 1,
          riftMark: killSum(bag),
        },
        toast: `Rift chest · +${gold}g`,
      }
    }
    case 'emote': {
      if (!isHarborRpgEmoteId(action.id)) return null
      const em = HARBOR_RPG_EMOTES.find((e) => e.id === action.id)
      return { bag, toast: em ? em.en : 'Emote' }
    }
    case 'perform': {
      if (!isHarborRpgPerformClip(action.clip)) return null
      return { bag, toast: action.clip.replace(/_/g, ' ') }
    }
    case 'duel': {
      const foe = clipName(action.foe)
      if (!foe) return null
      const duel: HarborRpgDuel = {
        foe,
        phase: foe === 'training-post' ? 'active' : 'challenge',
        selfHp: HARBOR_RPG_DUEL_POST_HP,
        foeHp: HARBOR_RPG_DUEL_POST_HP,
      }
      return {
        bag: { ...bag, duel },
        toast: foe === 'training-post' ? 'Training duel' : `Duel challenge · ${foe}`,
        social: foe === 'training-post' ? undefined : { kind: 'duel-challenge', to: foe },
      }
    }
    case 'duel-accept': {
      if (!bag.duel || bag.duel.phase !== 'challenge') return null
      return {
        bag: { ...bag, duel: { ...bag.duel, phase: 'active' } },
        toast: 'Duel accepted',
        social: { kind: 'duel-accept', to: bag.duel.foe },
      }
    }
    case 'duel-hit': {
      if (!bag.duel || bag.duel.phase !== 'active') return null
      const dmg = duelStrikeDamage(1 + Math.floor(Math.sqrt(Math.max(0, bag.xp) / 25)))
      let foeHp = bag.duel.foeHp - dmg
      let selfHp = bag.duel.selfHp
      if (bag.duel.foe === 'training-post' && foeHp > 0) {
        selfHp = Math.max(0, selfHp - HARBOR_RPG_DUEL_POST_HIT)
      }
      if (foeHp <= 0) return { bag: { ...bag, duel: null }, toast: 'Duel won' }
      if (selfHp <= 0) return { bag: { ...bag, duel: null }, toast: 'Duel lost' }
      return {
        bag: { ...bag, duel: { ...bag.duel, foeHp, selfHp } },
        toast: `Strike · ${dmg}`,
        social:
          bag.duel.foe === 'training-post'
            ? undefined
            : { kind: 'duel-hit', to: bag.duel.foe, damage: dmg },
      }
    }
    case 'receive-duel': {
      const from = clipName(action.from)
      if (!from) return null
      return {
        bag: {
          ...bag,
          duel: { foe: from, phase: 'challenge', selfHp: HARBOR_RPG_DUEL_POST_HP, foeHp: HARBOR_RPG_DUEL_POST_HP },
        },
        toast: `Duel from ${from}`,
      }
    }
    case 'receive-duel-accept': {
      const from = clipName(action.from)
      if (!bag.duel || bag.duel.foe !== from) return null
      return { bag: { ...bag, duel: { ...bag.duel, phase: 'active' } }, toast: 'Duel started' }
    }
    case 'receive-duel-hit': {
      if (!bag.duel || bag.duel.phase !== 'active') return null
      const dmg = Math.max(1, Math.min(80, Math.floor(action.damage)))
      const selfHp = bag.duel.selfHp - dmg
      if (selfHp <= 0) return { bag: { ...bag, duel: null }, toast: 'Duel lost' }
      return { bag: { ...bag, duel: { ...bag.duel, selfHp } }, toast: `Hit · ${dmg}` }
    }
    case 'whisper': {
      const to = clipName(action.to)
      const body = clipBody(action.body, 140)
      if (!to || !body) return null
      const whisper: HarborRpgWhisper = {
        id: `wh-${now.toString(36)}`,
        from: `→ ${to}`,
        body,
        t: now,
        read: true,
      }
      return {
        bag: { ...bag, whispers: [whisper, ...bag.whispers].slice(0, 20) },
        toast: `Whisper → ${to}`,
        social: { kind: 'whisper', to, body, id: whisper.id },
      }
    }
    case 'receive-whisper': {
      if (bag.whispers.some((w) => w.id === action.whisper.id)) return { bag, toast: 'Already heard' }
      return {
        bag: { ...bag, whispers: [{ ...action.whisper, read: false }, ...bag.whispers].slice(0, 20) },
        toast: `Whisper · ${action.whisper.from}`,
      }
    }
    case 'read-whisper':
      return {
        bag: {
          ...bag,
          whispers: bag.whispers.map((w) => (w.id === action.id ? { ...w, read: true } : w)),
        },
        toast: 'Whisper read',
      }
    case 'fleet-rank': {
      if (!bag.fleetName) return null
      if (action.rank !== 'leader' && action.rank !== 'officer' && action.rank !== 'member') return null
      return { bag: { ...bag, fleetRank: action.rank }, toast: `Rank · ${action.rank}` }
    }
    case 'fleet-deposit': {
      if (!bag.fleetName || !isHarborRpgItemId(action.id)) return null
      const spent = consumeOne(bag, action.id)
      if (!spent) return null
      const bank = spent.fleetBank.map((s) => ({ ...s }))
      const row = bank.find((s) => s.id === action.id)
      if (row) row.qty = Math.min(99, row.qty + 1)
      else bank.push({ id: action.id, qty: 1 })
      return { bag: { ...spent, fleetBank: bank.slice(0, 24) }, toast: 'Deposited to fleet bank' }
    }
    case 'fleet-withdraw': {
      if (!bag.fleetName) return null
      if (bag.fleetRank === 'member') return null
      const row = bag.fleetBank.find((s) => s.id === action.id)
      if (!row || !isHarborRpgItemId(action.id)) return null
      const bank = bag.fleetBank
        .map((s) => ({ ...s }))
        .map((s) => (s.id === action.id ? { ...s, qty: s.qty - 1 } : s))
        .filter((s) => s.qty > 0)
      return { bag: { ...giveOne(bag, action.id), fleetBank: bank }, toast: 'Withdrew from fleet bank' }
    }
    case 'fleet-pledge': {
      if (!bag.fleetName) return null
      const text = clipBody(action.text, 80)
      if (!text) return null
      const pledge: HarborRpgPledge = { id: `pl-${now.toString(36)}`, text, by: 'you', t: now }
      return {
        bag: { ...bag, fleetPledges: [pledge, ...bag.fleetPledges].slice(0, 12) },
        toast: 'Pledge posted',
        social: { kind: 'pledge', to: bag.fleetName, text, id: pledge.id },
      }
    }
    case 'receive-pledge': {
      if (!bag.fleetName || bag.fleetName !== action.fleet) return null
      if (bag.fleetPledges.some((p) => p.id === action.pledge.id)) return { bag, toast: 'Pledge already posted' }
      return {
        bag: { ...bag, fleetPledges: [action.pledge, ...bag.fleetPledges].slice(0, 12) },
        toast: 'Fleet pledge',
      }
    }
    case 'zone': {
      if (!isHarborRpgZoneId(action.zone)) return null
      const next = noteVisit({ ...bag, zone: action.zone })
      return { bag: next, toast: `Travel · ${action.zone}`, zone: action.zone }
    }
    case 'race-mark': {
      if (action.gate === 'start') {
        return { bag: { ...bag, raceStep: 1 }, toast: 'Race start' }
      }
      if (bag.raceStep < 1) return null
      return { bag: { ...bag, raceStep: 2 }, toast: 'Mid gate' }
    }
    case 'race': {
      if (!action.mounted) return null
      if (action.checkpoint && bag.raceStep < 2) return null
      const ms = Math.floor(action.elapsedMs)
      if (ms < 3000 || ms > 180_000) return null
      const beat = ms <= 45_000
      const best = bag.raceBestMs == null ? ms : Math.min(bag.raceBestMs, ms)
      const gold = beat ? 20 : 0
      return {
        bag: {
          ...bag,
          raceRuns: bag.raceRuns + 1,
          raceBestMs: best,
          raceStep: 0,
          gold: Math.min(10_000_000, bag.gold + gold),
        },
        toast: beat ? `Race clear · ${(ms / 1000).toFixed(1)}s · +${gold}g` : `Race · ${(ms / 1000).toFixed(1)}s`,
      }
    }
    case 'sync-world': {
      const next = syncWorld(bag, now)
      if (
        next.worldDay === bag.worldDay &&
        next.worldWeek === bag.worldWeek &&
        next.worldVisits.length === bag.worldVisits.length
      ) {
        return null
      }
      return { bag: next, toast: '' }
    }
    case 'claim-world': {
      const synced = syncWorld(bag, now)
      const quest = harborRpgWorldQuestById(action.id)
      if (!quest) return null
      const board = harborRpgWorldBoard(now)
      if (!board.some((q) => q.id === quest.id)) return null
      if (synced.worldClaims.includes(quest.id)) return { bag: synced, toast: 'Already claimed' }
      const progress = worldQuestProgress({
        quest,
        kills: synced.kills,
        killMark: synced.worldKillMark,
        visits: synced.worldVisits,
      })
      if (progress < quest.need) return null
      return {
        bag: {
          ...synced,
          gold: Math.min(10_000_000, synced.gold + quest.gold),
          worldClaims: [...synced.worldClaims, quest.id],
        },
        toast: `${quest.en} · +${quest.gold}g`,
      }
    }
    case 'draw-chart': {
      const site = tideSite(tideSeedForDay(now))
      return {
        bag: { ...bag, tideChart: { ...site, dug: false } },
        toast: `Tide chart · ${site.zone}`,
      }
    }
    case 'dig-chart': {
      const chart = bag.tideChart
      if (!chart || chart.dug) return null
      if (bag.zone !== chart.zone) return null
      const x = typeof action.x === 'number' && Number.isFinite(action.x) ? action.x : 999
      const z = typeof action.z === 'number' && Number.isFinite(action.z) ? action.z : 999
      if (Math.hypot(x - chart.x, z - chart.z) > 6) return null
      return {
        bag: {
          ...bag,
          gold: Math.min(10_000_000, bag.gold + 12),
          tideChart: { ...chart, dug: true },
        },
        toast: 'Tide chest · +12g',
      }
    }
    case 'save-loadout':
      return {
        bag: {
          ...bag,
          loadoutB: {
            specId: bag.specId,
            talents: { ...bag.talents },
            skillBar: [...bag.skillBar],
          },
        },
        toast: 'Loadout B saved',
      }
    case 'swap-loadout': {
      if (!bag.loadoutB) return null
      const cur: HarborRpgLoadout = {
        specId: bag.specId,
        talents: { ...bag.talents },
        skillBar: [...bag.skillBar],
      }
      const next = bag.loadoutB
      const specId = next.specId && isHarborRpgSpecId(next.specId) ? next.specId : bag.specId
      return {
        bag: {
          ...bag,
          specId,
          talents: { ...next.talents },
          skillBar: [...next.skillBar],
          loadoutB: cur,
          activeLoadout: bag.activeLoadout === 'b' ? 'a' : 'b',
        },
        toast: bag.activeLoadout === 'b' ? 'Loadout A' : 'Loadout B',
      }
    }
    case 'drink-might': {
      const spent = consumeOne(bag, 'rpg-potion-might')
      if (!spent) return null
      const buffs = spent.buffs.filter((b) => b.id !== 'might')
      buffs.push({ id: 'might', until: now + HARBOR_RPG_MIGHT_MS })
      return { bag: { ...spent, buffs }, toast: 'Might · 60s' }
    }
    default:
      return null
  }
}
