/**
 * Harbor Quest · reuse V2 canoe + paper-lantern GLBs for every boat / lantern SKU.
 * Scale + tint the authored kit already in public — no new image-to-3D jobs.
 */
import type * as THREE from 'three'
import { mountHarborV2Asset, tintHarborV2Asset } from './harborV2Assets'

export type HarborBoatScale = { sx: number; sy: number; sz: number }

/** Family silhouettes from one canoe GLB (barge wider, reed shorter, VIP longer). */
export function harborBoatHullScale(boatId: string): HarborBoatScale {
  if (boatId.includes('barge') || boatId.includes('imperial')) {
    return { sx: 1.22, sy: 1.1, sz: 1.32 }
  }
  if (boatId.includes('pearl')) return { sx: 1.14, sy: 1.14, sz: 1.26 }
  if (boatId.includes('junk') || boatId.includes('merchant') || boatId.includes('dragon')) {
    return { sx: 1.12, sy: 1.06, sz: 1.2 }
  }
  if (boatId.includes('bamboo') || boatId.includes('reed')) {
    return { sx: 0.92, sy: 0.94, sz: 0.88 }
  }
  return { sx: 1, sy: 1, sz: 1 }
}

/** Plant the authored canoe, then tint / stretch toward the equipped boat SKU. */
export function mountHarborCanoeHull(
  parent: THREE.Object3D,
  boatId: string,
  opts: { color: number; name?: string; rotationY?: number } = { color: 0x8a6038 },
): THREE.Group {
  const scale = harborBoatHullScale(boatId)
  return mountHarborV2Asset(parent, 'canoe', {
    targetHeight: 0.55 * scale.sy,
    name: opts.name ?? 'v2-canoe-hull',
    rotationY: opts.rotationY ?? Math.PI / 2,
    onReady: (g) => {
      g.scale.x *= scale.sx
      g.scale.z *= scale.sz
      tintHarborV2Asset(g, opts.color, 0.48)
      g.userData.harborBoatId = boatId
    },
  })
}

/** Plant the authored paper lantern, tinted to the equipped lantern / hand color. */
export function mountHarborPaperLantern(
  parent: THREE.Object3D,
  opts: {
    color: number
    targetHeight?: number
    name?: string
    position?: [number, number, number]
  },
): THREE.Group {
  return mountHarborV2Asset(parent, 'lantern-paper', {
    targetHeight: opts.targetHeight ?? 0.32,
    name: opts.name ?? 'v2-paper-lantern',
    position: opts.position,
    onReady: (g) => {
      tintHarborV2Asset(g, opts.color, 0.55)
    },
  })
}
