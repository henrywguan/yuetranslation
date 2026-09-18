/**
 * Harbor Quest · v2 modular compose scaffold.
 * Part roots + compose entry (ClaudeCraft assembleModular pattern, Harbor-scale).
 * Full skinned GLB merge comes later; v2 locks the contract and slot coverage rules.
 */
import type { HarborAppearance } from './harborAppearance'
import {
  HARBOR_DEFAULT_LOOK,
  HARBOR_GEAR_CATALOG,
  harborGearMeshInfo,
  type HarborGearSlot,
  type HarborLook,
} from './harborGear'

/** Stable part / slot ids for compose + smokes. */
export const HARBOR_MODULAR_BODY_PARTS = [
  'body_skin',
  'hair',
  'eyes',
  'under_top',
  'under_bottom',
] as const

export const HARBOR_MODULAR_SLOTS: readonly HarborGearSlot[] = [
  'hat',
  'top',
  'bottom',
  'shoes',
  'hand',
] as const

export type HarborModularPartId =
  | (typeof HARBOR_MODULAR_BODY_PARTS)[number]
  | `slot_${HarborGearSlot}`

export type HarborModularComposePlan = {
  appearance: HarborAppearance
  look: HarborLook
  /** Parts that stay visible (underclothes dropped when covered). */
  visibleBody: readonly string[]
  /** Slot → mesh family to attach. */
  slotFamilies: Partial<Record<HarborGearSlot, string>>
  /** True when a clothing slot covers / replaces underclothes. */
  covered: { top: boolean; bottom: boolean }
}

function itemById(id: string) {
  return HARBOR_GEAR_CATALOG.find((i) => i.id === id)
}

/**
 * Plan a modular look without touching Three.js — pure data for tests + future assemble.
 */
export function planHarborModularCompose(
  appearance: HarborAppearance,
  look: HarborLook,
): HarborModularComposePlan {
  const slotFamilies: Partial<Record<HarborGearSlot, string>> = {}
  for (const slot of HARBOR_MODULAR_SLOTS) {
    if (slot === 'hand') {
      slotFamilies.hand = look.hand
      continue
    }
    const id = look[slot]
    const item = itemById(id) ?? itemById(HARBOR_DEFAULT_LOOK[slot])!
    slotFamilies[slot] = harborGearMeshInfo(item).family
  }

  const covered = {
    top: look.top !== HARBOR_DEFAULT_LOOK.top,
    bottom: look.bottom !== HARBOR_DEFAULT_LOOK.bottom,
  }

  const visibleBody = [
    'body_skin',
    'hair',
    'eyes',
    ...(covered.top ? [] : ['under_top']),
    ...(covered.bottom ? [] : ['under_bottom']),
  ]

  return { appearance, look, visibleBody, slotFamilies, covered }
}

export function harborModularPartNames(): readonly HarborModularPartId[] {
  return [
    ...HARBOR_MODULAR_BODY_PARTS,
    ...HARBOR_MODULAR_SLOTS.map((s) => `slot_${s}` as const),
  ]
}
