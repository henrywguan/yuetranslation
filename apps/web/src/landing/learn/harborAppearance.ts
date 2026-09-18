/**
 * Harbor Quest character appearance — original River Scout cosmetics.
 * OSRS-style creation grammar (gender + arrow rows); not Jagex IP.
 * v3: eyes + face styles so barber / create change identity at distance.
 */

export type HarborGender = 'male' | 'female'

export type HarborHairStyle = 'short' | 'bun' | 'long' | 'fringe' | 'topknot' | 'twin' | 'wave'

export type HarborEyeStyle = 'round' | 'almond' | 'bright' | 'sleepy'

export type HarborFaceStyle = 'soft' | 'sharp' | 'cheerful' | 'calm'

export type HarborAppearance = {
  skinTone: number
  hairStyle: HarborHairStyle
  hairColor: number
  eyeStyle: HarborEyeStyle
  /** Index into HARBOR_EYE_COLORS. */
  eyeColor: number
  faceStyle: HarborFaceStyle
}

export const HARBOR_HAIR_STYLES: readonly HarborHairStyle[] = [
  'short',
  'bun',
  'long',
  'fringe',
  'topknot',
  'twin',
  'wave',
] as const

export const HARBOR_HAIR_STYLE_LABEL: Record<HarborHairStyle, { en: string; zh: string }> = {
  short: { en: 'Short crop', zh: '短髮' },
  bun: { en: 'Traveler bun', zh: '旅人髻' },
  long: { en: 'River length', zh: '河長髮' },
  fringe: { en: 'Fringe cut', zh: '劉海' },
  topknot: { en: 'Jade topknot', zh: '玉頂髻' },
  twin: { en: 'Twin loops', zh: '雙環髻' },
  wave: { en: 'Harbor wave', zh: '港灣波浪' },
}

export const HARBOR_EYE_STYLES: readonly HarborEyeStyle[] = [
  'round',
  'almond',
  'bright',
  'sleepy',
] as const

export const HARBOR_EYE_STYLE_LABEL: Record<HarborEyeStyle, { en: string; zh: string }> = {
  round: { en: 'Round', zh: '圓眼' },
  almond: { en: 'Almond', zh: '杏眼' },
  bright: { en: 'Bright', zh: '亮眼' },
  sleepy: { en: 'Sleepy', zh: '慵眼' },
}

export const HARBOR_FACE_STYLES: readonly HarborFaceStyle[] = [
  'soft',
  'sharp',
  'cheerful',
  'calm',
] as const

export const HARBOR_FACE_STYLE_LABEL: Record<HarborFaceStyle, { en: string; zh: string }> = {
  soft: { en: 'Soft', zh: '柔和' },
  sharp: { en: 'Sharp', zh: '分明' },
  cheerful: { en: 'Cheerful', zh: '開朗' },
  calm: { en: 'Calm', zh: '沉靜' },
}

/** Posterized skin tones (Harbor swatches). */
export const HARBOR_SKIN_TONES: readonly number[] = [
  0xffe0c8, // porcelain
  0xe8c4a8, // harbor default
  0xd4a574, // warm sand
  0xb07a4a, // tea
  0x8a5a38, // cedar
  0x5a3a28, // deep umber
] as const

/** Hair dyes — readable at low poly. */
export const HARBOR_HAIR_COLORS: readonly number[] = [
  0x1a1410, // ink black
  0x3a2818, // chestnut
  0x6a4020, // amber
  0xc4a860, // straw gold
  0x8a2a30, // festival crimson
  0x2a4a58, // harbor blue
  0x3dcfb6, // jade tip
  0xe8e0d0, // pearl white
] as const

/** Eye dyes. */
export const HARBOR_EYE_COLORS: readonly number[] = [
  0x1a1814, // ink
  0x3a2818, // brown
  0x2a4a58, // harbor
  0x3dcfb6, // jade
  0x4a6aaa, // dusk blue
  0x8a2a30, // festival
] as const

export const HARBOR_DEFAULT_APPEARANCE: HarborAppearance = {
  skinTone: 1,
  hairStyle: 'bun',
  hairColor: 0,
  eyeStyle: 'round',
  eyeColor: 0,
  faceStyle: 'soft',
}

export function sanitizeHarborGender(raw: unknown): HarborGender {
  return raw === 'female' ? 'female' : 'male'
}

export function sanitizeHarborAppearance(raw: unknown): HarborAppearance {
  const base: HarborAppearance = { ...HARBOR_DEFAULT_APPEARANCE }
  if (!raw || typeof raw !== 'object') return base
  const o = raw as Record<string, unknown>
  if (typeof o.skinTone === 'number' && Number.isFinite(o.skinTone)) {
    const i = Math.floor(o.skinTone)
    if (i >= 0 && i < HARBOR_SKIN_TONES.length) base.skinTone = i
  }
  if (typeof o.hairStyle === 'string' && (HARBOR_HAIR_STYLES as readonly string[]).includes(o.hairStyle)) {
    base.hairStyle = o.hairStyle as HarborHairStyle
  }
  if (typeof o.hairColor === 'number' && Number.isFinite(o.hairColor)) {
    const i = Math.floor(o.hairColor)
    if (i >= 0 && i < HARBOR_HAIR_COLORS.length) base.hairColor = i
  }
  if (typeof o.eyeStyle === 'string' && (HARBOR_EYE_STYLES as readonly string[]).includes(o.eyeStyle)) {
    base.eyeStyle = o.eyeStyle as HarborEyeStyle
  }
  if (typeof o.eyeColor === 'number' && Number.isFinite(o.eyeColor)) {
    const i = Math.floor(o.eyeColor)
    if (i >= 0 && i < HARBOR_EYE_COLORS.length) base.eyeColor = i
  }
  if (typeof o.faceStyle === 'string' && (HARBOR_FACE_STYLES as readonly string[]).includes(o.faceStyle)) {
    base.faceStyle = o.faceStyle as HarborFaceStyle
  }
  return base
}

export function appearanceEqual(a: HarborAppearance, b: HarborAppearance): boolean {
  return (
    a.skinTone === b.skinTone &&
    a.hairStyle === b.hairStyle &&
    a.hairColor === b.hairColor &&
    a.eyeStyle === b.eyeStyle &&
    a.eyeColor === b.eyeColor &&
    a.faceStyle === b.faceStyle
  )
}

/** Guest / local display name rules (mirrors Account Hub: 3–24, start alnum). */
const LOCAL_USERNAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{2,23}$/

export function normalizeHarborUsernameInput(raw: string): string | null {
  const trimmed = raw.trim()
  if (!LOCAL_USERNAME_RE.test(trimmed)) return null
  return trimmed
}

export function harborUsernameHint(): string {
  return '3–24 characters · letters, numbers, . _ -'
}
