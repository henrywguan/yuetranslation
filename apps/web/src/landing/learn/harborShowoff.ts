/**
 * Harbor Quest · showoff cosmetics (v5) + free event grants (v6).
 * Nametag frames, chat bubbles, pier chairs, pets, emotes — social visibility.
 * All cosmetic. No gacha (deferred). Free seasonal events encouraged.
 */
export type HarborShowoffKind = 'nametag' | 'bubble' | 'chair' | 'pet' | 'emote'

export type HarborShowoffItem = {
  id: string
  kind: HarborShowoffKind
  name: { en: string; zh: string }
  /** Ferry-coin price; 0 = free / event / starter. */
  price: number
  tier: 'common' | 'mid' | 'high' | 'vip' | 'event'
  /** Canvas / mesh accent color. */
  accent: number
}

export type HarborShowoffLook = {
  nametag: string
  bubble: string
  chair: string
  pet: string
  /** Last played emote id (not equipped long-term). */
  emote: string | null
}

export type HarborShowoffBag = {
  owned: string[]
  look: HarborShowoffLook
  /** Event ids already claimed (idempotent grants). */
  claimedEvents: string[]
}

export const HARBOR_SHOWOFF_CATALOG: readonly HarborShowoffItem[] = [
  // Nametag frames
  {
    id: 'tag-plain',
    kind: 'nametag',
    name: { en: 'Plain plate', zh: '素牌' },
    price: 0,
    tier: 'common',
    accent: 0x3dcfb6,
  },
  {
    id: 'tag-jade',
    kind: 'nametag',
    name: { en: 'Jade trim plate', zh: '玉邊牌' },
    price: 36,
    tier: 'mid',
    accent: 0x3dcfb6,
  },
  {
    id: 'tag-ink',
    kind: 'nametag',
    name: { en: 'Ink seal plate', zh: '墨印牌' },
    price: 64,
    tier: 'high',
    accent: 0xc4a860,
  },
  {
    id: 'tag-phoenix',
    kind: 'nametag',
    name: { en: 'Phoenix gilt plate', zh: '鳳金牌' },
    price: 4200,
    tier: 'vip',
    accent: 0xf0d060,
  },
  {
    id: 'tag-lantern-fest',
    kind: 'nametag',
    name: { en: 'Lantern Fest plate', zh: '燈節牌' },
    price: 0,
    tier: 'event',
    accent: 0xe07040,
  },
  // Chat bubbles
  {
    id: 'bubble-plain',
    kind: 'bubble',
    name: { en: 'Plain say', zh: '素說' },
    price: 0,
    tier: 'common',
    accent: 0xe8f7f4,
  },
  {
    id: 'bubble-jade',
    kind: 'bubble',
    name: { en: 'Jade say', zh: '玉說' },
    price: 28,
    tier: 'mid',
    accent: 0x3dcfb6,
  },
  {
    id: 'bubble-phoenix',
    kind: 'bubble',
    name: { en: 'Phoenix say', zh: '鳳說' },
    price: 3800,
    tier: 'vip',
    accent: 0xf0a040,
  },
  {
    id: 'bubble-midautumn',
    kind: 'bubble',
    name: { en: 'Mooncake say', zh: '月餅說' },
    price: 0,
    tier: 'event',
    accent: 0xe8c878,
  },
  // Pier chairs (placeable sit props — mesh later)
  {
    id: 'chair-stool',
    kind: 'chair',
    name: { en: 'Harbor stool', zh: '港凳' },
    price: 0,
    tier: 'common',
    accent: 0x8a6038,
  },
  {
    id: 'chair-bamboo',
    kind: 'chair',
    name: { en: 'Bamboo pier chair', zh: '竹碼頭椅' },
    price: 44,
    tier: 'mid',
    accent: 0xc4a860,
  },
  {
    id: 'chair-jade-throne',
    kind: 'chair',
    name: { en: 'Jade resting throne', zh: '玉憩座' },
    price: 5600,
    tier: 'vip',
    accent: 0x3dcfb6,
  },
  {
    id: 'chair-dragonboat',
    kind: 'chair',
    name: { en: 'Dragon Boat bench', zh: '龍舟長凳' },
    price: 0,
    tier: 'event',
    accent: 0x8a2a30,
  },
  // Pets (follow companion — mesh later)
  {
    id: 'pet-none',
    kind: 'pet',
    name: { en: 'No pet', zh: '無寵' },
    price: 0,
    tier: 'common',
    accent: 0x4a5860,
  },
  {
    id: 'pet-river-cat',
    kind: 'pet',
    name: { en: 'River cat', zh: '河貓' },
    price: 72,
    tier: 'mid',
    accent: 0xc4a070,
  },
  {
    id: 'pet-jade-carp',
    kind: 'pet',
    name: { en: 'Jade carp spirit', zh: '玉鯉靈' },
    price: 4800,
    tier: 'vip',
    accent: 0x3dcfb6,
  },
  {
    id: 'pet-lantern-fox',
    kind: 'pet',
    name: { en: 'Lantern fox', zh: '燈狐' },
    price: 0,
    tier: 'event',
    accent: 0xe07040,
  },
  // Emotes
  {
    id: 'emote-wave',
    kind: 'emote',
    name: { en: 'Wave', zh: '揮手' },
    price: 0,
    tier: 'common',
    accent: 0x3dcfb6,
  },
  {
    id: 'emote-bow',
    kind: 'emote',
    name: { en: 'Bow', zh: '鞠躬' },
    price: 0,
    tier: 'common',
    accent: 0xc4a860,
  },
  {
    id: 'emote-clap',
    kind: 'emote',
    name: { en: 'Clap', zh: '鼓掌' },
    price: 12,
    tier: 'mid',
    accent: 0xe8d8b0,
  },
  {
    id: 'emote-lantern-raise',
    kind: 'emote',
    name: { en: 'Raise lantern', zh: '舉燈' },
    price: 36,
    tier: 'high',
    accent: 0xe07040,
  },
  {
    id: 'emote-phoenix-spin',
    kind: 'emote',
    name: { en: 'Phoenix spin', zh: '鳳旋' },
    price: 3200,
    tier: 'vip',
    accent: 0xf0d060,
  },
]

export type HarborEventId = 'event-lantern-fest' | 'event-midautumn' | 'event-dragonboat'

export type HarborEventDef = {
  id: HarborEventId
  name: { en: string; zh: string }
  /** Showoff item ids granted once when claimed. */
  grants: readonly string[]
}

/** Free seasonal / festival cosmetics — no purchase, no gacha. */
export const HARBOR_FREE_EVENTS: readonly HarborEventDef[] = [
  {
    id: 'event-lantern-fest',
    name: { en: 'Lantern Festival', zh: '元宵燈節' },
    grants: ['tag-lantern-fest', 'pet-lantern-fox'],
  },
  {
    id: 'event-midautumn',
    name: { en: 'Mid-Autumn', zh: '中秋' },
    grants: ['bubble-midautumn'],
  },
  {
    id: 'event-dragonboat',
    name: { en: 'Dragon Boat', zh: '端午龍舟' },
    grants: ['chair-dragonboat'],
  },
]

const BY_ID = new Map(HARBOR_SHOWOFF_CATALOG.map((i) => [i.id, i]))

export const HARBOR_DEFAULT_SHOWOFF_LOOK: HarborShowoffLook = {
  nametag: 'tag-plain',
  bubble: 'bubble-plain',
  chair: 'chair-stool',
  pet: 'pet-none',
  emote: null,
}

export function emptyHarborShowoffBag(): HarborShowoffBag {
  return {
    owned: HARBOR_SHOWOFF_CATALOG.filter((i) => i.price === 0 && i.tier !== 'event').map((i) => i.id),
    look: { ...HARBOR_DEFAULT_SHOWOFF_LOOK },
    claimedEvents: [],
  }
}

export function harborShowoffById(id: string): HarborShowoffItem | undefined {
  return BY_ID.get(id)
}

export function harborShowoffForKind(kind: HarborShowoffKind): HarborShowoffItem[] {
  return HARBOR_SHOWOFF_CATALOG.filter((i) => i.kind === kind)
}

export function sanitizeHarborShowoffBag(raw: unknown): HarborShowoffBag {
  const base = emptyHarborShowoffBag()
  if (!raw || typeof raw !== 'object') return base
  const o = raw as Record<string, unknown>
  const owned = new Set(base.owned)
  if (Array.isArray(o.owned)) {
    for (const id of o.owned) {
      if (typeof id === 'string' && BY_ID.has(id)) owned.add(id)
    }
  }
  const look = { ...HARBOR_DEFAULT_SHOWOFF_LOOK }
  if (o.look && typeof o.look === 'object' && !Array.isArray(o.look)) {
    const L = o.look as Record<string, unknown>
    for (const key of ['nametag', 'bubble', 'chair', 'pet'] as const) {
      const id = L[key]
      if (typeof id === 'string' && BY_ID.has(id) && owned.has(id)) look[key] = id
    }
    if (typeof L.emote === 'string' && BY_ID.has(L.emote)) look.emote = L.emote
    else look.emote = null
  }
  const claimedEvents: string[] = []
  if (Array.isArray(o.claimedEvents)) {
    for (const id of o.claimedEvents) {
      if (typeof id === 'string' && HARBOR_FREE_EVENTS.some((e) => e.id === id)) {
        if (!claimedEvents.includes(id)) claimedEvents.push(id)
      }
    }
  }
  return { owned: [...owned], look, claimedEvents }
}

export function mergeHarborShowoffBag(a: HarborShowoffBag, b: HarborShowoffBag): HarborShowoffBag {
  const owned = new Set([...a.owned, ...b.owned])
  const claimed = new Set([...a.claimedEvents, ...b.claimedEvents])
  // Prefer newer equipped look from b when owned
  const look: HarborShowoffLook = { ...a.look }
  for (const key of ['nametag', 'bubble', 'chair', 'pet'] as const) {
    const id = b.look[key]
    if (owned.has(id)) look[key] = id
  }
  if (b.look.emote && owned.has(b.look.emote)) look.emote = b.look.emote
  return { owned: [...owned], look, claimedEvents: [...claimed] }
}

/**
 * Claim a free event once — grants cosmetics into the bag.
 * Idempotent: already-claimed events return the bag unchanged.
 */
export function claimHarborFreeEvent(
  bagIn: HarborShowoffBag,
  eventId: HarborEventId,
): { bag: HarborShowoffBag; granted: string[]; already: boolean } {
  const bag = sanitizeHarborShowoffBag(structuredClone(bagIn))
  const ev = HARBOR_FREE_EVENTS.find((e) => e.id === eventId)
  if (!ev) return { bag, granted: [], already: true }
  if (bag.claimedEvents.includes(eventId)) return { bag, granted: [], already: true }
  const granted: string[] = []
  for (const id of ev.grants) {
    if (!BY_ID.has(id)) continue
    if (!bag.owned.includes(id)) {
      bag.owned.push(id)
      granted.push(id)
    }
  }
  bag.claimedEvents.push(eventId)
  return { bag, granted, already: false }
}

/** Accent hex for nametag / bubble rendering. */
export function harborShowoffAccent(id: string): number {
  return BY_ID.get(id)?.accent ?? 0x3dcfb6
}
