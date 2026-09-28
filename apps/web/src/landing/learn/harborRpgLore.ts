/**
 * HarborRPG campaign lore — original Harbor/Jade IP.
 * Systems / tone inspiration only: Black Desert (calamity stones, guild intrigue),
 * Elder Scrolls Online (ancient vaults, planar pressure), MapleStory (adventure isles, mirrored worlds).
 */
export const HARBOR_RPG_CAMPAIGN = {
  title: { en: 'The Tide That Remembers', zh: '記得的潮' },
  tagline: {
    en: 'When the ferry chronometers cracked, three sealed places woke — and the Harbor began to forget its own names.',
    zh: '渡船時計碎裂之時，三處封印蘇醒——港灣開始遺忘自己的名字。',
  },
} as const

/** Chapter order for the story quest chain. */
export const HARBOR_RPG_CHAPTERS = [
  {
    id: 'ch-ash',
    order: 1,
    dungeon: 'crypt' as const,
    name: { en: 'Ash Remembers', zh: '灰燼記得' },
    blurb: {
      en: 'Beneath the Ruins, the Ash Warden still patrols a war that ended with no victors — only embers that refuse to cool.',
      zh: '遺址之下，灰燼守衛仍在巡邏一場沒有勝者的舊戰——只剩不肯冷下的餘燼。',
    },
  },
  {
    id: 'ch-tide',
    order: 2,
    dungeon: 'tidehollow' as const,
    name: { en: 'Black Tide Hollow', zh: '黑潮窟' },
    blurb: {
      en: 'A calamity pearl sank here when the first guilds fought over ferry rights. It hungers for names — yours included.',
      zh: '第一代商會為渡權開戰時，一顆災厄珠沉於此。它飢渴名字——包括你的。',
    },
  },
  {
    id: 'ch-chronicle',
    order: 3,
    dungeon: 'chronicle' as const,
    name: { en: 'Chronicle Vault', zh: '紀年庫' },
    blurb: {
      en: 'Starferry clerks sealed plane-thin ledgers in stone. The ink now writes itself — and invites something that reads from the other side.',
      zh: '星渡書吏把薄如界隙的賬冊封進石中。墨水開始自書——並邀請彼岸的讀者。',
    },
  },
  {
    id: 'ch-echo',
    order: 4,
    dungeon: 'echoisle' as const,
    name: { en: 'Echo Isle', zh: '回音島' },
    blurb: {
      en: 'A mirrored pier where every sailor meets a kinder twin — until the twin decides which of you gets to keep the voyage.',
      zh: '鏡中碼頭：每位水手遇見更溫柔的自己——直到分身決定誰留下航程。',
    },
  },
  {
    id: 'ch-raid',
    order: 5,
    dungeon: 'tideraid' as const,
    name: { en: 'Tide Remembers', zh: '潮之記得' },
    blurb: {
      en: 'Three wings under one cracked chronometer: Herald, Depth Archivist, and the Tide Sovereign who would rewrite every dock’s hour.',
      zh: '裂時計下三翼：使者、深淵典吏、與要改寫每個碼頭時刻的主潮。',
    },
  },
] as const

export type HarborRpgChapterId = (typeof HARBOR_RPG_CHAPTERS)[number]['id']

export function harborRpgChapterByDungeon(
  dungeon: string,
): (typeof HARBOR_RPG_CHAPTERS)[number] | null {
  return HARBOR_RPG_CHAPTERS.find((c) => c.dungeon === dungeon) ?? null
}
