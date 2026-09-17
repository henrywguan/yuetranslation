/**
 * Harbor Quest · cosmetic titles (nametag flex).
 * Earned via play; giftable between sailors. Never grants XP / answers.
 */
export type HarborTitle = {
  id: string
  name: { en: string; zh: string }
  /** How the sailor typically unlocks it (UI hint). */
  how: { en: string; zh: string }
}

export const HARBOR_TITLE_CATALOG: readonly HarborTitle[] = [
  {
    id: 'title-river-scout',
    name: { en: 'River Scout', zh: '河童' },
    how: { en: 'Finish character creation', zh: '完成角色創建' },
  },
  {
    id: 'title-harbor-coach',
    name: { en: '港灣’s Pupil', zh: '港灣門生' },
    how: { en: 'Complete a 港灣 companion delve', zh: '完成港灣陪練' },
  },
  {
    id: 'title-generous',
    name: { en: 'Lantern Giver', zh: '贈燈人' },
    how: { en: 'Gift a lantern to another sailor', zh: '贈送紙燈給其他水手' },
  },
  {
    id: 'title-dock-mate',
    name: { en: 'Dock Mate', zh: '碼頭夥伴' },
    how: { en: 'Receive a cosmetic gift', zh: '收到化粧禮物' },
  },
] as const

export type HarborTitleId = (typeof HARBOR_TITLE_CATALOG)[number]['id']

const BY_ID = new Map(HARBOR_TITLE_CATALOG.map((t) => [t.id, t]))

export function harborTitleById(id: string): HarborTitle | undefined {
  return BY_ID.get(id)
}

export function isHarborTitleId(id: string): id is HarborTitleId {
  return BY_ID.has(id)
}

export function sanitizeOwnedTitles(raw: unknown): string[] {
  const set = new Set<string>()
  if (!Array.isArray(raw)) return []
  for (const id of raw) {
    if (typeof id === 'string' && BY_ID.has(id)) set.add(id)
  }
  return [...set]
}

export function sanitizeTitleId(raw: unknown, owned: string[]): string | null {
  if (typeof raw !== 'string' || !raw) return null
  if (!BY_ID.has(raw)) return null
  if (!owned.includes(raw)) return null
  return raw
}
