/**
 * HarborRPG Realtime presence — separate channel from Harbor Quest river.
 * Soft trust: presence + party + loot rolls + market + world tick + trade (no anti-cheat).
 */
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import type { HarborRpgZoneId } from './harborRpgData'
import type { HarborRpgLootDrop } from './harborRpgCombat'
import type { HarborRpgMarketListing } from './harborRpgProfessions'
import {
  createRpgParty,
  sanitizeRpgLootRoll,
  sanitizeRpgPartyInvite,
  sanitizeRpgPartyState,
  type HarborRpgLootRoll,
  type HarborRpgPartyInvite,
  type HarborRpgPartyState,
} from './harborRpgSocial'
import {
  HARBOR_RPG_WORLD_EVENT,
  sanitizeRpgWorldPacket,
  type HarborRpgWorldPacket,
} from './harborRpgWorldSync'
import {
  HARBOR_RPG_TRADE_EVENT,
  sanitizeRpgTradeOffer,
  type HarborRpgTradeOffer,
} from './harborRpgTrade'

export const HARBOR_RPG_PRESENCE_CHANNEL = 'harbor-rpg-realm' as const
export const HARBOR_RPG_POSE_EVENT = 'harbor-rpg-pose' as const
export const HARBOR_RPG_PARTY_EVENT = 'harbor-rpg-party' as const
export const HARBOR_RPG_LOOT_EVENT = 'harbor-rpg-loot' as const
export const HARBOR_RPG_MARKET_EVENT = 'harbor-rpg-market' as const
export const HARBOR_RPG_SOCIAL_EVENT = 'harbor-rpg-social' as const

export type HarborRpgSocialPacket = {
  kind: 'mail' | 'whisper' | 'duel-challenge' | 'duel-accept' | 'duel-hit' | 'pledge'
  to: string
  from: string
  fromId: string
  mail?: import('./harborRpgMedium').HarborRpgMail
  body?: string
  damage?: number
  text?: string
  id?: string
  fleet?: string
}

export type HarborRpgPresenceState = {
  userId: string
  username: string
  x: number
  z: number
  yaw: number
  zone: HarborRpgZoneId
  level: number
  partyId: string | null
  lookingRole: import('./harborRpgFinder').HarborRpgFinderRole | null
  lookingDungeon: import('./harborRpgFinder').HarborRpgFinderDungeon | null
  /** Active mount id when riding (null/undefined = on foot). */
  activeMountId: string | null
  /** Equipped wardrobe cosmetic id (null = River Scout look). */
  equippedCosmetic: string | null
  afk: boolean
  fleetName: string | null
  activeTitleId: string | null
  weaponId: string | null
  updatedAt: number
}

export type HarborRpgPosePacket = {
  userId: string
  x: number
  z: number
  yaw: number
  zone: HarborRpgZoneId
  t: number
  activeMountId?: string | null
  equippedCosmetic?: string | null
}

export type HarborRpgRemotePlayer = HarborRpgPresenceState

function sanitizePresence(raw: unknown, key: string): HarborRpgPresenceState | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const userId =
    typeof o.userId === 'string' && o.userId
      ? o.userId
      : typeof key === 'string' && key
        ? key
        : null
  if (!userId) return null
  const username =
    typeof o.username === 'string' && o.username.trim()
      ? o.username.trim().slice(0, 24)
      : 'Adventurer'
  const zone =
    typeof o.zone === 'string' && o.zone.length < 20 ? (o.zone as HarborRpgZoneId) : 'meadow'
  return {
    userId,
    username,
    x: typeof o.x === 'number' && Number.isFinite(o.x) ? o.x : 0,
    z: typeof o.z === 'number' && Number.isFinite(o.z) ? o.z : 0,
    yaw: typeof o.yaw === 'number' && Number.isFinite(o.yaw) ? o.yaw : 0,
    zone,
    level:
      typeof o.level === 'number' && Number.isFinite(o.level)
        ? Math.max(1, Math.floor(o.level))
        : 1,
    partyId: typeof o.partyId === 'string' ? o.partyId.slice(0, 40) : null,
    lookingRole:
      o.lookingRole === 'tank' || o.lookingRole === 'heal' || o.lookingRole === 'dps'
        ? o.lookingRole
        : null,
    lookingDungeon:
      typeof o.lookingDungeon === 'string' && o.lookingDungeon.length < 24
        ? (o.lookingDungeon as HarborRpgPresenceState['lookingDungeon'])
        : null,
    activeMountId:
      typeof o.activeMountId === 'string' && o.activeMountId.length < 32
        ? o.activeMountId
        : null,
    equippedCosmetic:
      typeof o.equippedCosmetic === 'string' && o.equippedCosmetic.length < 40
        ? o.equippedCosmetic
        : null,
    afk: o.afk === true,
    fleetName:
      typeof o.fleetName === 'string' && o.fleetName.trim()
        ? o.fleetName.trim().slice(0, 24)
        : null,
    activeTitleId:
      typeof o.activeTitleId === 'string' && o.activeTitleId.trim()
        ? o.activeTitleId.trim().slice(0, 40)
        : null,
    weaponId:
      typeof o.weaponId === 'string' && o.weaponId.length < 40 ? o.weaponId : null,
    updatedAt:
      typeof o.updatedAt === 'number' && Number.isFinite(o.updatedAt)
        ? o.updatedAt
        : Date.now(),
  }
}

function sanitizePose(raw: unknown): HarborRpgPosePacket | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.userId !== 'string' || !o.userId) return null
  return {
    userId: o.userId,
    x: typeof o.x === 'number' && Number.isFinite(o.x) ? o.x : 0,
    z: typeof o.z === 'number' && Number.isFinite(o.z) ? o.z : 0,
    yaw: typeof o.yaw === 'number' && Number.isFinite(o.yaw) ? o.yaw : 0,
    zone:
      typeof o.zone === 'string' && o.zone.length < 20
        ? (o.zone as HarborRpgZoneId)
        : 'meadow',
    t: typeof o.t === 'number' && Number.isFinite(o.t) ? o.t : Date.now(),
    activeMountId:
      typeof o.activeMountId === 'string' && o.activeMountId.length < 32
        ? o.activeMountId
        : o.activeMountId === null
          ? null
          : undefined,
    equippedCosmetic:
      typeof o.equippedCosmetic === 'string' && o.equippedCosmetic.length < 40
        ? o.equippedCosmetic
        : o.equippedCosmetic === null
          ? null
          : undefined,
  }
}

export function remotesFromRpgPresence(
  state: Record<string, unknown[]>,
  selfUserId: string,
): HarborRpgRemotePlayer[] {
  const out: HarborRpgRemotePlayer[] = []
  const seen = new Set<string>()
  for (const [key, metas] of Object.entries(state)) {
    if (!Array.isArray(metas) || metas.length === 0) continue
    const parsed = sanitizePresence(metas[0], key)
    if (!parsed || parsed.userId === selfUserId) continue
    if (seen.has(parsed.userId)) continue
    seen.add(parsed.userId)
    out.push(parsed)
  }
  return out
}

/** Zone peer ids for host election (self + remotes in same zone). */
export function rpgZonePeerIds(
  selfId: string,
  remotes: HarborRpgRemotePlayer[],
  zone: HarborRpgZoneId,
): string[] {
  const ids = [selfId]
  for (const r of remotes) {
    if (r.zone === zone) ids.push(r.userId)
  }
  return ids
}

export type HarborRpgPresenceSession = {
  channel: RealtimeChannel
  track: (pose: {
    x: number
    z: number
    yaw: number
    zone: HarborRpgZoneId
    level: number
    partyId: string | null
    username?: string
    lookingRole?: HarborRpgPresenceState['lookingRole']
    lookingDungeon?: HarborRpgPresenceState['lookingDungeon']
    activeMountId?: string | null
    equippedCosmetic?: string | null
    afk?: boolean
    fleetName?: string | null
    activeTitleId?: string | null
    weaponId?: string | null
  }) => Promise<void>
  broadcastPose: (pose: {
    x: number
    z: number
    yaw: number
    zone: HarborRpgZoneId
    activeMountId?: string | null
    equippedCosmetic?: string | null
  }) => void
  broadcastParty: (party: HarborRpgPartyState | HarborRpgPartyInvite) => void
  broadcastLootRoll: (roll: HarborRpgLootRoll) => void
  broadcastMarket: (listings: HarborRpgMarketListing[]) => void
  broadcastWorld: (packet: HarborRpgWorldPacket) => void
  broadcastTrade: (offer: HarborRpgTradeOffer) => void
  broadcastSocial: (packet: HarborRpgSocialPacket) => void
  stop: () => Promise<void>
}

function sanitizeSocial(raw: unknown): HarborRpgSocialPacket | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const kind = o.kind
  if (
    kind !== 'mail' &&
    kind !== 'whisper' &&
    kind !== 'duel-challenge' &&
    kind !== 'duel-accept' &&
    kind !== 'duel-hit' &&
    kind !== 'pledge'
  ) {
    return null
  }
  if (typeof o.to !== 'string' || typeof o.from !== 'string' || typeof o.fromId !== 'string') return null
  const packet: HarborRpgSocialPacket = {
    kind,
    to: o.to.slice(0, 40),
    from: o.from.slice(0, 24),
    fromId: o.fromId.slice(0, 64),
  }
  if (typeof o.body === 'string') packet.body = o.body.slice(0, 180)
  if (typeof o.text === 'string') packet.text = o.text.slice(0, 80)
  if (typeof o.id === 'string') packet.id = o.id.slice(0, 40)
  if (typeof o.fleet === 'string') packet.fleet = o.fleet.slice(0, 24)
  if (typeof o.damage === 'number' && Number.isFinite(o.damage)) {
    packet.damage = Math.max(1, Math.min(80, Math.floor(o.damage)))
  }
  if (o.mail && typeof o.mail === 'object') {
    const m = o.mail as Record<string, unknown>
    if (typeof m.id === 'string' && typeof m.subject === 'string') {
      packet.mail = {
        id: m.id.slice(0, 40),
        from: typeof m.from === 'string' ? m.from.slice(0, 24) : packet.from,
        subject: m.subject.slice(0, 40),
        body: typeof m.body === 'string' ? m.body.slice(0, 180) : '',
        gold: typeof m.gold === 'number' && Number.isFinite(m.gold) ? Math.max(0, Math.min(5000, Math.floor(m.gold))) : 0,
        read: false,
        t: typeof m.t === 'number' && Number.isFinite(m.t) ? Math.floor(m.t) : Date.now(),
      }
    }
  }
  return packet
}

export function startHarborRpgPresence(opts: {
  supabase: SupabaseClient
  userId: string
  username: string
  onRemotes: (remotes: HarborRpgRemotePlayer[]) => void
  onPose?: (pose: HarborRpgPosePacket) => void
  onParty?: (msg: HarborRpgPartyState | HarborRpgPartyInvite) => void
  onLootRoll?: (roll: HarborRpgLootRoll) => void
  onMarket?: (listings: HarborRpgMarketListing[]) => void
  onWorld?: (packet: HarborRpgWorldPacket) => void
  onTrade?: (offer: HarborRpgTradeOffer) => void
  onSocial?: (packet: HarborRpgSocialPacket) => void
}): HarborRpgPresenceSession {
  const { supabase, userId, username } = opts
  const channel = supabase.channel(HARBOR_RPG_PRESENCE_CHANNEL, {
    config: {
      presence: { key: userId },
      broadcast: { self: false },
    },
  })

  const emitRemotes = () => {
    const state = channel.presenceState() as Record<string, unknown[]>
    opts.onRemotes(remotesFromRpgPresence(state, userId))
  }

  channel
    .on('presence', { event: 'sync' }, emitRemotes)
    .on('presence', { event: 'join' }, emitRemotes)
    .on('presence', { event: 'leave' }, emitRemotes)
    .on('broadcast', { event: HARBOR_RPG_POSE_EVENT }, ({ payload }) => {
      const pose = sanitizePose(payload)
      if (!pose || pose.userId === userId) return
      opts.onPose?.(pose)
    })
    .on('broadcast', { event: HARBOR_RPG_PARTY_EVENT }, ({ payload }) => {
      const invite = sanitizeRpgPartyInvite(payload)
      if (invite) {
        opts.onParty?.(invite)
        return
      }
      const party = sanitizeRpgPartyState(payload)
      if (party) opts.onParty?.(party)
    })
    .on('broadcast', { event: HARBOR_RPG_LOOT_EVENT }, ({ payload }) => {
      const roll = sanitizeRpgLootRoll(payload)
      if (roll) opts.onLootRoll?.(roll)
    })
    .on('broadcast', { event: HARBOR_RPG_MARKET_EVENT }, ({ payload }) => {
      if (!payload || typeof payload !== 'object') return
      const listings = (payload as { listings?: unknown }).listings
      if (!Array.isArray(listings)) return
      opts.onMarket?.(listings as HarborRpgMarketListing[])
    })
    .on('broadcast', { event: HARBOR_RPG_WORLD_EVENT }, ({ payload }) => {
      const packet = sanitizeRpgWorldPacket(payload)
      if (!packet || packet.hostId === userId) return
      opts.onWorld?.(packet)
    })
    .on('broadcast', { event: HARBOR_RPG_SOCIAL_EVENT }, ({ payload }) => {
      const packet = sanitizeSocial(payload)
      if (!packet || packet.fromId === userId) return
      opts.onSocial?.(packet)
    })
    .on('broadcast', { event: HARBOR_RPG_TRADE_EVENT }, ({ payload }) => {
      const offer = sanitizeRpgTradeOffer(payload)
      if (!offer || offer.fromId === userId) return
      if (offer.toId !== userId && offer.type !== 'cancel') return
      opts.onTrade?.(offer)
    })

  void channel.subscribe()

  return {
    channel,
    async track(pose) {
      const payload: HarborRpgPresenceState = {
        userId,
        username: pose.username?.trim() || username,
        x: pose.x,
        z: pose.z,
        yaw: pose.yaw,
        zone: pose.zone,
        level: pose.level,
        partyId: pose.partyId,
        lookingRole: pose.lookingRole ?? null,
        lookingDungeon: pose.lookingDungeon ?? null,
        activeMountId: pose.activeMountId ?? null,
        equippedCosmetic: pose.equippedCosmetic ?? null,
        afk: pose.afk === true,
        fleetName: pose.fleetName ?? null,
        activeTitleId: pose.activeTitleId ?? null,
        weaponId: pose.weaponId ?? null,
        updatedAt: Date.now(),
      }
      await channel.track(payload)
    },
    broadcastPose(pose) {
      const packet: HarborRpgPosePacket = {
        userId,
        x: pose.x,
        z: pose.z,
        yaw: pose.yaw,
        zone: pose.zone,
        t: Date.now(),
        activeMountId: pose.activeMountId ?? null,
        equippedCosmetic: pose.equippedCosmetic ?? null,
      }
      void channel.send({
        type: 'broadcast',
        event: HARBOR_RPG_POSE_EVENT,
        payload: packet,
      })
    },
    broadcastParty(party) {
      void channel.send({
        type: 'broadcast',
        event: HARBOR_RPG_PARTY_EVENT,
        payload: party,
      })
    },
    broadcastLootRoll(roll) {
      void channel.send({
        type: 'broadcast',
        event: HARBOR_RPG_LOOT_EVENT,
        payload: roll,
      })
    },
    broadcastMarket(listings) {
      void channel.send({
        type: 'broadcast',
        event: HARBOR_RPG_MARKET_EVENT,
        payload: { listings },
      })
    },
    broadcastWorld(packet) {
      void channel.send({
        type: 'broadcast',
        event: HARBOR_RPG_WORLD_EVENT,
        payload: packet,
      })
    },
    broadcastTrade(offer) {
      void channel.send({
        type: 'broadcast',
        event: HARBOR_RPG_TRADE_EVENT,
        payload: offer,
      })
    },
    broadcastSocial(packet) {
      void channel.send({
        type: 'broadcast',
        event: HARBOR_RPG_SOCIAL_EVENT,
        payload: packet,
      })
    },
    async stop() {
      await supabase.removeChannel(channel)
    },
  }
}

export function bootstrapLocalParty(leaderId: string, leaderName: string): HarborRpgPartyState {
  return createRpgParty(leaderId, leaderName)
}

export type { HarborRpgLootDrop }
