/**
 * HarborRPG medium systems — soft social + world depth (no anti-cheat).
 * Friends, fleet, mail, emotes, duels, deed rewards, rifts, delves, mount race, weather label.
 */
import {
  HARBOR_RPG_ACHIEVEMENT_IDS,
  harborRpgAchievementDone,
  type HarborRpgAchievementId,
} from './harborRpgAchievements'
import { isHarborRpgZoneId, type HarborRpgZoneId } from './harborRpgData'
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
  inbox: HarborRpgMail[]
  claimedDeeds: string[]
  delveFloor: number
  delveBest: number
  delveMark: number
  riftClears: number
  riftMark: number
  raceBestMs: number | null
  raceRuns: number
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

export function emptyRpgMedium(): HarborRpgMediumSlice {
  return {
    friends: [],
    afk: false,
    afkNote: '',
    fleetName: null,
    fleetMotto: '',
    inbox: [],
    claimedDeeds: [],
    delveFloor: 1,
    delveBest: 0,
    delveMark: 0,
    riftClears: 0,
    riftMark: 0,
    raceBestMs: null,
    raceRuns: 0,
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
  return {
    friends,
    afk: o.afk === true,
    afkNote: typeof o.afkNote === 'string' ? clipName(o.afkNote, 80) : '',
    fleetName,
    fleetMotto: typeof o.fleetMotto === 'string' ? clipName(o.fleetMotto, 80) : '',
    inbox,
    claimedDeeds,
    delveFloor,
    delveBest: num('delveBest', 8),
    delveMark: num('delveMark', 1_000_000),
    riftClears: num('riftClears', 1_000_000),
    riftMark: num('riftMark', 1_000_000),
    raceBestMs:
      typeof o.raceBestMs === 'number' && Number.isFinite(o.raceBestMs) && o.raceBestMs > 0
        ? Math.min(600_000, Math.floor(o.raceBestMs))
        : null,
    raceRuns: num('raceRuns', 1_000_000),
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
    inbox,
    claimedDeeds: claimed,
    delveFloor: Math.max(a.delveFloor, b.delveFloor),
    delveBest: Math.max(a.delveBest, b.delveBest),
    delveMark: Math.max(a.delveMark, b.delveMark),
    riftClears: Math.max(a.riftClears, b.riftClears),
    riftMark: Math.max(a.riftMark, b.riftMark),
    raceBestMs:
      a.raceBestMs == null
        ? b.raceBestMs
        : b.raceBestMs == null
          ? a.raceBestMs
          : Math.min(a.raceBestMs, b.raceBestMs),
    raceRuns: Math.max(a.raceRuns, b.raceRuns),
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
  | { type: 'claim-delve'; roll: number }
  | { type: 'enter-rift' }
  | { type: 'claim-rift'; roll: number }
  | { type: 'race'; elapsedMs: number; mounted: boolean }
  | { type: 'emote'; id: string }
  | { type: 'duel'; foe: string }
  | { type: 'zone'; zone: HarborRpgZoneId }

export type HarborRpgMediumResult = {
  bag: HarborRpgBag
  toast: string
  /** Zone to travel to, when the action moves the sailor. */
  zone?: HarborRpgZoneId
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
        return { bag: { ...bag, fleetName: null, fleetMotto: '' }, toast: 'Left fleet' }
      }
      return {
        bag: { ...bag, fleetName: name, fleetMotto: clipName(action.motto, 80) },
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
      // Soft local copy so the sender sees the raven leave; remotes apply receive-mail.
      return {
        bag: {
          ...bag,
          gold: bag.gold - gold,
          inbox: [{ ...mail, from: `→ ${to}` }, ...bag.inbox].slice(0, 20),
        },
        toast: gold ? `Raven sent · ${gold}g` : 'Raven sent',
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
      const lock = action.roll < 0.45 + bag.delveFloor * 0.05
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
    case 'enter-rift':
      return {
        bag: { ...bag, riftMark: killSum(bag), zone: 'rift' },
        toast: 'Rift opened',
        zone: 'rift',
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
    case 'duel': {
      const foe = clipName(action.foe)
      if (!foe) return null
      return { bag, toast: `Duel challenge · ${foe}` }
    }
    case 'zone': {
      if (!isHarborRpgZoneId(action.zone)) return null
      return { bag: { ...bag, zone: action.zone }, toast: `Travel · ${action.zone}`, zone: action.zone }
    }
    case 'race': {
      if (!action.mounted) return null
      const ms = Math.floor(action.elapsedMs)
      if (ms < 3000 || ms > 180_000) return null
      const beat = ms <= 45_000
      const best =
        bag.raceBestMs == null ? ms : Math.min(bag.raceBestMs, ms)
      const gold = beat ? 20 : 0
      return {
        bag: {
          ...bag,
          raceRuns: bag.raceRuns + 1,
          raceBestMs: best,
          gold: Math.min(10_000_000, bag.gold + gold),
        },
        toast: beat ? `Race clear · ${(ms / 1000).toFixed(1)}s · +${gold}g` : `Race · ${(ms / 1000).toFixed(1)}s`,
      }
    }
    default:
      return null
  }
}
