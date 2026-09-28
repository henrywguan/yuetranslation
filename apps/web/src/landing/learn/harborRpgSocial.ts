/**
 * HarborRPG parties + contested need/greed loot (soft Realtime).
 */
import { isHarborRpgItemId, type HarborRpgItemId } from './harborRpgData'
import type { HarborRpgLootDrop } from './harborRpgCombat'
import { hireRpgCompanion as hireCompanionCore, HARBOR_RPG_COMPANION_COST, HARBOR_RPG_COMPANION_MS } from './harborRpgSocialLegacy'

export { HARBOR_RPG_COMPANION_COST, HARBOR_RPG_COMPANION_MS }

export type HarborRpgPartyMember = {
  userId: string
  name: string
}

export type HarborRpgPartyState = {
  id: string
  leaderId: string
  members: HarborRpgPartyMember[]
  looking: boolean
  code: string
}

export type HarborRpgPartyInvite = {
  type: 'invite'
  partyId: string
  fromId: string
  fromName: string
  toId: string
  code: string
  t: number
}

export type HarborRpgLootVote = 'need' | 'greed' | 'pass'

export type HarborRpgLootRoll = {
  id: string
  monsterId: string
  loot: HarborRpgLootDrop[]
  votes: Record<string, HarborRpgLootVote>
  rolls: Record<string, number>
  winnerId: string | null
  resolved: boolean
  partyId: string
  t: number
}

export function createRpgParty(leaderId: string, leaderName: string): HarborRpgPartyState {
  const code = `H-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  return {
    id: `party-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    leaderId,
    members: [{ userId: leaderId, name: leaderName || 'Adventurer' }],
    looking: false,
    code,
  }
}

/** @deprecated local-only helper — prefer createRpgParty */
export function emptyRpgParty(leaderName: string): HarborRpgPartyState {
  return createRpgParty('local', leaderName)
}

export function toggleRpgFinderLooking(party: HarborRpgPartyState): HarborRpgPartyState {
  return { ...party, looking: !party.looking }
}

export function inviteToRpgParty(
  party: HarborRpgPartyState,
  fromName: string,
  toId: string,
): HarborRpgPartyInvite {
  return {
    type: 'invite',
    partyId: party.id,
    fromId: party.leaderId,
    fromName,
    toId,
    code: party.code,
    t: Date.now(),
  }
}

export function acceptRpgPartyInvite(
  party: HarborRpgPartyState,
  invite: HarborRpgPartyInvite,
  userId: string,
  name: string,
): HarborRpgPartyState | null {
  if (invite.partyId !== party.id && invite.code !== party.code) {
    // Joining remote party snapshot
    return {
      id: invite.partyId,
      leaderId: invite.fromId,
      members: [
        { userId: invite.fromId, name: invite.fromName },
        { userId, name },
      ],
      looking: false,
      code: invite.code,
    }
  }
  if (party.members.some((m) => m.userId === userId)) return party
  if (party.members.length >= 5) return null
  return {
    ...party,
    members: [...party.members, { userId, name }],
    looking: false,
  }
}

export function leaveRpgParty(
  party: HarborRpgPartyState,
  userId: string,
): HarborRpgPartyState | null {
  const members = party.members.filter((m) => m.userId !== userId)
  if (members.length === 0) return null
  const leaderId =
    party.leaderId === userId ? members[0]!.userId : party.leaderId
  return { ...party, leaderId, members }
}

export function openRpgLootRoll(opts: {
  monsterId: string
  loot: HarborRpgLootDrop[]
  partyId: string
  memberIds: string[]
}): HarborRpgLootRoll {
  const votes: Record<string, HarborRpgLootVote> = {}
  for (const id of opts.memberIds) votes[id] = 'pass'
  return {
    id: `loot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    monsterId: opts.monsterId,
    loot: opts.loot,
    votes,
    rolls: {},
    winnerId: null,
    resolved: false,
    partyId: opts.partyId,
    t: Date.now(),
  }
}

export function castRpgLootVote(
  roll: HarborRpgLootRoll,
  userId: string,
  vote: HarborRpgLootVote,
  rng: () => number = Math.random,
): HarborRpgLootRoll {
  if (roll.resolved) return roll
  if (!(userId in roll.votes) && Object.keys(roll.votes).length >= 5) return roll
  const votes = { ...roll.votes, [userId]: vote }
  const rolls = { ...roll.rolls }
  if (vote === 'need' || vote === 'greed') {
    rolls[userId] = Math.floor(rng() * 100) + 1
  } else {
    delete rolls[userId]
  }
  return { ...roll, votes, rolls }
}

export function resolveRpgLootRoll(roll: HarborRpgLootRoll): HarborRpgLootRoll {
  if (roll.resolved) return roll
  const needers = Object.entries(roll.votes)
    .filter(([, v]) => v === 'need')
    .map(([id]) => id)
  const greeders = Object.entries(roll.votes)
    .filter(([, v]) => v === 'greed')
    .map(([id]) => id)
  const pool = needers.length > 0 ? needers : greeders
  if (pool.length === 0) {
    return { ...roll, resolved: true, winnerId: null }
  }
  let winnerId = pool[0]!
  let best = roll.rolls[winnerId] ?? 0
  for (const id of pool) {
    const r = roll.rolls[id] ?? 0
    if (r > best) {
      best = r
      winnerId = id
    }
  }
  return { ...roll, resolved: true, winnerId }
}

export function sanitizeRpgPartyState(raw: unknown): HarborRpgPartyState | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.id !== 'string' || !o.id) return null
  if (typeof o.leaderId !== 'string' || !o.leaderId) return null
  if (!Array.isArray(o.members)) return null
  const members: HarborRpgPartyMember[] = []
  for (const row of o.members) {
    if (!row || typeof row !== 'object') continue
    const m = row as Record<string, unknown>
    if (typeof m.userId !== 'string' || !m.userId) continue
    members.push({
      userId: m.userId.slice(0, 64),
      name:
        typeof m.name === 'string' && m.name.trim()
          ? m.name.trim().slice(0, 20)
          : 'Adventurer',
    })
    if (members.length >= 5) break
  }
  if (members.length === 0) return null
  return {
    id: o.id.slice(0, 40),
    leaderId: o.leaderId.slice(0, 64),
    members,
    looking: o.looking === true,
    code:
      typeof o.code === 'string' && o.code.trim()
        ? o.code.trim().slice(0, 12)
        : 'H-????',
  }
}

export function sanitizeRpgPartyInvite(raw: unknown): HarborRpgPartyInvite | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.type !== 'invite') return null
  if (typeof o.partyId !== 'string' || typeof o.fromId !== 'string') return null
  if (typeof o.toId !== 'string') return null
  return {
    type: 'invite',
    partyId: o.partyId.slice(0, 40),
    fromId: o.fromId.slice(0, 64),
    fromName:
      typeof o.fromName === 'string' && o.fromName.trim()
        ? o.fromName.trim().slice(0, 20)
        : 'Adventurer',
    toId: o.toId.slice(0, 64),
    code: typeof o.code === 'string' ? o.code.slice(0, 12) : 'H-????',
    t: typeof o.t === 'number' && Number.isFinite(o.t) ? o.t : Date.now(),
  }
}

export function sanitizeRpgLootRoll(raw: unknown): HarborRpgLootRoll | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.id !== 'string' || typeof o.monsterId !== 'string') return null
  if (typeof o.partyId !== 'string') return null
  if (!Array.isArray(o.loot)) return null
  const loot: HarborRpgLootDrop[] = []
  for (const row of o.loot) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    if (!isHarborRpgItemId(r.id)) continue
    const qty =
      typeof r.qty === 'number' && Number.isFinite(r.qty) && r.qty > 0
        ? Math.min(Math.floor(r.qty), 99)
        : 1
    loot.push({ id: r.id as HarborRpgItemId, qty })
  }
  return {
    id: o.id.slice(0, 40),
    monsterId: o.monsterId.slice(0, 40),
    loot,
    votes:
      o.votes && typeof o.votes === 'object' && !Array.isArray(o.votes)
        ? (o.votes as Record<string, HarborRpgLootVote>)
        : {},
    rolls:
      o.rolls && typeof o.rolls === 'object' && !Array.isArray(o.rolls)
        ? (o.rolls as Record<string, number>)
        : {},
    winnerId: typeof o.winnerId === 'string' ? o.winnerId : null,
    resolved: o.resolved === true,
    partyId: o.partyId.slice(0, 40),
    t: typeof o.t === 'number' && Number.isFinite(o.t) ? o.t : Date.now(),
  }
}

export function hireRpgCompanion(
  bag: import('./harborRpgProgress').HarborRpgBag,
  now = Date.now(),
) {
  return hireCompanionCore(bag, now)
}
