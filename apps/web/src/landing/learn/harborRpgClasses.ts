/**
 * HarborRPG classes · skills · talent trees · prestige.
 * Original Harbor/Jade IP; systems inspiration only from WoW / ESO / MapleStory.
 */
export const HARBOR_RPG_CLASSES = [
  'tideblade',
  'reedshadow',
  'lanternmancer',
  'jadeheart',
  'ashbound',
  'starferry',
  'ironoar',
  'mistweaver',
  'chopwright',
] as const
export type HarborRpgClassId = (typeof HARBOR_RPG_CLASSES)[number]

export const HARBOR_RPG_CLASS_ROLES = ['tank', 'melee', 'ranged', 'caster', 'healer'] as const
export type HarborRpgClassRole = (typeof HARBOR_RPG_CLASS_ROLES)[number]

export const HARBOR_RPG_TALENT_TREES = ['offense', 'ward', 'voyage'] as const
export type HarborRpgTalentTree = (typeof HARBOR_RPG_TALENT_TREES)[number]

export const HARBOR_RPG_CLASS_LEVEL_CAP = 50
export const HARBOR_RPG_SKILL_RANK_CAP = 10
export const HARBOR_RPG_PRESTIGE_CAP = 5
/** Soft XP to advance one class level (quadratic-ish via helper). */
export const HARBOR_RPG_CLASS_XP_BASE = 40

export type HarborRpgSkillEffect =
  | { kind: 'damage'; mult: number; aoe?: number; threatMult?: number }
  | { kind: 'guard'; defBonus: number; seconds: number }
  | { kind: 'heal'; mult: number }
  | { kind: 'dot'; mult: number; ticks: number }
  | { kind: 'burst'; mult: number; threatMult?: number }

export type HarborRpgSkillDef = {
  id: string
  classId: HarborRpgClassId
  name: { en: string; zh: string }
  blurb: { en: string; zh: string }
  /** Class level required to unlock. */
  unlockLevel: number
  gcd: number
  cd: number
  range: number
  effect: HarborRpgSkillEffect
  /** Maple-style: skill gains power per rank. */
  rankPower: number
  /** Soft resource cost (MP / focus / energy). */
  mpCost?: number
  /** Which talent-tree / spec this skill highlights (undefined = class-wide). */
  specTree?: HarborRpgTalentTree
  /** Soft cast animation key for UI pulse. */
  anim?: 'slash' | 'bolt' | 'heal' | 'guard' | 'nova' | 'dot'
}

export type HarborRpgTalentNode = {
  id: string
  tree: HarborRpgTalentTree
  name: { en: string; zh: string }
  /** Max points in this node (1–5). */
  max: number
  /** Soft combat bonuses per point. */
  atk?: number
  def?: number
  hp?: number
  xpBonus?: number
  cdReduce?: number
}

export type HarborRpgClassDef = {
  id: HarborRpgClassId
  name: { en: string; zh: string }
  role: HarborRpgClassRole
  /** One-line fantasy pitch. */
  pitch: { en: string; zh: string }
  /** Base stat biases (soft). */
  atkBias: number
  defBias: number
  hpBias: number
  color: number
  skills: HarborRpgSkillDef[]
  talents: HarborRpgTalentNode[]
  /** Passive unlocked at class level milestones. */
  passives: { level: number; name: { en: string; zh: string }; blurb: { en: string; zh: string } }[]
}

function skill(
  partial: Omit<HarborRpgSkillDef, 'classId'> & { classId: HarborRpgClassId },
): HarborRpgSkillDef {
  return partial
}

export const HARBOR_RPG_CLASS_DEFS: Record<HarborRpgClassId, HarborRpgClassDef> = {
  tideblade: {
    id: 'tideblade',
    name: { en: 'Tideblade', zh: '潮刃' },
    role: 'melee',
    pitch: {
      en: 'Ferry-steel duelist — cleaving waves and iron tempo.',
      zh: '渡船鋼刃——以浪勢斬擊，節奏如潮。',
    },
    atkBias: 1.15,
    defBias: 1.05,
    hpBias: 1.1,
    color: 0x4a90c8,
    skills: [
      skill({
        id: 'tb-riptide',
        classId: 'tideblade',
        name: { en: 'Riptide Cut', zh: '裂潮斬' },
        blurb: { en: 'Basic steel swing with tide weight.', zh: '帶潮勢的基礎斬擊。' },
        unlockLevel: 1,
        gcd: 1.15,
        cd: 0,
        range: 2.2,
        effect: { kind: 'damage', mult: 1.05, threatMult: 1.1 },
        rankPower: 0.08,
      }),
      skill({
        id: 'tb-breaker',
        classId: 'tideblade',
        name: { en: 'Breaker Arc', zh: '破浪弧' },
        blurb: { en: 'Wide cleave across nearby foes.', zh: '橫掃近身眾敵。' },
        unlockLevel: 3,
        gcd: 1.4,
        cd: 6,
        range: 2.6,
        effect: { kind: 'damage', mult: 0.8, aoe: 2.6, threatMult: 1.3 },
        rankPower: 0.07,
      }),
      skill({
        id: 'tb-anchor',
        classId: 'tideblade',
        name: { en: 'Anchor Slam', zh: '錨擊' },
        blurb: { en: 'Heavy single-target burst.', zh: '沉重單體爆發。' },
        unlockLevel: 8,
        gcd: 1.5,
        cd: 10,
        range: 2.1,
        effect: { kind: 'burst', mult: 1.85, threatMult: 2 },
        rankPower: 0.1,
      }),
      skill({
        id: 'tb-ironwake',
        classId: 'tideblade',
        name: { en: 'Ironwake', zh: '鐵潮' },
        blurb: { en: 'Brace and raise defense.', zh: '架勢抬高防禦。' },
        unlockLevel: 12,
        gcd: 1.0,
        cd: 14,
        range: 0,
        effect: { kind: 'guard', defBonus: 5, seconds: 5 },
        rankPower: 0.05,
      }),
      skill({
        id: 'tb-maelstrom',
        classId: 'tideblade',
        name: { en: 'Maelstrom Finale', zh: '漩終' },
        blurb: { en: 'Ultimate swirling finisher.', zh: '終極旋斬。' },
        unlockLevel: 30,
        gcd: 1.6,
        cd: 45,
        range: 3.0,
        effect: { kind: 'damage', mult: 2.2, aoe: 3.2, threatMult: 1.8 },
        rankPower: 0.12,
      }),
      skill({
        id: 'tb-surge',
        classId: 'tideblade',
        name: { en: 'Tide Surge', zh: '潮湧' },
        blurb: { en: 'Mid-kit wave that shoves nearby foes.', zh: '中階浪擊推開近敵。' },
        unlockLevel: 18,
        gcd: 1.35,
        cd: 16,
        range: 2.8,
        effect: { kind: 'damage', mult: 1.15, aoe: 2.8, threatMult: 1.4 },
        rankPower: 0.09,
        mpCost: 8,
        anim: 'nova',
      }),
      skill({
        id: 'tb-keelbreak',
        classId: 'tideblade',
        name: { en: 'Keelbreak', zh: '破龍骨' },
        blurb: { en: 'Late single-target crush before the finale.', zh: '終技前的沉重單體。' },
        unlockLevel: 40,
        gcd: 1.45,
        cd: 28,
        range: 2.2,
        effect: { kind: 'burst', mult: 2.4, threatMult: 2.2 },
        rankPower: 0.11,
        mpCost: 14,
        anim: 'slash',
      }),
    ],
    talents: [
      { id: 'tb-o1', tree: 'offense', name: { en: 'Serrated Edge', zh: '鋸鋒' }, max: 5, atk: 0.4 },
      { id: 'tb-o2', tree: 'offense', name: { en: 'Undertow', zh: '暗流' }, max: 3, atk: 0.7 },
      { id: 'tb-w1', tree: 'ward', name: { en: 'Hull Plate', zh: '船殼甲' }, max: 5, def: 0.5, hp: 2 },
      { id: 'tb-w2', tree: 'ward', name: { en: 'Steady Keel', zh: '穩舵' }, max: 3, def: 0.8 },
      { id: 'tb-v1', tree: 'voyage', name: { en: 'Harbor Tempo', zh: '港灣節拍' }, max: 3, cdReduce: 0.04, xpBonus: 0.02 },
      { id: 'tb-v2', tree: 'voyage', name: { en: 'Ferry Grit', zh: '渡船韌性' }, max: 3, hp: 4 },
    ],
    passives: [
      {
        level: 10,
        name: { en: 'Tideblood', zh: '潮血' },
        blurb: { en: '+8% max HP while Tideblade.', zh: '潮刃時最大生命+8%。' },
      },
      {
        level: 25,
        name: { en: 'Second Wave', zh: '第二浪' },
        blurb: { en: 'Cleave strikes gain bonus threat.', zh: '橫掃威脅提升。' },
      },
      {
        level: 40,
        name: { en: 'Captain’s Cadence', zh: '船長節奏' },
        blurb: { en: 'GCD slightly shortened.', zh: '公共冷卻略縮短。' },
      },
    ],
  },

  reedshadow: {
    id: 'reedshadow',
    name: { en: 'Reedshadow', zh: '蘆影' },
    role: 'melee',
    pitch: {
      en: 'Marsh assassin — soft steps, sudden needles of reed-steel.',
      zh: '澤地刺客——輕步無聲，蘆鋼突刺。',
    },
    atkBias: 1.25,
    defBias: 0.85,
    hpBias: 0.9,
    color: 0x3a8050,
    skills: [
      skill({
        id: 'rs-needle',
        classId: 'reedshadow',
        name: { en: 'Reed Needle', zh: '蘆針' },
        blurb: { en: 'Fast piercing stab.', zh: '迅疾穿刺。' },
        unlockLevel: 1,
        gcd: 0.95,
        cd: 0,
        range: 2.0,
        effect: { kind: 'damage', mult: 0.95, threatMult: 0.7 },
        rankPower: 0.09,
      }),
      skill({
        id: 'rs-bleed',
        classId: 'reedshadow',
        name: { en: 'Marsh Venom', zh: '澤毒' },
        blurb: { en: 'Apply a soft DoT.', zh: '附加柔和持續傷害。' },
        unlockLevel: 4,
        gcd: 1.1,
        cd: 8,
        range: 2.1,
        effect: { kind: 'dot', mult: 0.35, ticks: 4 },
        rankPower: 0.06,
      }),
      skill({
        id: 'rs-flurry',
        classId: 'reedshadow',
        name: { en: 'Shadow Flurry', zh: '影亂' },
        blurb: { en: 'Burst combo on one target.', zh: '單體連擊爆發。' },
        unlockLevel: 10,
        gcd: 1.2,
        cd: 12,
        range: 2.0,
        effect: { kind: 'burst', mult: 2.1, threatMult: 0.6 },
        rankPower: 0.11,
      }),
      skill({
        id: 'rs-mist',
        classId: 'reedshadow',
        name: { en: 'Mist Step', zh: '霧步' },
        blurb: { en: 'Brief defense while vanishing.', zh: '短暫隱消防禦。' },
        unlockLevel: 16,
        gcd: 0.8,
        cd: 18,
        range: 0,
        effect: { kind: 'guard', defBonus: 3, seconds: 3 },
        rankPower: 0.04,
      }),
      skill({
        id: 'rs-eclipse',
        classId: 'reedshadow',
        name: { en: 'Reed Eclipse', zh: '蘆蝕' },
        blurb: { en: 'Ultimate ambush strike.', zh: '終極伏擊。' },
        unlockLevel: 30,
        gcd: 1.3,
        cd: 40,
        range: 2.2,
        effect: { kind: 'burst', mult: 2.8, threatMult: 0.5 },
        rankPower: 0.13,
      }),
      skill({
        id: 'rs-thorns',
        classId: 'reedshadow',
        name: { en: 'Thorn Net', zh: '荊網' },
        blurb: { en: 'AoE reed cuts that leave a soft DoT seed.', zh: '範圍蘆割並留下持續傷。' },
        unlockLevel: 22,
        gcd: 1.2,
        cd: 14,
        range: 2.4,
        effect: { kind: 'dot', mult: 0.4, ticks: 3 },
        rankPower: 0.07,
        mpCost: 7,
        anim: 'dot',
      }),
      skill({
        id: 'rs-nightfall',
        classId: 'reedshadow',
        name: { en: 'Nightfall Cut', zh: '夜落斬' },
        blurb: { en: 'Late ambush between Mist Step and Eclipse.', zh: '霧步與蝕間的伏擊。' },
        unlockLevel: 38,
        gcd: 1.15,
        cd: 22,
        range: 2.1,
        effect: { kind: 'burst', mult: 2.35, threatMult: 0.55 },
        rankPower: 0.12,
        mpCost: 12,
        anim: 'slash',
      }),
    ],
    talents: [
      { id: 'rs-o1', tree: 'offense', name: { en: 'Keen Reed', zh: '銳蘆' }, max: 5, atk: 0.5 },
      { id: 'rs-o2', tree: 'offense', name: { en: 'Night Tip', zh: '夜尖' }, max: 3, atk: 0.9 },
      { id: 'rs-w1', tree: 'ward', name: { en: 'Soft Foot', zh: '軟足' }, max: 3, def: 0.4, hp: 1 },
      { id: 'rs-w2', tree: 'ward', name: { en: 'Veil Wrap', zh: '紗裹' }, max: 3, def: 0.6 },
      { id: 'rs-v1', tree: 'voyage', name: { en: 'Quick Cut', zh: '快剪' }, max: 5, cdReduce: 0.05 },
      { id: 'rs-v2', tree: 'voyage', name: { en: 'Loot Sense', zh: '尋寶感' }, max: 3, xpBonus: 0.03 },
    ],
    passives: [
      {
        level: 10,
        name: { en: 'Ambush Instinct', zh: '伏擊本能' },
        blurb: { en: 'Openers deal more threat-light damage.', zh: '開場技傷害提升、仇恨較低。' },
      },
      {
        level: 25,
        name: { en: 'Venom Reserve', zh: '毒備' },
        blurb: { en: 'DoT ticks slightly stronger.', zh: '持續傷害略強。' },
      },
      {
        level: 40,
        name: { en: 'Zero Sound', zh: '無聲' },
        blurb: { en: 'Flurry cooldown shortened.', zh: '影亂冷卻縮短。' },
      },
    ],
  },

  lanternmancer: {
    id: 'lanternmancer',
    name: { en: 'Lanternmancer', zh: '燈法師' },
    role: 'caster',
    pitch: {
      en: 'Pier mage — ferry-lantern flames and Chao-tone sparks.',
      zh: '碼頭法師——渡船燈焰與聲調火花。',
    },
    atkBias: 1.3,
    defBias: 0.8,
    hpBias: 0.85,
    color: 0xe0a040,
    skills: [
      skill({
        id: 'lm-spark',
        classId: 'lanternmancer',
        name: { en: 'Lantern Spark', zh: '燈火星' },
        blurb: { en: 'Basic ranged spark.', zh: '基礎遠程火花。' },
        unlockLevel: 1,
        gcd: 1.2,
        cd: 0,
        range: 7.5,
        effect: { kind: 'damage', mult: 1.0, threatMult: 0.85 },
        rankPower: 0.09,
      }),
      skill({
        id: 'lm-flare',
        classId: 'lanternmancer',
        name: { en: 'Pier Flare', zh: '碼頭焰' },
        blurb: { en: 'AoE lantern burst.', zh: '範圍燈焰。' },
        unlockLevel: 5,
        gcd: 1.45,
        cd: 8,
        range: 6.5,
        effect: { kind: 'damage', mult: 0.85, aoe: 3.0, threatMult: 1.0 },
        rankPower: 0.08,
      }),
      skill({
        id: 'lm-brand',
        classId: 'lanternmancer',
        name: { en: 'Ash Brand', zh: '灰印' },
        blurb: { en: 'Burning DoT brand.', zh: '灼燒印記。' },
        unlockLevel: 10,
        gcd: 1.2,
        cd: 10,
        range: 7.0,
        effect: { kind: 'dot', mult: 0.4, ticks: 5 },
        rankPower: 0.07,
      }),
      skill({
        id: 'lm-ward',
        classId: 'lanternmancer',
        name: { en: 'Glass Ward', zh: '璃盾' },
        blurb: { en: 'Fragile mage shield.', zh: '脆弱法師盾。' },
        unlockLevel: 14,
        gcd: 1.0,
        cd: 16,
        range: 0,
        effect: { kind: 'guard', defBonus: 4, seconds: 4 },
        rankPower: 0.05,
      }),
      skill({
        id: 'lm-nova',
        classId: 'lanternmancer',
        name: { en: 'Harbor Nova', zh: '港灣新星' },
        blurb: { en: 'Ultimate tone-fire nova.', zh: '終極聲調火爆。' },
        unlockLevel: 30,
        gcd: 1.7,
        cd: 50,
        range: 8.0,
        effect: { kind: 'damage', mult: 2.4, aoe: 4.0, threatMult: 1.2 },
        rankPower: 0.12,
      }),
      skill({
        id: 'lm-beacon',
        classId: 'lanternmancer',
        name: { en: 'Beacon Flare', zh: '燈標焰' },
        blurb: { en: 'Mid-range lantern burst.', zh: '中距燈焰爆發。' },
        unlockLevel: 18,
        gcd: 1.3,
        cd: 12,
        range: 5.5,
        effect: { kind: 'damage', mult: 1.25, aoe: 2.2, threatMult: 0.9 },
        rankPower: 0.09,
        mpCost: 10,
        anim: 'bolt',
      }),
      skill({
        id: 'lm-vesper',
        classId: 'lanternmancer',
        name: { en: 'Vesper Choir', zh: '晚禱合唱' },
        blurb: { en: 'Late chant that burns and mends a little.', zh: '後期詠唱：傷敵兼微癒。' },
        unlockLevel: 40,
        gcd: 1.5,
        cd: 30,
        range: 6,
        effect: { kind: 'damage', mult: 1.9, aoe: 3.0, threatMult: 0.8 },
        rankPower: 0.11,
        mpCost: 16,
        anim: 'nova',
      }),
    ],
    talents: [
      { id: 'lm-o1', tree: 'offense', name: { en: 'Bright Wick', zh: '明芯' }, max: 5, atk: 0.55 },
      { id: 'lm-o2', tree: 'offense', name: { en: 'Tone Spark', zh: '調火花' }, max: 3, atk: 0.85 },
      { id: 'lm-w1', tree: 'ward', name: { en: 'Smoke Cloak', zh: '煙披' }, max: 3, def: 0.5 },
      { id: 'lm-w2', tree: 'ward', name: { en: 'Cool Glass', zh: '涼璃' }, max: 3, hp: 2, def: 0.3 },
      { id: 'lm-v1', tree: 'voyage', name: { en: 'Quick Cast', zh: '速詠' }, max: 5, cdReduce: 0.05 },
      { id: 'lm-v2', tree: 'voyage', name: { en: 'Scholar’s Share', zh: '學者份' }, max: 3, xpBonus: 0.04 },
    ],
    passives: [
      {
        level: 10,
        name: { en: 'Fuel Reserve', zh: '燃油備' },
        blurb: { en: 'Sparks travel farther.', zh: '火花射程更遠。' },
      },
      {
        level: 25,
        name: { en: 'Double Wick', zh: '雙芯' },
        blurb: { en: 'Flare burns hotter.', zh: '碼頭焰更烈。' },
      },
      {
        level: 40,
        name: { en: 'Chao Cascade', zh: '聲調 cascade' },
        blurb: { en: 'Nova cooldown reduced.', zh: '新星冷卻降低。' },
      },
    ],
  },

  jadeheart: {
    id: 'jadeheart',
    name: { en: 'Jadeheart', zh: '玉心' },
    role: 'healer',
    pitch: {
      en: 'Temple medic — jade light that mends allies and scalds undead.',
      zh: '廟醫——玉光癒友，灼滅怨靈。',
    },
    atkBias: 0.95,
    defBias: 1.0,
    hpBias: 1.05,
    color: 0x50c878,
    skills: [
      skill({
        id: 'jh-pulse',
        classId: 'jadeheart',
        name: { en: 'Jade Pulse', zh: '玉脈' },
        blurb: { en: 'Soft damaging pulse (holy pressure).', zh: '柔和聖壓傷害。' },
        unlockLevel: 1,
        gcd: 1.2,
        cd: 0,
        range: 6.5,
        effect: { kind: 'damage', mult: 0.85, threatMult: 0.9 },
        rankPower: 0.07,
      }),
      skill({
        id: 'jh-mend',
        classId: 'jadeheart',
        name: { en: 'Harbor Mend', zh: '港癒' },
        blurb: { en: 'Self heal (soft party heal later).', zh: '自我治療（日後可及隊友）。' },
        unlockLevel: 2,
        gcd: 1.1,
        cd: 6,
        range: 0,
        effect: { kind: 'heal', mult: 0.55 },
        rankPower: 0.08,
      }),
      skill({
        id: 'jh-smite',
        classId: 'jadeheart',
        name: { en: 'Pier Smite', zh: '碼頭懲' },
        blurb: { en: 'Focused holy burst.', zh: '集中聖爆。' },
        unlockLevel: 8,
        gcd: 1.35,
        cd: 9,
        range: 6.5,
        effect: { kind: 'burst', mult: 1.6, threatMult: 1.1 },
        rankPower: 0.09,
      }),
      skill({
        id: 'jh-aegis',
        classId: 'jadeheart',
        name: { en: 'Jade Aegis', zh: '玉盾' },
        blurb: { en: 'Protective ward.', zh: '守護結界。' },
        unlockLevel: 15,
        gcd: 1.0,
        cd: 14,
        range: 0,
        effect: { kind: 'guard', defBonus: 6, seconds: 5 },
        rankPower: 0.06,
      }),
      skill({
        id: 'jh-lotus',
        classId: 'jadeheart',
        name: { en: 'Lotus Benediction', zh: '蓮祝' },
        blurb: { en: 'Ultimate mend + pressure wave.', zh: '終極治癒與壓波。' },
        unlockLevel: 30,
        gcd: 1.5,
        cd: 48,
        range: 7.0,
        effect: { kind: 'heal', mult: 1.4 },
        rankPower: 0.1,
      }),
      skill({
        id: 'jh-balm',
        classId: 'jadeheart',
        name: { en: 'Jade Balm', zh: '玉膏' },
        blurb: { en: 'Mid heal for longer pulls.', zh: '長戰中階治療。' },
        unlockLevel: 18,
        gcd: 1.2,
        cd: 10,
        range: 0,
        effect: { kind: 'heal', mult: 0.85 },
        rankPower: 0.08,
        mpCost: 12,
        anim: 'heal',
      }),
      skill({
        id: 'jh-pavilion',
        classId: 'jadeheart',
        name: { en: 'Jade Pavilion', zh: '玉亭' },
        blurb: { en: 'Late ward before the big lotus.', zh: '蓮花前的後期護盾。' },
        unlockLevel: 40,
        gcd: 1.0,
        cd: 24,
        range: 0,
        effect: { kind: 'guard', defBonus: 7, seconds: 6 },
        rankPower: 0.06,
        mpCost: 14,
        anim: 'guard',
      }),
    ],
    talents: [
      { id: 'jh-o1', tree: 'offense', name: { en: 'Bright Smite', zh: '明懲' }, max: 5, atk: 0.35 },
      { id: 'jh-o2', tree: 'offense', name: { en: 'Tone Pressure', zh: '調壓' }, max: 3, atk: 0.6 },
      { id: 'jh-w1', tree: 'ward', name: { en: 'Soft Shell', zh: '軟殼' }, max: 5, def: 0.45, hp: 2 },
      { id: 'jh-w2', tree: 'ward', name: { en: 'Deep Mend', zh: '深癒' }, max: 5, hp: 3 },
      { id: 'jh-v1', tree: 'voyage', name: { en: 'Mercy Cadence', zh: '慈節奏' }, max: 3, cdReduce: 0.04 },
      { id: 'jh-v2', tree: 'voyage', name: { en: 'Temple Share', zh: '廟份' }, max: 3, xpBonus: 0.03 },
    ],
    passives: [
      {
        level: 10,
        name: { en: 'Gentle Hands', zh: '柔手' },
        blurb: { en: 'Mends restore more HP.', zh: '治癒量提升。' },
      },
      {
        level: 25,
        name: { en: 'Warding Light', zh: '護光' },
        blurb: { en: 'Aegis lasts longer.', zh: '玉盾時效延長。' },
      },
      {
        level: 40,
        name: { en: 'Lotus Echo', zh: '蓮回響' },
        blurb: { en: 'Ultimate also pulses damage.', zh: '終極技附帶傷害脈衝。' },
      },
    ],
  },

  ashbound: {
    id: 'ashbound',
    name: { en: 'Ashbound', zh: '灰縛' },
    role: 'tank',
    pitch: {
      en: 'Ruin guardian — ashplate wall that holds the crypt line.',
      zh: '遺址守衛——灰甲鐵壁守住地牢防線。',
    },
    atkBias: 0.9,
    defBias: 1.35,
    hpBias: 1.3,
    color: 0x8a7060,
    skills: [
      skill({
        id: 'ab-bash',
        classId: 'ashbound',
        name: { en: 'Ash Bash', zh: '灰擊' },
        blurb: { en: 'Threat-heavy basic.', zh: '高仇恨基礎攻擊。' },
        unlockLevel: 1,
        gcd: 1.25,
        cd: 0,
        range: 2.1,
        effect: { kind: 'damage', mult: 0.9, threatMult: 2.2 },
        rankPower: 0.06,
      }),
      skill({
        id: 'ab-wall',
        classId: 'ashbound',
        name: { en: 'Ruin Wall', zh: '遺牆' },
        blurb: { en: 'Strong guard stance.', zh: '強力守護姿態。' },
        unlockLevel: 3,
        gcd: 1.0,
        cd: 12,
        range: 0,
        effect: { kind: 'guard', defBonus: 8, seconds: 6 },
        rankPower: 0.07,
      }),
      skill({
        id: 'ab-taunt',
        classId: 'ashbound',
        name: { en: 'Stone Call', zh: '石召' },
        blurb: { en: 'AoE threat slam.', zh: '範圍仇恨猛擊。' },
        unlockLevel: 8,
        gcd: 1.4,
        cd: 10,
        range: 2.8,
        effect: { kind: 'damage', mult: 0.7, aoe: 3.0, threatMult: 3.5 },
        rankPower: 0.06,
      }),
      skill({
        id: 'ab-quake',
        classId: 'ashbound',
        name: { en: 'Ash Quake', zh: '灰震' },
        blurb: { en: 'Heavy ground burst.', zh: '沉重地裂。' },
        unlockLevel: 18,
        gcd: 1.5,
        cd: 16,
        range: 2.5,
        effect: { kind: 'burst', mult: 1.5, threatMult: 2.5 },
        rankPower: 0.08,
      }),
      skill({
        id: 'ab-bulwark',
        classId: 'ashbound',
        name: { en: 'Eternal Bulwark', zh: '永壁' },
        blurb: { en: 'Ultimate fortress.', zh: '終極要塞。' },
        unlockLevel: 30,
        gcd: 1.2,
        cd: 55,
        range: 0,
        effect: { kind: 'guard', defBonus: 14, seconds: 8 },
        rankPower: 0.09,
      }),
      skill({
        id: 'ab-cinder',
        classId: 'ashbound',
        name: { en: 'Cinder March', zh: '燼行' },
        blurb: { en: 'Mid threat AoE stomp.', zh: '中階仇恨範圍踏擊。' },
        unlockLevel: 18,
        gcd: 1.4,
        cd: 14,
        range: 2.5,
        effect: { kind: 'damage', mult: 0.95, aoe: 2.8, threatMult: 3.2 },
        rankPower: 0.08,
        mpCost: 8,
        anim: 'nova',
      }),
      skill({
        id: 'ab-bastion',
        classId: 'ashbound',
        name: { en: 'Ash Bastion', zh: '灰堡' },
        blurb: { en: 'Late tank wall.', zh: '後期坦克壁壘。' },
        unlockLevel: 40,
        gcd: 1.0,
        cd: 26,
        range: 0,
        effect: { kind: 'guard', defBonus: 8, seconds: 6 },
        rankPower: 0.05,
        mpCost: 10,
        anim: 'guard',
      }),
    ],
    talents: [
      { id: 'ab-o1', tree: 'offense', name: { en: 'Heavy Fist', zh: '重拳' }, max: 3, atk: 0.4 },
      { id: 'ab-o2', tree: 'offense', name: { en: 'Quake Tip', zh: '震尖' }, max: 3, atk: 0.55 },
      { id: 'ab-w1', tree: 'ward', name: { en: 'Ash Plate', zh: '灰板' }, max: 5, def: 0.7, hp: 3 },
      { id: 'ab-w2', tree: 'ward', name: { en: 'Deep Roots', zh: '深根' }, max: 5, hp: 5, def: 0.4 },
      { id: 'ab-v1', tree: 'voyage', name: { en: 'Hold Line', zh: '守線' }, max: 3, cdReduce: 0.03 },
      { id: 'ab-v2', tree: 'voyage', name: { en: 'Veteran Hull', zh: '老船殼' }, max: 3, xpBonus: 0.02, hp: 2 },
    ],
    passives: [
      {
        level: 10,
        name: { en: 'Stoneblood', zh: '石血' },
        blurb: { en: 'Large max HP bonus.', zh: '最大生命大幅提升。' },
      },
      {
        level: 25,
        name: { en: 'Provoking Ash', zh: '挑釁灰' },
        blurb: { en: 'Taunts generate more threat.', zh: '嘲諷仇恨更高。' },
      },
      {
        level: 40,
        name: { en: 'Unbreakable Pier', zh: '不破碼頭' },
        blurb: { en: 'Guard skills last longer.', zh: '守護技時效延長。' },
      },
    ],
  },

  starferry: {
    id: 'starferry',
    name: { en: 'Starferry', zh: '星渡' },
    role: 'ranged',
    pitch: {
      en: 'Harbor ranger — starlit bolts from canoe and cliff.',
      zh: '港灣遊俠——船上崖上皆可射星矢。',
    },
    atkBias: 1.2,
    defBias: 0.9,
    hpBias: 0.95,
    color: 0x70b0e0,
    skills: [
      skill({
        id: 'sf-bolt',
        classId: 'starferry',
        name: { en: 'Star Bolt', zh: '星矢' },
        blurb: { en: 'Basic ranged shot.', zh: '基礎遠程射擊。' },
        unlockLevel: 1,
        gcd: 1.1,
        cd: 0,
        range: 9.0,
        effect: { kind: 'damage', mult: 1.0, threatMult: 0.8 },
        rankPower: 0.09,
      }),
      skill({
        id: 'sf-volley',
        classId: 'starferry',
        name: { en: 'Pier Volley', zh: '碼頭齊射' },
        blurb: { en: 'Multi-target volley.', zh: '多目標齊射。' },
        unlockLevel: 4,
        gcd: 1.4,
        cd: 7,
        range: 8.5,
        effect: { kind: 'damage', mult: 0.75, aoe: 2.8, threatMult: 0.9 },
        rankPower: 0.08,
      }),
      skill({
        id: 'sf-mark',
        classId: 'starferry',
        name: { en: 'Hunter’s Mark', zh: '獵印' },
        blurb: { en: 'Marked DoT shot.', zh: '標記持續傷害。' },
        unlockLevel: 9,
        gcd: 1.15,
        cd: 9,
        range: 9.0,
        effect: { kind: 'dot', mult: 0.38, ticks: 4 },
        rankPower: 0.07,
      }),
      skill({
        id: 'sf-cover',
        classId: 'starferry',
        name: { en: 'Canoe Cover', zh: '舟蔽' },
        blurb: { en: 'Duck behind the hull.', zh: '躲入船舷。' },
        unlockLevel: 14,
        gcd: 0.9,
        cd: 15,
        range: 0,
        effect: { kind: 'guard', defBonus: 4, seconds: 3.5 },
        rankPower: 0.04,
      }),
      skill({
        id: 'sf-meteor',
        classId: 'starferry',
        name: { en: 'Meteor Ferry', zh: '隕石渡' },
        blurb: { en: 'Ultimate skybolt rain.', zh: '終極天矢雨。' },
        unlockLevel: 30,
        gcd: 1.6,
        cd: 48,
        range: 10.0,
        effect: { kind: 'damage', mult: 2.3, aoe: 3.5, threatMult: 1.0 },
        rankPower: 0.12,
      }),
      skill({
        id: 'sf-comet',
        classId: 'starferry',
        name: { en: 'Comet Line', zh: '彗星線' },
        blurb: { en: 'Mid bolt that pierces a line.', zh: '中階貫穿光線。' },
        unlockLevel: 18,
        gcd: 1.25,
        cd: 11,
        range: 6.5,
        effect: { kind: 'damage', mult: 1.3, threatMult: 0.85 },
        rankPower: 0.1,
        mpCost: 11,
        anim: 'bolt',
      }),
      skill({
        id: 'sf-orbit',
        classId: 'starferry',
        name: { en: 'Orbit Barrage', zh: '軌道齊射' },
        blurb: { en: 'Late multi-hit nova.', zh: '後期多重新星。' },
        unlockLevel: 40,
        gcd: 1.5,
        cd: 28,
        range: 6,
        effect: { kind: 'damage', mult: 2.0, aoe: 3.2, threatMult: 0.9 },
        rankPower: 0.12,
        mpCost: 18,
        anim: 'nova',
      }),
    ],
    talents: [
      { id: 'sf-o1', tree: 'offense', name: { en: 'Keen Sight', zh: '銳目' }, max: 5, atk: 0.5 },
      { id: 'sf-o2', tree: 'offense', name: { en: 'Star Tip', zh: '星尖' }, max: 3, atk: 0.8 },
      { id: 'sf-w1', tree: 'ward', name: { en: 'Light Boots', zh: '輕靴' }, max: 3, def: 0.4, hp: 1 },
      { id: 'sf-w2', tree: 'ward', name: { en: 'Cliff Guard', zh: '崖護' }, max: 3, def: 0.55 },
      { id: 'sf-v1', tree: 'voyage', name: { en: 'Quick Nock', zh: '速搭' }, max: 5, cdReduce: 0.05 },
      { id: 'sf-v2', tree: 'voyage', name: { en: 'Scout’s Share', zh: '斥候份' }, max: 3, xpBonus: 0.035 },
    ],
    passives: [
      {
        level: 10,
        name: { en: 'Long Pier', zh: '長碼頭' },
        blurb: { en: 'Bolt range extended.', zh: '星矢射程延長。' },
      },
      {
        level: 25,
        name: { en: 'Volley Drill', zh: '齊射操' },
        blurb: { en: 'Volley spreads wider.', zh: '齊射範圍更廣。' },
      },
      {
        level: 40,
        name: { en: 'Constellation', zh: '星座' },
        blurb: { en: 'Ultimate cooldown reduced.', zh: '終極冷卻降低。' },
      },
    ],
  },

  ironoar: {
    id: 'ironoar',
    name: { en: 'Ironoar', zh: '鐵槳' },
    role: 'tank',
    pitch: {
      en: 'Dock enforcer — iron oar that marks threat and braces the pier.',
      zh: '碼頭執法——鐵槳標記威脅，撐住碼頭。',
    },
    atkBias: 1.05,
    defBias: 1.25,
    hpBias: 1.3,
    color: 0x708090,
    skills: [
      skill({
        id: 'io-smash',
        classId: 'ironoar',
        name: { en: 'Oar Smash', zh: '槳擊' },
        blurb: { en: 'Heavy threat swing.', zh: '高威脅重擊。' },
        unlockLevel: 1,
        gcd: 1.25,
        cd: 0,
        range: 2.3,
        effect: { kind: 'damage', mult: 1.0, threatMult: 2.2 },
        rankPower: 0.07,
        mpCost: 0,
        specTree: 'offense',
        anim: 'slash',
      }),
      skill({
        id: 'io-keel',
        classId: 'ironoar',
        name: { en: 'Keelbreaker', zh: '破舵' },
        blurb: { en: 'Wide oar cleave.', zh: '寬槳橫掃。' },
        unlockLevel: 4,
        gcd: 1.45,
        cd: 7,
        range: 2.8,
        effect: { kind: 'damage', mult: 0.75, aoe: 2.8, threatMult: 2.5 },
        rankPower: 0.07,
        mpCost: 12,
        specTree: 'offense',
        anim: 'slash',
      }),
      skill({
        id: 'io-bulkhead',
        classId: 'ironoar',
        name: { en: 'Bulkhead', zh: '隔艙' },
        blurb: { en: 'Ship-wall brace.', zh: '船牆架勢。' },
        unlockLevel: 8,
        gcd: 1.0,
        cd: 12,
        range: 0,
        effect: { kind: 'guard', defBonus: 8, seconds: 5 },
        rankPower: 0.05,
        mpCost: 10,
        specTree: 'ward',
        anim: 'guard',
      }),
      skill({
        id: 'io-marshal',
        classId: 'ironoar',
        name: { en: 'Dock Marshal', zh: '碼頭執法' },
        blurb: { en: 'Self mend after soak.', zh: '硬扛後自癒。' },
        unlockLevel: 14,
        gcd: 1.1,
        cd: 16,
        range: 0,
        effect: { kind: 'heal', mult: 0.4 },
        rankPower: 0.06,
        mpCost: 18,
        specTree: 'voyage',
        anim: 'heal',
      }),
      skill({
        id: 'io-ram',
        classId: 'ironoar',
        name: { en: 'Pier Ram', zh: '碼頭衝撞' },
        blurb: { en: 'Ultimate threat burst.', zh: '終極威脅爆發。' },
        unlockLevel: 30,
        gcd: 1.6,
        cd: 40,
        range: 2.5,
        effect: { kind: 'burst', mult: 2.0, threatMult: 4 },
        rankPower: 0.11,
        mpCost: 30,
        specTree: 'offense',
        anim: 'nova',
      }),
      skill({
        id: 'io-row',
        classId: 'ironoar',
        name: { en: 'Iron Row', zh: '鐵槳排' },
        blurb: { en: 'Mid cleave with solid threat.', zh: '中階橫掃帶仇恨。' },
        unlockLevel: 18,
        gcd: 1.35,
        cd: 13,
        range: 2.6,
        effect: { kind: 'damage', mult: 1.05, aoe: 2.7, threatMult: 2.4 },
        rankPower: 0.08,
        mpCost: 7,
        anim: 'slash',
      }),
      skill({
        id: 'io-harborwall',
        classId: 'ironoar',
        name: { en: 'Harbor Wall', zh: '港牆' },
        blurb: { en: 'Late brace for the crew.', zh: '後期為同伴架防。' },
        unlockLevel: 40,
        gcd: 1.0,
        cd: 24,
        range: 0,
        effect: { kind: 'guard', defBonus: 6, seconds: 5 },
        rankPower: 0.05,
        mpCost: 9,
        anim: 'guard',
      }),
    ],
    talents: [
      { id: 'io-o1', tree: 'offense', name: { en: 'Weighted Oar', zh: '重槳' }, max: 5, atk: 0.4 },
      { id: 'io-o2', tree: 'offense', name: { en: 'Mark the Hull', zh: '標船殼' }, max: 3, atk: 0.6 },
      { id: 'io-w1', tree: 'ward', name: { en: 'Iron Ribs', zh: '鐵肋' }, max: 5, def: 0.7, hp: 3 },
      { id: 'io-w2', tree: 'ward', name: { en: 'Brace Line', zh: '撐纜' }, max: 3, def: 0.9, hp: 2 },
      { id: 'io-v1', tree: 'voyage', name: { en: 'Short Whistle', zh: '短哨' }, max: 3, cdReduce: 0.04 },
      { id: 'io-v2', tree: 'voyage', name: { en: 'Crew Share', zh: '船員份' }, max: 3, xpBonus: 0.03, hp: 2 },
    ],
    passives: [
      {
        level: 10,
        name: { en: 'Dock Blood', zh: '碼頭血' },
        blurb: { en: '+10% max HP as Ironoar.', zh: '鐵槳時最大生命+10%。' },
      },
      {
        level: 25,
        name: { en: 'Threat Bell', zh: '威脅鐘' },
        blurb: { en: 'Cleaves generate bonus threat.', zh: '橫掃額外威脅。' },
      },
      {
        level: 40,
        name: { en: 'Unsinkable', zh: '不沉' },
        blurb: { en: 'Guard duration extended.', zh: '守護時效延長。' },
      },
    ],
  },

  mistweaver: {
    id: 'mistweaver',
    name: { en: 'Mistweaver', zh: '霧織' },
    role: 'healer',
    pitch: {
      en: 'Reed-mist mystic — silkbolts that mend and soft-shred.',
      zh: '蘆霧秘術——絲矢可癒可削。',
    },
    atkBias: 1.0,
    defBias: 0.9,
    hpBias: 1.0,
    color: 0xa0c8d8,
    skills: [
      skill({
        id: 'mw-bolt',
        classId: 'mistweaver',
        name: { en: 'Silkbolt', zh: '絲矢' },
        blurb: { en: 'Basic mist bolt.', zh: '基礎霧矢。' },
        unlockLevel: 1,
        gcd: 1.2,
        cd: 0,
        range: 8.0,
        effect: { kind: 'damage', mult: 0.95, threatMult: 0.7 },
        rankPower: 0.08,
        mpCost: 4,
        specTree: 'offense',
        anim: 'bolt',
      }),
      skill({
        id: 'mw-dew',
        classId: 'mistweaver',
        name: { en: 'Dewveil', zh: '露幕' },
        blurb: { en: 'Self mist heal.', zh: '自我霧癒。' },
        unlockLevel: 2,
        gcd: 1.1,
        cd: 5,
        range: 0,
        effect: { kind: 'heal', mult: 0.6 },
        rankPower: 0.09,
        mpCost: 14,
        specTree: 'ward',
        anim: 'heal',
      }),
      skill({
        id: 'mw-shred',
        classId: 'mistweaver',
        name: { en: 'Soft Shred', zh: '輕削' },
        blurb: { en: 'DoT mist that softens foes.', zh: '霧DoT弱化敵人。' },
        unlockLevel: 8,
        gcd: 1.3,
        cd: 8,
        range: 8.0,
        effect: { kind: 'dot', mult: 0.45, ticks: 4 },
        rankPower: 0.08,
        mpCost: 16,
        specTree: 'offense',
        anim: 'dot',
      }),
      skill({
        id: 'mw-chorus',
        classId: 'mistweaver',
        name: { en: 'Tide Chorus', zh: '潮合唱' },
        blurb: { en: 'AoE mist pressure.', zh: '範圍霧壓。' },
        unlockLevel: 15,
        gcd: 1.5,
        cd: 14,
        range: 7.0,
        effect: { kind: 'damage', mult: 0.7, aoe: 3.5, threatMult: 0.8 },
        rankPower: 0.08,
        mpCost: 22,
        specTree: 'voyage',
        anim: 'nova',
      }),
      skill({
        id: 'mw-monsoon',
        classId: 'mistweaver',
        name: { en: 'Monsoon Hymn', zh: '季風讚' },
        blurb: { en: 'Ultimate heal burst.', zh: '終極癒爆。' },
        unlockLevel: 30,
        gcd: 1.4,
        cd: 42,
        range: 0,
        effect: { kind: 'heal', mult: 1.4 },
        rankPower: 0.12,
        mpCost: 35,
        specTree: 'ward',
        anim: 'heal',
      }),
      skill({
        id: 'mw-drizzle',
        classId: 'mistweaver',
        name: { en: 'Harbor Drizzle', zh: '港濛雨' },
        blurb: { en: 'Mid heal over a soft pulse.', zh: '中階柔和治療。' },
        unlockLevel: 18,
        gcd: 1.15,
        cd: 9,
        range: 0,
        effect: { kind: 'heal', mult: 0.75 },
        rankPower: 0.08,
        mpCost: 11,
        anim: 'heal',
      }),
      skill({
        id: 'mw-typhoon',
        classId: 'mistweaver',
        name: { en: 'Mist Typhoon', zh: '霧颱' },
        blurb: { en: 'Late AoE push before Monsoon.', zh: '季風前的後期範圍。' },
        unlockLevel: 40,
        gcd: 1.4,
        cd: 26,
        range: 3.2,
        effect: { kind: 'damage', mult: 1.55, aoe: 3.2, threatMult: 0.7 },
        rankPower: 0.1,
        mpCost: 15,
        anim: 'nova',
      }),
    ],
    talents: [
      { id: 'mw-o1', tree: 'offense', name: { en: 'Sharp Silk', zh: '銳絲' }, max: 5, atk: 0.5 },
      { id: 'mw-o2', tree: 'offense', name: { en: 'Needle Mist', zh: '針霧' }, max: 3, atk: 0.75 },
      { id: 'mw-w1', tree: 'ward', name: { en: 'Thick Dew', zh: '厚露' }, max: 5, hp: 2, def: 0.4 },
      { id: 'mw-w2', tree: 'ward', name: { en: 'Veil Cloth', zh: '幕布' }, max: 3, def: 0.6 },
      { id: 'mw-v1', tree: 'voyage', name: { en: 'Chorus Tempo', zh: '合唱節拍' }, max: 5, cdReduce: 0.04 },
      { id: 'mw-v2', tree: 'voyage', name: { en: 'Mist Share', zh: '霧份' }, max: 3, xpBonus: 0.04 },
    ],
    passives: [
      {
        level: 10,
        name: { en: 'Deep Well', zh: '深井' },
        blurb: { en: '+12% max resource.', zh: '最大資源+12%。' },
      },
      {
        level: 25,
        name: { en: 'Echo Mist', zh: '回音霧' },
        blurb: { en: 'DoTs tick slightly harder.', zh: 'DoT略強。' },
      },
      {
        level: 40,
        name: { en: 'Harbor Rain', zh: '港雨' },
        blurb: { en: 'Ultimate cooldown reduced.', zh: '終極冷卻降低。' },
      },
    ],
  },

  chopwright: {
    id: 'chopwright',
    name: { en: 'Chopwright', zh: '斫匠' },
    role: 'melee',
    pitch: {
      en: 'Shipwright fighter — hatchet tempo and yard-boss grit.',
      zh: '船廠鬥士——短斧節奏與工頭韌性。',
    },
    atkBias: 1.2,
    defBias: 1.0,
    hpBias: 1.05,
    color: 0xb08040,
    skills: [
      skill({
        id: 'cw-chop',
        classId: 'chopwright',
        name: { en: 'Hatchet Chop', zh: '斧斫' },
        blurb: { en: 'Basic craft-steel swing.', zh: '基礎工鋼斬。' },
        unlockLevel: 1,
        gcd: 1.15,
        cd: 0,
        range: 2.2,
        effect: { kind: 'damage', mult: 1.08, threatMult: 1.1 },
        rankPower: 0.08,
        mpCost: 0,
        specTree: 'offense',
        anim: 'slash',
      }),
      skill({
        id: 'cw-bleed',
        classId: 'chopwright',
        name: { en: 'Saw Bleed', zh: '鋸血' },
        blurb: { en: 'Bleeding tool edge.', zh: '工具刃流血。' },
        unlockLevel: 3,
        gcd: 1.25,
        cd: 7,
        range: 2.2,
        effect: { kind: 'dot', mult: 0.5, ticks: 3 },
        rankPower: 0.08,
        mpCost: 10,
        specTree: 'offense',
        anim: 'dot',
      }),
      skill({
        id: 'cw-parry',
        classId: 'chopwright',
        name: { en: 'Sawguard', zh: '鋸衛' },
        blurb: { en: 'Parry brace.', zh: '格擋架勢。' },
        unlockLevel: 8,
        gcd: 1.0,
        cd: 12,
        range: 0,
        effect: { kind: 'guard', defBonus: 5, seconds: 4 },
        rankPower: 0.05,
        mpCost: 8,
        specTree: 'ward',
        anim: 'guard',
      }),
      skill({
        id: 'cw-yard',
        classId: 'chopwright',
        name: { en: 'Yard Boss', zh: '船廠頭' },
        blurb: { en: 'Burst chop with workman’s fury.', zh: '工頭怒劈。' },
        unlockLevel: 12,
        gcd: 1.4,
        cd: 10,
        range: 2.3,
        effect: { kind: 'burst', mult: 1.75, threatMult: 1.4 },
        rankPower: 0.1,
        mpCost: 16,
        specTree: 'voyage',
        anim: 'slash',
      }),
      skill({
        id: 'cw-timber',
        classId: 'chopwright',
        name: { en: 'Timber Fall', zh: '木傾' },
        blurb: { en: 'Ultimate wide chop.', zh: '終極寬斫。' },
        unlockLevel: 30,
        gcd: 1.55,
        cd: 45,
        range: 2.8,
        effect: { kind: 'damage', mult: 2.1, aoe: 3.0, threatMult: 1.6 },
        rankPower: 0.12,
        mpCost: 28,
        specTree: 'offense',
        anim: 'nova',
      }),
      skill({
        id: 'cw-lathe',
        classId: 'chopwright',
        name: { en: 'Lathe Spin', zh: '車床旋' },
        blurb: { en: 'Mid craft-steel whirl.', zh: '中階工藝鋼旋。' },
        unlockLevel: 18,
        gcd: 1.3,
        cd: 12,
        range: 2.4,
        effect: { kind: 'damage', mult: 1.1, aoe: 2.4, threatMult: 1.3 },
        rankPower: 0.09,
        mpCost: 8,
        anim: 'slash',
      }),
      skill({
        id: 'cw-masterwork',
        classId: 'chopwright',
        name: { en: 'Masterwork Strike', zh: '匠心一擊' },
        blurb: { en: 'Late precision burst.', zh: '後期精準爆發。' },
        unlockLevel: 40,
        gcd: 1.4,
        cd: 26,
        range: 2.2,
        effect: { kind: 'burst', mult: 2.5, threatMult: 1.5 },
        rankPower: 0.12,
        mpCost: 14,
        anim: 'slash',
      }),
    ],
    talents: [
      { id: 'cw-o1', tree: 'offense', name: { en: 'Honed Edge', zh: '利刃' }, max: 5, atk: 0.45 },
      { id: 'cw-o2', tree: 'offense', name: { en: 'Double Notch', zh: '雙痕' }, max: 3, atk: 0.7 },
      { id: 'cw-w1', tree: 'ward', name: { en: 'Leather Apron', zh: '皮圍裙' }, max: 5, def: 0.5, hp: 2 },
      { id: 'cw-w2', tree: 'ward', name: { en: 'Steady Grip', zh: '穩握' }, max: 3, def: 0.7 },
      { id: 'cw-v1', tree: 'voyage', name: { en: 'Yard Tempo', zh: '船廠節拍' }, max: 5, cdReduce: 0.045 },
      { id: 'cw-v2', tree: 'voyage', name: { en: 'Craft Share', zh: '工藝份' }, max: 3, xpBonus: 0.04 },
    ],
    passives: [
      {
        level: 10,
        name: { en: 'Tool Belt', zh: '工具帶' },
        blurb: { en: '+5% attack while Chopwright.', zh: '斫匠時攻擊+5%。' },
      },
      {
        level: 25,
        name: { en: 'Saw Rhythm', zh: '鋸節奏' },
        blurb: { en: 'DoTs last an extra tick soft.', zh: 'DoT略延長。' },
      },
      {
        level: 40,
        name: { en: 'Master Wright', zh: '大匠' },
        blurb: { en: 'Ultimate cooldown reduced.', zh: '終極冷卻降低。' },
      },
    ],
  },
}

export function isHarborRpgClassId(raw: unknown): raw is HarborRpgClassId {
  return typeof raw === 'string' && (HARBOR_RPG_CLASSES as readonly string[]).includes(raw)
}

export function harborRpgClassById(id: string): HarborRpgClassDef | null {
  return isHarborRpgClassId(id) ? HARBOR_RPG_CLASS_DEFS[id] : null
}

export function harborRpgSkillById(id: string): HarborRpgSkillDef | null {
  for (const c of HARBOR_RPG_CLASSES) {
    const hit = HARBOR_RPG_CLASS_DEFS[c].skills.find((s) => s.id === id)
    if (hit) return hit
  }
  return null
}

export function harborRpgAllSkillIds(): string[] {
  const out: string[] = []
  for (const c of HARBOR_RPG_CLASSES) {
    for (const s of HARBOR_RPG_CLASS_DEFS[c].skills) out.push(s.id)
  }
  return out
}

export function harborRpgAllTalentIds(): string[] {
  const out: string[] = []
  for (const c of HARBOR_RPG_CLASSES) {
    for (const t of HARBOR_RPG_CLASS_DEFS[c].talents) out.push(t.id)
  }
  return out
}

/** Soft XP required to go from `level` → `level+1` (1-indexed current). */
export function harborRpgClassXpToNext(level: number): number {
  const lv = Math.max(1, Math.min(HARBOR_RPG_CLASS_LEVEL_CAP, Math.floor(level)))
  return Math.floor(HARBOR_RPG_CLASS_XP_BASE * lv * (1 + lv * 0.08))
}

export function harborRpgClassLevelFromXp(xp: number): number {
  let level = 1
  let remain = Math.max(0, Math.floor(xp))
  while (level < HARBOR_RPG_CLASS_LEVEL_CAP) {
    const need = harborRpgClassXpToNext(level)
    if (remain < need) break
    remain -= need
    level += 1
  }
  return level
}

/** Skill rank from skill XP (soft curve to cap 10). */
export function harborRpgSkillRankFromXp(xp: number): number {
  const n = Math.max(0, Math.floor(xp))
  return Math.min(HARBOR_RPG_SKILL_RANK_CAP, 1 + Math.floor(Math.sqrt(n / 18)))
}

export function harborRpgSkillXpToRank(rank: number): number {
  const r = Math.max(1, Math.min(HARBOR_RPG_SKILL_RANK_CAP, Math.floor(rank)))
  return Math.floor(18 * (r - 1) * (r - 1))
}

/** Talent points earned: 1 at level 1, then +1 every 2 levels, prestige bonus. */
export function harborRpgTalentPointsEarned(classLevel: number, prestige: number): number {
  const lv = Math.max(1, Math.floor(classLevel))
  const base = 1 + Math.floor((lv - 1) / 2)
  return base + Math.max(0, Math.floor(prestige)) * 2
}

export function harborRpgUnlockedSkills(
  classId: HarborRpgClassId,
  classLevel: number,
): HarborRpgSkillDef[] {
  return HARBOR_RPG_CLASS_DEFS[classId].skills.filter((s) => s.unlockLevel <= classLevel)
}

export function harborRpgSkillPowerMult(skill: HarborRpgSkillDef, rank: number): number {
  const r = Math.max(1, Math.min(HARBOR_RPG_SKILL_RANK_CAP, Math.floor(rank)))
  return 1 + skill.rankPower * (r - 1)
}
