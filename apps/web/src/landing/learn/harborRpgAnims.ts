/**
 * HarborRPG outfit motion — Quaternius Universal Animation Library 1 + 2 (CC0).
 * In-place Standard clips. Perform lists the library; locomotion stays on the mixer.
 */
export const HARBOR_RPG_UAL_SRCS = [
  '/assets/harbor-quest/cosmetics/quaternius/ual1.glb',
  '/assets/harbor-quest/cosmetics/quaternius/ual2.glb',
] as const

export const HARBOR_RPG_LOCO_CLIPS = {
  idle: ['Idle_Loop'],
  walk: ['Walk_Loop'],
  sprint: ['Sprint_Loop'],
} as const

/** Social emotes → UAL clip. No literal Wave / Bow in the free libraries. */
export const HARBOR_RPG_EMOTE_CLIP = {
  wave: 'Yes',
  bow: 'Interact',
  cheer: 'Dance_Loop',
  'sit-toast': 'Sitting_Talking_Loop',
} as const

export type HarborRpgPerformGroup = 'social' | 'craft' | 'combat' | 'move'

export type HarborRpgPerform = {
  clip: string
  en: string
  zh: string
  group: HarborRpgPerformGroup
}

/** UAL1 + UAL2 clips on the Perform menu. Names must exist in the shipped GLBs. */
export const HARBOR_RPG_PERFORMS: readonly HarborRpgPerform[] = [
  { clip: 'Yes', en: 'Yes', zh: '點頭', group: 'social' },
  { clip: 'Interact', en: 'Greet', zh: '問候', group: 'social' },
  { clip: 'Dance_Loop', en: 'Dance', zh: '跳舞', group: 'social' },
  { clip: 'Idle_Talking_Loop', en: 'Talk', zh: '說話', group: 'social' },
  { clip: 'Idle_FoldArms_Loop', en: 'Fold arms', zh: '抱臂', group: 'social' },
  { clip: 'Idle_No_Loop', en: 'Shake', zh: '搖頭', group: 'social' },
  { clip: 'Idle_Rail_Loop', en: 'Rail', zh: '靠欄', group: 'social' },
  { clip: 'Sitting_Talking_Loop', en: 'Sit talk', zh: '坐談', group: 'social' },
  { clip: 'Sitting_Idle_Loop', en: 'Sit', zh: '坐下', group: 'social' },
  { clip: 'Idle_Torch_Loop', en: 'Torch', zh: '火把', group: 'craft' },
  { clip: 'Idle_Lantern_Loop', en: 'Lantern', zh: '提燈', group: 'craft' },
  { clip: 'PickUp_Table', en: 'Pick up', zh: '拾取', group: 'craft' },
  { clip: 'Consume', en: 'Drink', zh: '飲用', group: 'craft' },
  { clip: 'Chest_Open', en: 'Chest', zh: '開箱', group: 'craft' },
  { clip: 'Farm_Harvest', en: 'Harvest', zh: '收成', group: 'craft' },
  { clip: 'Farm_PlantSeed', en: 'Plant', zh: '播種', group: 'craft' },
  { clip: 'Farm_Watering', en: 'Water', zh: '澆水', group: 'craft' },
  { clip: 'TreeChopping_Loop', en: 'Chop', zh: '砍樹', group: 'craft' },
  { clip: 'Fixing_Kneeling', en: 'Mend', zh: '修補', group: 'craft' },
  { clip: 'Push_Loop', en: 'Push', zh: '推', group: 'craft' },
  { clip: 'Walk_Carry_Loop', en: 'Carry', zh: '搬運', group: 'craft' },
  { clip: 'Spell_Simple_Shoot', en: 'Spell', zh: '施法', group: 'combat' },
  { clip: 'Spell_Simple_Idle_Loop', en: 'Channel', zh: '引導', group: 'combat' },
  { clip: 'Sword_Attack', en: 'Swing', zh: '揮劍', group: 'combat' },
  { clip: 'Sword_Idle', en: 'Guard', zh: '持劍', group: 'combat' },
  { clip: 'Sword_Block', en: 'Block', zh: '格擋', group: 'combat' },
  { clip: 'Sword_Heavy_Combo', en: 'Heavy', zh: '重擊', group: 'combat' },
  { clip: 'Sword_Regular_Combo', en: 'Combo', zh: '連擊', group: 'combat' },
  { clip: 'Sword_Dash', en: 'Lunge', zh: '突刺', group: 'combat' },
  { clip: 'Idle_Shield_Loop', en: 'Shield', zh: '舉盾', group: 'combat' },
  { clip: 'Melee_Hook', en: 'Hook', zh: '勾拳', group: 'combat' },
  { clip: 'Punch_Jab', en: 'Jab', zh: '刺拳', group: 'combat' },
  { clip: 'Punch_Cross', en: 'Cross', zh: '直拳', group: 'combat' },
  { clip: 'Hit_Chest', en: 'Flinch', zh: '受擊', group: 'combat' },
  { clip: 'Roll', en: 'Roll', zh: '翻滾', group: 'move' },
  { clip: 'Jump_Start', en: 'Hop', zh: '跳', group: 'move' },
  { clip: 'Crouch_Idle_Loop', en: 'Crouch', zh: '蹲', group: 'move' },
  { clip: 'ClimbUp_1m', en: 'Climb', zh: '攀上', group: 'move' },
  { clip: 'OverhandThrow', en: 'Throw', zh: '投擲', group: 'move' },
  { clip: 'Walk_Formal_Loop', en: 'Formal walk', zh: '正步', group: 'move' },
  { clip: 'Jog_Fwd_Loop', en: 'Jog', zh: '慢跑', group: 'move' },
  { clip: 'Crouch_Fwd_Loop', en: 'Crouch walk', zh: '蹲行', group: 'move' },
  { clip: 'Jump_Land', en: 'Land', zh: '落地', group: 'move' },
  { clip: 'Jump_Loop', en: 'Air', zh: '滯空', group: 'move' },
  { clip: 'Sitting_Enter', en: 'Sit down', zh: '坐下', group: 'social' },
  { clip: 'Sitting_Exit', en: 'Stand', zh: '起身', group: 'social' },
  { clip: 'Spell_Simple_Enter', en: 'Spell in', zh: '起手', group: 'combat' },
  { clip: 'Spell_Simple_Exit', en: 'Spell out', zh: '收法', group: 'combat' },
  { clip: 'Hit_Head', en: 'Head hit', zh: '頭部受擊', group: 'combat' },
  { clip: 'Hit_Knockback', en: 'Knockback', zh: '擊退', group: 'combat' },
  { clip: 'Death01', en: 'Fall', zh: '倒下', group: 'combat' },
  { clip: 'Idle_Rail_Call', en: 'Call', zh: '招呼', group: 'social' },
  { clip: 'Idle_Shield_Break', en: 'Shield break', zh: '破盾', group: 'combat' },
  { clip: 'LayToIdle', en: 'Get up', zh: '起身', group: 'move' },
  { clip: 'Melee_Hook_Rec', en: 'Hook recover', zh: '收勾', group: 'combat' },
  { clip: 'Shield_Dash', en: 'Shield dash', zh: '盾衝', group: 'combat' },
  { clip: 'Shield_OneShot', en: 'Shield hit', zh: '盾擊', group: 'combat' },
  { clip: 'Sword_Regular_A', en: 'Cut A', zh: '斬甲', group: 'combat' },
  { clip: 'Sword_Regular_B', en: 'Cut B', zh: '斬乙', group: 'combat' },
  { clip: 'Sword_Regular_C', en: 'Cut C', zh: '斬丙', group: 'combat' },
  { clip: 'Sword_Regular_A_Rec', en: 'Recover A', zh: '收甲', group: 'combat' },
  { clip: 'Sword_Regular_B_Rec', en: 'Recover B', zh: '收乙', group: 'combat' },
  { clip: 'Slide_Start', en: 'Slide', zh: '滑步', group: 'move' },
  { clip: 'Slide_Loop', en: 'Slide loop', zh: '滑行', group: 'move' },
  { clip: 'Slide_Exit', en: 'Slide end', zh: '停滑', group: 'move' },
  { clip: 'NinjaJump_Start', en: 'Leap', zh: '飛躍', group: 'move' },
  { clip: 'NinjaJump_Idle_Loop', en: 'Leap hold', zh: '滯躍', group: 'move' },
  { clip: 'NinjaJump_Land', en: 'Leap land', zh: '躍落', group: 'move' },
  { clip: 'Swim_Idle_Loop', en: 'Tread', zh: '踩水', group: 'move' },
  { clip: 'Swim_Fwd_Loop', en: 'Swim', zh: '游泳', group: 'move' },
  { clip: 'Driving_Loop', en: 'Drive', zh: '駕駛', group: 'move' },
  { clip: 'Idle_TalkingPhone_Loop', en: 'Phone', zh: '通話', group: 'social' },
  { clip: 'Pistol_Idle_Loop', en: 'Pistol idle', zh: '持槍', group: 'combat' },
  { clip: 'Pistol_Aim_Neutral', en: 'Aim', zh: '瞄準', group: 'combat' },
  { clip: 'Pistol_Aim_Up', en: 'Aim up', zh: '向上瞄', group: 'combat' },
  { clip: 'Pistol_Aim_Down', en: 'Aim down', zh: '向下瞄', group: 'combat' },
  { clip: 'Pistol_Shoot', en: 'Shoot', zh: '射擊', group: 'combat' },
  { clip: 'Pistol_Reload', en: 'Reload', zh: '裝填', group: 'combat' },
  { clip: 'Zombie_Idle_Loop', en: 'Zombie idle', zh: '僵立', group: 'social' },
  { clip: 'Zombie_Walk_Fwd_Loop', en: 'Zombie walk', zh: '僵行', group: 'move' },
  { clip: 'Zombie_Scratch', en: 'Scratch', zh: '抓', group: 'combat' },
] as const

/** Kept for remote pose checks. These clips also sit on the Perform menu. */
export const HARBOR_RPG_COMBAT_CLIPS = ['Death01', 'Hit_Head', 'Hit_Knockback'] as const

const PERFORM_SET = new Set(HARBOR_RPG_PERFORMS.map((p) => p.clip))
const ANIM_SET = new Set<string>([
  ...PERFORM_SET,
  ...HARBOR_RPG_COMBAT_CLIPS,
  ...HARBOR_RPG_LOCO_CLIPS.idle,
  ...HARBOR_RPG_LOCO_CLIPS.walk,
  ...HARBOR_RPG_LOCO_CLIPS.sprint,
])

export function isHarborRpgPerformClip(clip: string): boolean {
  return PERFORM_SET.has(clip)
}

export function isHarborRpgAnimClip(clip: string): boolean {
  return ANIM_SET.has(clip)
}

export function harborRpgEmoteClip(id: string): string | null {
  if (id in HARBOR_RPG_EMOTE_CLIP) {
    return HARBOR_RPG_EMOTE_CLIP[id as keyof typeof HARBOR_RPG_EMOTE_CLIP]
  }
  return null
}

export function harborRpgAnimLoops(clip: string): boolean {
  return clip.includes('_Loop')
}

export const HARBOR_RPG_PERFORM_GROUPS: { id: HarborRpgPerformGroup; en: string }[] = [
  { id: 'social', en: 'Social' },
  { id: 'craft', en: 'Craft' },
  { id: 'combat', en: 'Combat' },
  { id: 'move', en: 'Move' },
]
