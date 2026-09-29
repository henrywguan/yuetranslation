/**
 * HarborRPG specs — 9 classes × 3 specs = 27.
 * Each class keeps a full skill book; specs gate talent trees + highlight kit.
 * Original Harbor/Jade names; systems inspiration only.
 */
import {
  HARBOR_RPG_CLASSES,
  HARBOR_RPG_TALENT_TREES,
  type HarborRpgClassId,
  type HarborRpgClassRole,
  type HarborRpgTalentTree,
} from './harborRpgClasses'

export type HarborRpgSpecId = `${HarborRpgClassId}-${HarborRpgTalentTree}`

export type HarborRpgSpecDef = {
  id: HarborRpgSpecId
  classId: HarborRpgClassId
  tree: HarborRpgTalentTree
  name: { en: string; zh: string }
  role: HarborRpgClassRole
  pitch: { en: string; zh: string }
  /** Soft resource flavor for HUD. */
  resource: 'focus' | 'energy' | 'mana' | 'fury' | 'spirit'
}

const SPEC_NAMES: Record<
  HarborRpgClassId,
  Record<HarborRpgTalentTree, Omit<HarborRpgSpecDef, 'id' | 'classId' | 'tree'>>
> = {
  tideblade: {
    offense: {
      name: { en: 'Ripsteel', zh: '裂鋼' },
      role: 'melee',
      pitch: { en: 'Cleave tempo and serrated finishers.', zh: '橫掃節奏與鋸鋒終結。' },
      resource: 'focus',
    },
    ward: {
      name: { en: 'Ironwake', zh: '鐵潮' },
      role: 'tank',
      pitch: { en: 'Anchor threat and hull-plate holds.', zh: '錨擊威脅與船殼硬扛。' },
      resource: 'fury',
    },
    voyage: {
      name: { en: 'Ferry Captain', zh: '渡船長' },
      role: 'melee',
      pitch: { en: 'Cadence buffs and short GCD sails.', zh: '節奏增益與短CD航程。' },
      resource: 'focus',
    },
  },
  reedshadow: {
    offense: {
      name: { en: 'Needle', zh: '蘆針' },
      role: 'melee',
      pitch: { en: 'Burst needles and bleed ticks.', zh: '爆發針刺與流血。' },
      resource: 'energy',
    },
    ward: {
      name: { en: 'Miststep', zh: '霧步' },
      role: 'melee',
      pitch: { en: 'Evasion veils and soft escapes.', zh: '閃避霧幕與脫身。' },
      resource: 'energy',
    },
    voyage: {
      name: { en: 'Marsh Phantom', zh: '澤影' },
      role: 'melee',
      pitch: { en: 'Ambush XP and silent travel.', zh: '伏擊經驗與無聲行旅。' },
      resource: 'energy',
    },
  },
  lanternmancer: {
    offense: {
      name: { en: 'Brightwick', zh: '明芯' },
      role: 'caster',
      pitch: { en: 'Hot sparks and tone novas.', zh: '熱火花與聲調新星。' },
      resource: 'mana',
    },
    ward: {
      name: { en: 'Smoke Glass', zh: '煙璃' },
      role: 'caster',
      pitch: { en: 'Shield flares and cool glass.', zh: '護焰與涼璃。' },
      resource: 'mana',
    },
    voyage: {
      name: { en: 'Chao Scholar', zh: '聲調學者' },
      role: 'caster',
      pitch: { en: 'Quick-cast and lore share.', zh: '速詠與學識分享。' },
      resource: 'mana',
    },
  },
  jadeheart: {
    offense: {
      name: { en: 'Pier Smite', zh: '碼頭懲' },
      role: 'healer',
      pitch: { en: 'Holy pressure that still hurts.', zh: '仍能傷敵的聖壓。' },
      resource: 'spirit',
    },
    ward: {
      name: { en: 'Jade Aegis', zh: '玉盾' },
      role: 'healer',
      pitch: { en: 'Wards and sustained mends.', zh: '結界與持續癒合。' },
      resource: 'spirit',
    },
    voyage: {
      name: { en: 'Lotus Ferry', zh: '蓮渡' },
      role: 'healer',
      pitch: { en: 'Lotus burst heal + soft scald.', zh: '蓮爆癒合與輕灼。' },
      resource: 'spirit',
    },
  },
  ashbound: {
    offense: {
      name: { en: 'Ashbrand', zh: '灰燼刃' },
      role: 'tank',
      pitch: { en: 'Heavy threat cleaves.', zh: '重威脅橫劈。' },
      resource: 'fury',
    },
    ward: {
      name: { en: 'Cinder Plate', zh: '燼甲' },
      role: 'tank',
      pitch: { en: 'Soak walls and ember guard.', zh: '硬扛牆與燼護。' },
      resource: 'fury',
    },
    voyage: {
      name: { en: 'Ruin Warden', zh: '遺址守衛' },
      role: 'tank',
      pitch: { en: 'Instance grit and XP share.', zh: '地牢韌性與經驗分享。' },
      resource: 'fury',
    },
  },
  starferry: {
    offense: {
      name: { en: 'Star Tip', zh: '星尖' },
      role: 'ranged',
      pitch: { en: 'Long bolts and sharp crits.', zh: '長矢與銳暴擊。' },
      resource: 'focus',
    },
    ward: {
      name: { en: 'Cliff Guard', zh: '崖護' },
      role: 'ranged',
      pitch: { en: 'Kiting boots and light plate.', zh: '風箏靴與輕甲。' },
      resource: 'focus',
    },
    voyage: {
      name: { en: 'Constellation', zh: '星座' },
      role: 'ranged',
      pitch: { en: 'Volley drill and scout share.', zh: '齊射操與斥候份。' },
      resource: 'focus',
    },
  },
  ironoar: {
    offense: {
      name: { en: 'Keelbreaker', zh: '破舵' },
      role: 'tank',
      pitch: { en: 'Oar smashes that mark threat.', zh: '槳擊標記威脅。' },
      resource: 'fury',
    },
    ward: {
      name: { en: 'Bulkhead', zh: '隔艙' },
      role: 'tank',
      pitch: { en: 'Ship-wall blocks and braces.', zh: '船牆格擋。' },
      resource: 'fury',
    },
    voyage: {
      name: { en: 'Dock Marshal', zh: '碼頭執法' },
      role: 'tank',
      pitch: { en: 'Party bracing and short CDs.', zh: '隊友架勢與短CD。' },
      resource: 'fury',
    },
  },
  mistweaver: {
    offense: {
      name: { en: 'Silkbolt', zh: '絲矢' },
      role: 'caster',
      pitch: { en: 'Mist bolts that shred armor soft.', zh: '霧矢輕削防。' },
      resource: 'mana',
    },
    ward: {
      name: { en: 'Dewveil', zh: '露幕' },
      role: 'healer',
      pitch: { en: 'Veil heals and dew shields.', zh: '幕癒與露盾。' },
      resource: 'mana',
    },
    voyage: {
      name: { en: 'Tide Chorus', zh: '潮合唱' },
      role: 'healer',
      pitch: { en: 'AoE mist hymns and voyage XP.', zh: '範圍霧詠與航程經驗。' },
      resource: 'mana',
    },
  },
  chopwright: {
    offense: {
      name: { en: 'Hatchet', zh: '短斧' },
      role: 'melee',
      pitch: { en: 'Craft-steel chops and bleeds.', zh: '工鋼劈砍與流血。' },
      resource: 'energy',
    },
    ward: {
      name: { en: 'Sawguard', zh: '鋸衛' },
      role: 'melee',
      pitch: { en: 'Parry tempo and tool braces.', zh: '格擋節奏與工具架勢。' },
      resource: 'energy',
    },
    voyage: {
      name: { en: 'Yard Boss', zh: '船廠頭' },
      role: 'melee',
      pitch: { en: 'Profession synergy and ferry grit.', zh: '專業聯動與渡船韌性。' },
      resource: 'energy',
    },
  },
}

export const HARBOR_RPG_SPEC_DEFS: Record<HarborRpgSpecId, HarborRpgSpecDef> = (() => {
  const out = {} as Record<HarborRpgSpecId, HarborRpgSpecDef>
  for (const classId of HARBOR_RPG_CLASSES) {
    for (const tree of HARBOR_RPG_TALENT_TREES) {
      const id = `${classId}-${tree}` as HarborRpgSpecId
      const row = SPEC_NAMES[classId][tree]
      out[id] = { id, classId, tree, ...row }
    }
  }
  return out
})()

export const HARBOR_RPG_SPECS = Object.keys(HARBOR_RPG_SPEC_DEFS) as HarborRpgSpecId[]

export function isHarborRpgSpecId(raw: unknown): raw is HarborRpgSpecId {
  return typeof raw === 'string' && raw in HARBOR_RPG_SPEC_DEFS
}

export function harborRpgSpecsForClass(classId: HarborRpgClassId): HarborRpgSpecDef[] {
  return HARBOR_RPG_TALENT_TREES.map(
    (tree) => HARBOR_RPG_SPEC_DEFS[`${classId}-${tree}` as HarborRpgSpecId],
  )
}

export function harborRpgDefaultSpec(classId: HarborRpgClassId): HarborRpgSpecId {
  return `${classId}-offense`
}

export function harborRpgSpecById(id: string): HarborRpgSpecDef | null {
  return isHarborRpgSpecId(id) ? HARBOR_RPG_SPEC_DEFS[id] : null
}

/** Soft MP / resource pool size from level + class bias. */
export function harborRpgMaxResource(classLevel: number, resource: HarborRpgSpecDef['resource']): number {
  const lv = Math.max(1, Math.floor(classLevel))
  const base =
    resource === 'mana' || resource === 'spirit'
      ? 60
      : resource === 'fury'
        ? 80
        : resource === 'energy'
          ? 100
          : 90
  return base + lv * 4
}
