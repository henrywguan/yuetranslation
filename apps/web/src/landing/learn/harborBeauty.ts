/**
 * Harbor Quest · beauty salon SKUs (v3 deepen).
 * Barber / create share styles; premium dyes & rare faces are paid cosmetics.
 * All cosmetic — no stats. No fashion overlay layer.
 */
import {
  HARBOR_EYE_COLORS,
  HARBOR_EYE_STYLES,
  HARBOR_FACE_STYLES,
  HARBOR_HAIR_COLORS,
  HARBOR_HAIR_STYLES,
  type HarborEyeStyle,
  type HarborFaceStyle,
  type HarborHairStyle,
} from './harborAppearance'

export type HarborBeautyKind = 'hairStyle' | 'hairDye' | 'eyeStyle' | 'eyeDye' | 'faceStyle'

export type HarborBeautySku = {
  id: string
  kind: HarborBeautyKind
  /** Index into the matching appearance palette / style list, or style id. */
  ref: string | number
  name: { en: string; zh: string }
  /** Ferry-coin price. 0 = free at barber / create. */
  price: number
  /** true = VIP / premium beauty shelf. */
  premium: boolean
}

/** Free styles always unlocked; premium dyes/faces require purchase or event grant. */
export const HARBOR_BEAUTY_SKUS: readonly HarborBeautySku[] = [
  // Hair styles — base free, twin/wave premium silhouette
  ...HARBOR_HAIR_STYLES.filter((s) => s !== 'twin' && s !== 'wave').map(
    (s): HarborBeautySku => ({
      id: `beauty-hair-${s}`,
      kind: 'hairStyle',
      ref: s,
      name: { en: `Hair · ${s}`, zh: '髮型' },
      price: 0,
      premium: false,
    }),
  ),
  {
    id: 'beauty-hair-twin',
    kind: 'hairStyle',
    ref: 'twin' satisfies HarborHairStyle,
    name: { en: 'Twin loops', zh: '雙環髻' },
    price: 48,
    premium: true,
  },
  {
    id: 'beauty-hair-wave',
    kind: 'hairStyle',
    ref: 'wave' satisfies HarborHairStyle,
    name: { en: 'Harbor wave', zh: '港灣波浪' },
    price: 56,
    premium: true,
  },
  // Hair dyes — first four free; festival/jade/pearl premium
  ...HARBOR_HAIR_COLORS.map((hex, i): HarborBeautySku => ({
    id: `beauty-dye-hair-${i}`,
    kind: 'hairDye',
    ref: i,
    name: {
      en: i < 4 ? `Hair dye ${i + 1}` : `Premium dye ${i + 1}`,
      zh: i < 4 ? '染髮' : '貴賓染',
    },
    price: i < 4 ? 0 : 24 + (i - 4) * 8,
    premium: i >= 4,
  })),
  // Eyes
  ...HARBOR_EYE_STYLES.map(
    (s): HarborBeautySku => ({
      id: `beauty-eye-${s}`,
      kind: 'eyeStyle',
      ref: s satisfies HarborEyeStyle,
      name: { en: `Eyes · ${s}`, zh: '眼型' },
      price: s === 'round' || s === 'almond' ? 0 : 32,
      premium: s === 'bright' || s === 'sleepy',
    }),
  ),
  ...HARBOR_EYE_COLORS.map((_hex, i): HarborBeautySku => ({
    id: `beauty-dye-eye-${i}`,
    kind: 'eyeDye',
    ref: i,
    name: { en: i < 2 ? `Iris ${i + 1}` : `Premium iris ${i + 1}`, zh: '瞳色' },
    price: i < 2 ? 0 : 18 + (i - 2) * 6,
    premium: i >= 2,
  })),
  // Faces
  ...HARBOR_FACE_STYLES.map(
    (s): HarborBeautySku => ({
      id: `beauty-face-${s}`,
      kind: 'faceStyle',
      ref: s satisfies HarborFaceStyle,
      name: { en: `Face · ${s}`, zh: '面相' },
      price: s === 'soft' || s === 'calm' ? 0 : 40,
      premium: s === 'sharp' || s === 'cheerful',
    }),
  ),
]

export function harborBeautySkuById(id: string): HarborBeautySku | undefined {
  return HARBOR_BEAUTY_SKUS.find((s) => s.id === id)
}

export function harborBeautyIsUnlocked(
  skuId: string,
  ownedBeauty: readonly string[],
): boolean {
  const sku = harborBeautySkuById(skuId)
  if (!sku) return false
  if (!sku.premium && sku.price === 0) return true
  return ownedBeauty.includes(skuId)
}

/** SKUs unlocked for free at first create (non-premium). */
export function harborBeautyStarterOwned(): string[] {
  return HARBOR_BEAUTY_SKUS.filter((s) => s.price === 0).map((s) => s.id)
}

export function sanitizeHarborBeautyOwned(raw: unknown): string[] {
  const starter = new Set(harborBeautyStarterOwned())
  const out = new Set<string>(starter)
  if (!Array.isArray(raw)) return [...out]
  for (const id of raw) {
    if (typeof id !== 'string') continue
    if (harborBeautySkuById(id)) out.add(id)
  }
  return [...out]
}

/** SKU ids required to wear this appearance (premium dyes / rare styles). */
export function harborBeautySkusForAppearance(appearance: {
  hairStyle: HarborHairStyle
  hairColor: number
  eyeStyle: HarborEyeStyle
  eyeColor: number
  faceStyle: HarborFaceStyle
}): string[] {
  return [
    `beauty-hair-${appearance.hairStyle}`,
    `beauty-dye-hair-${appearance.hairColor}`,
    `beauty-eye-${appearance.eyeStyle}`,
    `beauty-dye-eye-${appearance.eyeColor}`,
    `beauty-face-${appearance.faceStyle}`,
  ].filter((id) => Boolean(harborBeautySkuById(id)))
}

/** First locked premium SKU for the current look (barber tip), or null. */
export function harborBeautyLockedSku(
  appearance: {
    hairStyle: HarborHairStyle
    hairColor: number
    eyeStyle: HarborEyeStyle
    eyeColor: number
    faceStyle: HarborFaceStyle
  },
  ownedBeauty: readonly string[],
): HarborBeautySku | null {
  for (const id of harborBeautySkusForAppearance(appearance)) {
    if (!harborBeautyIsUnlocked(id, ownedBeauty)) {
      return harborBeautySkuById(id) ?? null
    }
  }
  return null
}

/**
 * Ferry-coin cost to unlock every still-locked SKU needed for `appearance`.
 * Already-owned / free SKUs contribute 0.
 */
export function harborBeautyUnlockCost(
  appearance: {
    hairStyle: HarborHairStyle
    hairColor: number
    eyeStyle: HarborEyeStyle
    eyeColor: number
    faceStyle: HarborFaceStyle
  },
  ownedBeauty: readonly string[],
): { cost: number; missing: string[] } {
  const missing: string[] = []
  let cost = 0
  for (const id of harborBeautySkusForAppearance(appearance)) {
    if (harborBeautyIsUnlocked(id, ownedBeauty)) continue
    const sku = harborBeautySkuById(id)
    if (!sku) continue
    missing.push(id)
    cost += sku.price
  }
  return { cost, missing }
}
