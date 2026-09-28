/**
 * HarborRPG soft achievements — wiki progress only (no anti-cheat).
 * Progress is derived from the bag; claims are display-only.
 */
import { HARBOR_RPG_QUESTS, type HarborRpgMonsterKind } from './harborRpgData'
import { HARBOR_RPG_MOUNT_IDS } from './harborRpgMounts'
import type { HarborRpgBag } from './harborRpgProgress'

export const HARBOR_RPG_ACHIEVEMENT_IDS = [
  'ach-first-char',
  'ach-first-class',
  'ach-slime-5',
  'ach-slime-25',
  'ach-boss-ash',
  'ach-boss-pearl',
  'ach-boss-ink',
  'ach-boss-mirror',
  'ach-boss-sovereign',
  'ach-heroic-seal',
  'ach-quest-5',
  'ach-quest-20',
  'ach-quest-all',
  'ach-mount-starter',
  'ach-mount-5',
  'ach-mount-15',
  'ach-mount-all',
  'ach-gold-100',
  'ach-gold-1000',
  'ach-craft-first',
  'ach-companion',
  'ach-prestige',
  'ach-zone-crypt',
  'ach-zone-raid',
  'ach-finder-ready',
] as const

export type HarborRpgAchievementId = (typeof HARBOR_RPG_ACHIEVEMENT_IDS)[number]

export type HarborRpgAchievementDef = {
  id: HarborRpgAchievementId
  name: { en: string; zh: string }
  blurb: { en: string; zh: string }
  /** How to obtain — shown on the wiki page. */
  how: { en: string; zh: string }
  category: 'story' | 'combat' | 'collection' | 'economy' | 'social'
  /** Soft target for progress bars (1 = boolean). */
  target: number
}

export const HARBOR_RPG_ACHIEVEMENTS: Record<
  HarborRpgAchievementId,
  HarborRpgAchievementDef
> = {
  'ach-first-char': {
    id: 'ach-first-char',
    name: { en: 'Named on the Tide', zh: '潮上之名' },
    blurb: { en: 'Create your first HarborRPG adventurer.', zh: '建立首位冒險洲角色。' },
    how: { en: 'Open Field → New character and save a name.', zh: '開啟野外→新建角色並命名。' },
    category: 'story',
    target: 1,
  },
  'ach-first-class': {
    id: 'ach-first-class',
    name: { en: 'Path Chosen', zh: '擇道' },
    blurb: { en: 'Pick an adventuring class.', zh: '選擇冒險職業。' },
    how: { en: 'Open the Class tab and select any of the 9 classes.', zh: '開啟職業分頁，選擇九職之一。' },
    category: 'story',
    target: 1,
  },
  'ach-slime-5': {
    id: 'ach-slime-5',
    name: { en: 'Slime Sweep I', zh: '史萊姆清掃 I' },
    blurb: { en: 'Defeat 5 Meadow Slimes.', zh: '打倒5隻草原史萊姆。' },
    how: { en: 'Kill slimes in Meadow or Pinewood / Echo Isle packs.', zh: '在草原、松林或回聲島擊殺史萊姆。' },
    category: 'combat',
    target: 5,
  },
  'ach-slime-25': {
    id: 'ach-slime-25',
    name: { en: 'Slime Sweep II', zh: '史萊姆清掃 II' },
    blurb: { en: 'Defeat 25 Meadow Slimes.', zh: '打倒25隻草原史萊姆。' },
    how: { en: 'Keep clearing slime packs across hubs and Echo Isle.', zh: '持續清理各樞紐與回聲島史萊姆群。' },
    category: 'combat',
    target: 25,
  },
  'ach-boss-ash': {
    id: 'ach-boss-ash',
    name: { en: 'Ash Remembers', zh: '灰燼記得' },
    blurb: { en: 'Defeat the Ash Warden in Ash Crypt.', zh: '於灰燼地牢擊敗灰燼守衛。' },
    how: {
      en: 'Town → Ruins gate quests → portal to Crypt · defeat Ash Warden.',
      zh: '小鎮→遺址任務→地牢傳送門，擊敗灰燼守衛。',
    },
    category: 'combat',
    target: 1,
  },
  'ach-boss-pearl': {
    id: 'ach-boss-pearl',
    name: { en: 'Name Hunger', zh: '名之飢' },
    blurb: { en: 'Defeat the Pearl Host in Tidehollow.', zh: '於潮窟擊敗珠宿主。' },
    how: { en: 'Marsh story gate → Tidehollow · defeat Pearl Host.', zh: '澤地劇情門→潮窟，擊敗珠宿主。' },
    category: 'combat',
    target: 1,
  },
  'ach-boss-ink': {
    id: 'ach-boss-ink',
    name: { en: 'Self-Writing', zh: '自書' },
    blurb: { en: 'Defeat the Ink Archivist in Chronicle.', zh: '於編年擊敗墨檔案官。' },
    how: { en: 'Town chronicle gate → Chronicle instance · defeat Ink Archivist.', zh: '小鎮編年門→編年副本，擊敗墨檔案官。' },
    category: 'combat',
    target: 1,
  },
  'ach-boss-mirror': {
    id: 'ach-boss-mirror',
    name: { en: 'Who Keeps the Voyage', zh: '誰留航程' },
    blurb: { en: 'Defeat the Mirror Ferry on Echo Isle.', zh: '於回聲島擊敗鏡渡。' },
    how: { en: 'Pinewood echo gate → Echo Isle · defeat Mirror Ferry.', zh: '松林回聲門→回聲島，擊敗鏡渡。' },
    category: 'combat',
    target: 1,
  },
  'ach-boss-sovereign': {
    id: 'ach-boss-sovereign',
    name: { en: 'Tide Remembers', zh: '潮記得' },
    blurb: { en: 'Defeat the Tide Sovereign raid finale.', zh: '擊敗主潮團本終局。' },
    how: {
      en: 'Town raid portal → Tide Remembers · clear Herald, Depth, then Sovereign.',
      zh: '小鎮團本門→潮記得，清先驅、深淵，再擊敗主潮。',
    },
    category: 'combat',
    target: 1,
  },
  'ach-heroic-seal': {
    id: 'ach-heroic-seal',
    name: { en: 'Heroic Ferry', zh: '英雄渡印' },
    blurb: { en: 'Loot a Heroic Ferry Seal.', zh: '取得一枚英雄渡印。' },
    how: {
      en: 'Set Quests → Heroic, remount an instance, kill bosses / raid packs.',
      zh: '任務分頁開英雄難度，重進副本，擊殺首領／團本怪。',
    },
    category: 'combat',
    target: 1,
  },
  'ach-quest-5': {
    id: 'ach-quest-5',
    name: { en: 'Board Runner I', zh: '任務板行者 I' },
    blurb: { en: 'Claim 5 quests.', zh: '領取並完成5個任務獎勵。' },
    how: { en: 'Town Quest Board — accept, complete objectives, claim.', zh: '小鎮任務板——接取、完成目標、領獎。' },
    category: 'story',
    target: 5,
  },
  'ach-quest-20': {
    id: 'ach-quest-20',
    name: { en: 'Board Runner II', zh: '任務板行者 II' },
    blurb: { en: 'Claim 20 quests.', zh: '領取20個任務獎勵。' },
    how: { en: 'Work hub chapters then story dungeon quests.', zh: '完成樞紐章節再推進劇情副本任務。' },
    category: 'story',
    target: 20,
  },
  'ach-quest-all': {
    id: 'ach-quest-all',
    name: { en: 'Tide Chronicler', zh: '潮誌者' },
    blurb: { en: 'Claim every HarborRPG quest.', zh: '領取冒險洲全部任務。' },
    how: { en: `Claim all ${HARBOR_RPG_QUESTS.length} quests on the board.`, zh: `領取任務板上全部 ${HARBOR_RPG_QUESTS.length} 個任務。` },
    category: 'story',
    target: HARBOR_RPG_QUESTS.length,
  },
  'ach-mount-starter': {
    id: 'ach-mount-starter',
    name: { en: 'Ferry Steed', zh: '渡馬' },
    blurb: { en: 'Own the free Tide Horse.', zh: '擁有免費潮馬。' },
    how: {
      en: 'Granted free in ownedMounts. Town Ferry Stable → Summon to ride.',
      zh: '開局已擁有。小鎮渡船馬廄→召喚騎乘。',
    },
    category: 'collection',
    target: 1,
  },
  'ach-mount-5': {
    id: 'ach-mount-5',
    name: { en: 'Stable Hand', zh: '馬廄幫手' },
    blurb: { en: 'Own 5 mounts.', zh: '擁有5隻坐騎。' },
    how: { en: 'Spend gold at Ferry Stable Stable tab on Quaternius / farm / Gobkit mounts.', zh: '在渡船馬廄用金幣購買各包坐騎。' },
    category: 'collection',
    target: 5,
  },
  'ach-mount-15': {
    id: 'ach-mount-15',
    name: { en: 'Menagerie', zh: '百獸廊' },
    blurb: { en: 'Own 15 mounts.', zh: '擁有15隻坐騎。' },
    how: { en: 'Buy mid-cost mounts; farm gold from bosses and quests.', zh: '購買中價坐騎；以首領與任務賺金。' },
    category: 'collection',
    target: 15,
  },
  'ach-mount-all': {
    id: 'ach-mount-all',
    name: { en: 'Full Ferry', zh: '滿渡' },
    blurb: { en: 'Own every rideable mount.', zh: '擁有全部可騎坐騎。' },
    how: {
      en: `Buy all ${HARBOR_RPG_MOUNT_IDS.length} mounts at Ferry Stable (CC0 packs).`,
      zh: `於渡船馬廄購買全部 ${HARBOR_RPG_MOUNT_IDS.length} 隻坐騎。`,
    },
    category: 'collection',
    target: HARBOR_RPG_MOUNT_IDS.length,
  },
  'ach-gold-100': {
    id: 'ach-gold-100',
    name: { en: 'Coin Purse', zh: '錢袋' },
    blurb: { en: 'Hold 100 gold at once.', zh: '同時持有100金幣。' },
    how: { en: 'Quest claims, monster kills, and market sales.', zh: '任務領獎、殺怪與市集出售。' },
    category: 'economy',
    target: 100,
  },
  'ach-gold-1000': {
    id: 'ach-gold-1000',
    name: { en: 'Tide Coffers', zh: '潮庫' },
    blurb: { en: 'Hold 1,000 gold at once.', zh: '同時持有1,000金幣。' },
    how: { en: 'Raid clears and Heroic bosses pay the best soft gold.', zh: '團本與英雄首領金幣最高。' },
    category: 'economy',
    target: 1000,
  },
  'ach-craft-first': {
    id: 'ach-craft-first',
    name: { en: 'Bench Spark', zh: '工臺火花' },
    blurb: { en: 'Complete the First Craft quest path.', zh: '完成首次工藝任務線。' },
    how: {
      en: 'Town Craft Bench — craft a Heal Potion and claim quest-first-craft.',
      zh: '小鎮工藝台——煉製治療藥水並領取「首次工藝」任務。',
    },
    category: 'economy',
    target: 1,
  },
  'ach-companion': {
    id: 'ach-companion',
    name: { en: 'Hired Oar', zh: '雇槳' },
    blurb: { en: 'Hire a soft companion.', zh: '雇用軟陪同。' },
    how: { en: 'Party tab → hire companion (or fill a finder role).', zh: '組隊分頁→雇用陪同（或補齊尋人角色）。' },
    category: 'social',
    target: 1,
  },
  'ach-prestige': {
    id: 'ach-prestige',
    name: { en: 'Star Prestige', zh: '星聲望' },
    blurb: { en: 'Prestige a class once.', zh: '職業聲望一次。' },
    how: { en: 'Reach class level cap on Class tab → Prestige.', zh: '職業分頁達到等級上限→聲望。' },
    category: 'story',
    target: 1,
  },
  'ach-zone-crypt': {
    id: 'ach-zone-crypt',
    name: { en: 'Into the Ash', zh: '入灰' },
    blurb: { en: 'Stand in Ash Crypt.', zh: '踏入灰燼地牢。' },
    how: { en: 'Use a Crypt portal after Ruins gate quests.', zh: '完成遺址門任務後使用地牢傳送門。' },
    category: 'story',
    target: 1,
  },
  'ach-zone-raid': {
    id: 'ach-zone-raid',
    name: { en: 'Raid Threshold', zh: '團本門檻' },
    blurb: { en: 'Enter Tide Remembers.', zh: '進入潮記得。' },
    how: { en: 'Town raid portal after chapter gates.', zh: '章節門後從小鎮團本傳送門進入。' },
    category: 'story',
    target: 1,
  },
  'ach-finder-ready': {
    id: 'ach-finder-ready',
    name: { en: 'Looking', zh: '尋人中' },
    blurb: { en: 'Queue the dungeon finder once.', zh: '使用地下城尋人一次。' },
    how: {
      en: 'Party tab → pick tank/heal/dps + dungeon → Looking (soft presence).',
      zh: '組隊分頁→選坦克/治療/輸出與副本→尋人（軟狀態）。',
    },
    category: 'social',
    target: 1,
  },
}

function claimedQuestCount(bag: HarborRpgBag): number {
  return bag.quests.filter((q) => q.claimed).length
}

function killCount(bag: HarborRpgBag, kind: HarborRpgMonsterKind): number {
  return bag.kills[kind] ?? 0
}

function hasItem(bag: HarborRpgBag, id: string): boolean {
  return bag.inventory.some((s) => s.id === id) || bag.bank.some((s) => s.id === id)
}

/** Soft progress 0…target for wiki bars. */
export function harborRpgAchievementProgress(
  bag: HarborRpgBag,
  id: HarborRpgAchievementId,
): number {
  const def = HARBOR_RPG_ACHIEVEMENTS[id]
  switch (id) {
    case 'ach-first-char':
      return bag.characters.length > 0 ? 1 : 0
    case 'ach-first-class':
      return bag.classId ? 1 : 0
    case 'ach-slime-5':
    case 'ach-slime-25':
      return Math.min(def.target, killCount(bag, 'slime'))
    case 'ach-boss-ash':
      return killCount(bag, 'crypt-boss') > 0 ? 1 : 0
    case 'ach-boss-pearl':
      return killCount(bag, 'tide-boss') > 0 ? 1 : 0
    case 'ach-boss-ink':
      return killCount(bag, 'chronicle-boss') > 0 ? 1 : 0
    case 'ach-boss-mirror':
      return killCount(bag, 'echo-boss') > 0 ? 1 : 0
    case 'ach-boss-sovereign':
      return killCount(bag, 'raid-sovereign') > 0 ? 1 : 0
    case 'ach-heroic-seal':
      return hasItem(bag, 'rpg-item-heroic-seal') ? 1 : 0
    case 'ach-quest-5':
    case 'ach-quest-20':
    case 'ach-quest-all':
      return Math.min(def.target, claimedQuestCount(bag))
    case 'ach-mount-starter':
      return bag.activeMountId === 'horse' || bag.ownedMounts.includes('horse') ? 1 : 0
    case 'ach-mount-5':
    case 'ach-mount-15':
    case 'ach-mount-all':
      return Math.min(def.target, bag.ownedMounts.length)
    case 'ach-gold-100':
    case 'ach-gold-1000':
      return Math.min(def.target, bag.gold)
    case 'ach-craft-first':
      return bag.quests.some((q) => q.id === 'quest-first-craft' && q.claimed) ? 1 : 0
    case 'ach-companion':
      return bag.companionUntil > Date.now() || Boolean(bag.companionName) ? 1 : 0
    case 'ach-prestige':
      return bag.prestige > 0 ? 1 : 0
    case 'ach-zone-crypt':
      return bag.zone === 'crypt' || killCount(bag, 'crypt-boss') > 0 || killCount(bag, 'wraith') > 0
        ? 1
        : 0
    case 'ach-zone-raid':
      return bag.zone === 'tideraid' ||
        killCount(bag, 'raid-herald') > 0 ||
        killCount(bag, 'raid-sovereign') > 0
        ? 1
        : 0
    case 'ach-finder-ready':
      // Soft: having a class + party intent; count as complete if companion or class ready.
      return bag.classId ? 1 : 0
    default:
      return 0
  }
}

export function harborRpgAchievementDone(bag: HarborRpgBag, id: HarborRpgAchievementId): boolean {
  const def = HARBOR_RPG_ACHIEVEMENTS[id]
  return harborRpgAchievementProgress(bag, id) >= def.target
}