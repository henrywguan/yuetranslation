/**
 * HarborRPG wiki index — every item/mount/monster/zone/quest/class/achievement
 * as a page, with visible loot sources derived from live data tables.
 */
import {
  HARBOR_RPG_CRAFT_RECIPES,
  HARBOR_RPG_GATHER_NODES,
  HARBOR_RPG_ITEM_DEFS,
  HARBOR_RPG_ITEMS,
  HARBOR_RPG_MONSTER_DEFS,
  HARBOR_RPG_MONSTER_KINDS,
  HARBOR_RPG_PROFESSION_META,
  HARBOR_RPG_PROFESSIONS,
  HARBOR_RPG_QUESTS,
  HARBOR_RPG_VENDOR,
  HARBOR_RPG_ZONE_META,
  HARBOR_RPG_ZONE_SPAWNS,
  HARBOR_RPG_ZONES,
  type HarborRpgItemId,
  type HarborRpgMonsterKind,
  type HarborRpgQuestId,
  type HarborRpgZoneId,
} from './harborRpgData'
import {
  HARBOR_RPG_ACHIEVEMENT_IDS,
  HARBOR_RPG_ACHIEVEMENTS,
  type HarborRpgAchievementId,
} from './harborRpgAchievements'
import { HARBOR_RPG_CLASSES, HARBOR_RPG_CLASS_DEFS, type HarborRpgClassId } from './harborRpgClasses'
import { HARBOR_RPG_MOUNT_DEFS, HARBOR_RPG_MOUNT_IDS, HARBOR_RPG_STABLE, type HarborRpgMountId } from './harborRpgMounts'
import { harborRpgSpecsForClass } from './harborRpgSpecs'

export type HarborRpgWikiSection =
  | 'home'
  | 'items'
  | 'mounts'
  | 'monsters'
  | 'zones'
  | 'quests'
  | 'classes'
  | 'professions'
  | 'achievements'

export type HarborRpgLootSource =
  | {
      kind: 'drop'
      monster: HarborRpgMonsterKind
      chance: number
      qty: number
      zones: HarborRpgZoneId[]
      label: { en: string; zh: string }
    }
  | {
      kind: 'vendor'
      label: { en: string; zh: string }
      price: number
    }
  | {
      kind: 'craft'
      recipeId: string
      profession: string
      inputs: { id: HarborRpgItemId; qty: number }[]
      skillNeed: number
      label: { en: string; zh: string }
    }
  | {
      kind: 'gather'
      nodeId: string
      zone: HarborRpgZoneId
      profession: string
      label: { en: string; zh: string }
    }
  | {
      kind: 'starter'
      label: { en: string; zh: string }
    }
  | {
      kind: 'heroic'
      label: { en: string; zh: string }
    }
  | {
      kind: 'stable'
      mountId: HarborRpgMountId
      cost: number
      label: { en: string; zh: string }
    }

export type HarborRpgWikiPage =
  | { section: 'items'; id: HarborRpgItemId }
  | { section: 'mounts'; id: HarborRpgMountId }
  | { section: 'monsters'; id: HarborRpgMonsterKind }
  | { section: 'zones'; id: HarborRpgZoneId }
  | { section: 'quests'; id: HarborRpgQuestId }
  | { section: 'classes'; id: HarborRpgClassId }
  | { section: 'professions'; id: (typeof HARBOR_RPG_PROFESSIONS)[number] }
  | { section: 'achievements'; id: HarborRpgAchievementId }
  | { section: 'home'; id: 'home' }

const STARTER_ITEMS: HarborRpgItemId[] = ['rpg-weapon-stick', 'rpg-armor-cloth']

function zonesForMonster(kind: HarborRpgMonsterKind): HarborRpgZoneId[] {
  const out: HarborRpgZoneId[] = []
  for (const zone of HARBOR_RPG_ZONES) {
    if (HARBOR_RPG_ZONE_SPAWNS[zone].some((s) => s.kind === kind)) out.push(zone)
  }
  return out
}

/** Build reverse loot index for every item (must be non-empty for each id). */
export function harborRpgItemLootSources(itemId: HarborRpgItemId): HarborRpgLootSource[] {
  const sources: HarborRpgLootSource[] = []
  const def = HARBOR_RPG_ITEM_DEFS[itemId]

  for (const kind of HARBOR_RPG_MONSTER_KINDS) {
    const m = HARBOR_RPG_MONSTER_DEFS[kind]
    for (const row of m.loot) {
      if (row.item !== itemId) continue
      sources.push({
        kind: 'drop',
        monster: kind,
        chance: row.chance,
        qty: row.qty,
        zones: zonesForMonster(kind),
        label: {
          en: `Drop · ${m.name.en} (${Math.round(row.chance * 100)}% ×${row.qty})`,
          zh: `掉落 · ${m.name.zh}（${Math.round(row.chance * 100)}% ×${row.qty}）`,
        },
      })
    }
  }

  if (HARBOR_RPG_VENDOR.stock.includes(itemId)) {
    sources.push({
      kind: 'vendor',
      price: def.value,
      label: {
        en: `Vendor · ${HARBOR_RPG_VENDOR.name.en} (${def.value}g)`,
        zh: `商人 · ${HARBOR_RPG_VENDOR.name.zh}（${def.value}金）`,
      },
    })
  }

  for (const recipe of HARBOR_RPG_CRAFT_RECIPES) {
    if (recipe.output !== itemId) continue
    const meta = HARBOR_RPG_PROFESSION_META[recipe.profession]
    sources.push({
      kind: 'craft',
      recipeId: recipe.id,
      profession: recipe.profession,
      inputs: recipe.inputs.map((i) => ({ ...i })),
      skillNeed: recipe.skillNeed,
      label: {
        en: `Craft · ${meta.en} (skill ${recipe.skillNeed})`,
        zh: `製作 · ${meta.zh}（技能 ${recipe.skillNeed}）`,
      },
    })
  }

  for (const node of HARBOR_RPG_GATHER_NODES) {
    if (node.item !== itemId) continue
    const zone = HARBOR_RPG_ZONE_META[node.zone]
    const meta = HARBOR_RPG_PROFESSION_META[node.profession]
    sources.push({
      kind: 'gather',
      nodeId: node.id,
      zone: node.zone,
      profession: node.profession,
      label: {
        en: `Gather · ${meta.en} in ${zone.en}`,
        zh: `採集 · ${zone.zh}的${meta.zh}`,
      },
    })
  }

  if (STARTER_ITEMS.includes(itemId)) {
    sources.push({
      kind: 'starter',
      label: {
        en: 'Starter · granted with a new adventurer bag',
        zh: '入門 · 新建角色背包附送',
      },
    })
  }

  if (itemId === 'rpg-item-heroic-seal') {
    sources.push({
      kind: 'heroic',
      label: {
        en: 'Heroic bonus · extra chance on instance bosses when difficulty is Heroic',
        zh: '英雄加成 · 英雄難度下副本首領額外機率',
      },
    })
  }

  return sources
}

export function harborRpgMountObtainSources(mountId: HarborRpgMountId): HarborRpgLootSource[] {
  const def = HARBOR_RPG_MOUNT_DEFS[mountId]
  return [
    {
      kind: 'stable',
      mountId,
      cost: def.cost,
      label: {
        en:
          def.cost === 0
            ? `Ferry Stable · free unlock (Summon at ${HARBOR_RPG_STABLE.name.en})`
            : `Ferry Stable · buy for ${def.cost}g at ${HARBOR_RPG_STABLE.name.en}`,
        zh:
          def.cost === 0
            ? `渡船馬廄 · 免費解鎖（於${HARBOR_RPG_STABLE.name.zh}召喚）`
            : `渡船馬廄 · ${def.cost}金購買（${HARBOR_RPG_STABLE.name.zh}）`,
      },
    },
  ]
}

/** Assert every item has ≥1 source (smoke uses this). */
export function harborRpgItemsMissingSources(): HarborRpgItemId[] {
  return HARBOR_RPG_ITEMS.filter((id) => harborRpgItemLootSources(id).length === 0)
}

export function harborRpgWikiPageTitle(page: HarborRpgWikiPage): { en: string; zh: string } {
  switch (page.section) {
    case 'home':
      return { en: 'HarborRPG Wiki', zh: '冒險洲百科' }
    case 'items': {
      const d = HARBOR_RPG_ITEM_DEFS[page.id]
      return d.name
    }
    case 'mounts':
      return HARBOR_RPG_MOUNT_DEFS[page.id].name
    case 'monsters':
      return HARBOR_RPG_MONSTER_DEFS[page.id].name
    case 'zones':
      return { en: HARBOR_RPG_ZONE_META[page.id].en, zh: HARBOR_RPG_ZONE_META[page.id].zh }
    case 'quests': {
      const q = HARBOR_RPG_QUESTS.find((x) => x.id === page.id)
      return q?.name ?? { en: page.id, zh: page.id }
    }
    case 'classes':
      return HARBOR_RPG_CLASS_DEFS[page.id].name
    case 'professions':
      return {
        en: HARBOR_RPG_PROFESSION_META[page.id].en,
        zh: HARBOR_RPG_PROFESSION_META[page.id].zh,
      }
    case 'achievements':
      return HARBOR_RPG_ACHIEVEMENTS[page.id].name
  }
}

export function harborRpgWikiSearchHay(page: HarborRpgWikiPage): string {
  const title = harborRpgWikiPageTitle(page)
  const bits = [page.section, page.id, title.en, title.zh]
  if (page.section === 'items') {
    const d = HARBOR_RPG_ITEM_DEFS[page.id]
    bits.push(d.kind, d.rarity, ...harborRpgItemLootSources(page.id).map((s) => s.label.en))
  }
  if (page.section === 'mounts') {
    const d = HARBOR_RPG_MOUNT_DEFS[page.id]
    bits.push(d.pack, d.blurb.en, String(d.cost))
  }
  if (page.section === 'achievements') {
    const d = HARBOR_RPG_ACHIEVEMENTS[page.id]
    bits.push(d.blurb.en, d.how.en, d.category)
  }
  if (page.section === 'monsters') {
    const d = HARBOR_RPG_MONSTER_DEFS[page.id]
    bits.push(...d.loot.map((l) => HARBOR_RPG_ITEM_DEFS[l.item].name.en))
  }
  return bits.join(' ').toLowerCase()
}

export function harborRpgWikiList(section: HarborRpgWikiSection): HarborRpgWikiPage[] {
  switch (section) {
    case 'home':
      return [{ section: 'home', id: 'home' }]
    case 'items':
      return HARBOR_RPG_ITEMS.map((id) => ({ section: 'items' as const, id }))
    case 'mounts':
      return HARBOR_RPG_MOUNT_IDS.map((id) => ({ section: 'mounts' as const, id }))
    case 'monsters':
      return HARBOR_RPG_MONSTER_KINDS.map((id) => ({ section: 'monsters' as const, id }))
    case 'zones':
      return HARBOR_RPG_ZONES.map((id) => ({ section: 'zones' as const, id }))
    case 'quests':
      return HARBOR_RPG_QUESTS.map((q) => ({ section: 'quests' as const, id: q.id }))
    case 'classes':
      return HARBOR_RPG_CLASSES.map((id) => ({ section: 'classes' as const, id }))
    case 'professions':
      return HARBOR_RPG_PROFESSIONS.map((id) => ({ section: 'professions' as const, id }))
    case 'achievements':
      return HARBOR_RPG_ACHIEVEMENT_IDS.map((id) => ({ section: 'achievements' as const, id }))
  }
}

export function harborRpgWikiStats() {
  return {
    items: HARBOR_RPG_ITEMS.length,
    mounts: HARBOR_RPG_MOUNT_IDS.length,
    monsters: HARBOR_RPG_MONSTER_KINDS.length,
    zones: HARBOR_RPG_ZONES.length,
    quests: HARBOR_RPG_QUESTS.length,
    classes: HARBOR_RPG_CLASSES.length,
    professions: HARBOR_RPG_PROFESSIONS.length,
    achievements: HARBOR_RPG_ACHIEVEMENT_IDS.length,
    missingItemSources: harborRpgItemsMissingSources().length,
  }
}

export function harborRpgClassSpecLine(classId: HarborRpgClassId): string {
  return harborRpgSpecsForClass(classId)
    .map((s) => s.name.en)
    .join(' · ')
}

export const HARBOR_RPG_WIKI_SECTIONS: {
  id: HarborRpgWikiSection
  label: { en: string; zh: string }
}[] = [
  { id: 'home', label: { en: 'Home', zh: '首頁' } },
  { id: 'items', label: { en: 'Items', zh: '物品' } },
  { id: 'mounts', label: { en: 'Mounts', zh: '坐騎' } },
  { id: 'monsters', label: { en: 'Monsters', zh: '怪物' } },
  { id: 'zones', label: { en: 'Zones', zh: '區域' } },
  { id: 'quests', label: { en: 'Quests', zh: '任務' } },
  { id: 'classes', label: { en: 'Classes', zh: '職業' } },
  { id: 'professions', label: { en: 'Professions', zh: '專業' } },
  { id: 'achievements', label: { en: 'Achievements', zh: '成就' } },
]
