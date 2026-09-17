/**
 * Harbor minimap geography — place labels, land topography paths, cardinals.
 * World +Z = north, +X = east (matches Guan / river voyage).
 */
import {
  GUAN_CAPE_LOOM,
  GUAN_HARBOR_META,
  GUAN_LAND_OUTLINE,
  GUAN_LANDMARKS,
  GUAN_RETURN_PORTAL,
  isGuanLand,
} from './harborGuanRealm'
import { GUAN_FISH_SPOTS, GUAN_FISHING_HUT, GUAN_SATELLITE_ISLANDS } from './harborFishing'
import {
  HARBOR_DOCK_SPACING,
  HARBOR_VISITABLES,
  biomeForChunk,
  type HarborRealmId,
} from './harborWorld'

export type MinimapPlace = { en: string; zh: string; kind: 'land' | 'sea' | 'river' }

export type MinimapGeoFeature = {
  id: string
  kind: 'land' | 'ridge' | 'water' | 'sand' | 'ash'
  /** Closed polygon when `closed`; otherwise open polyline (ridge / river). */
  closed: boolean
  points: readonly { x: number; z: number }[]
}

const RIVER = 3.4
const BANK = 7.2

/** Named Guan regions for the location strip (nearest wins). */
const GUAN_PLACES: readonly { en: string; zh: string; x: number; z: number; r: number }[] = [
  { en: 'Musa Point', zh: '巫沙角', x: GUAN_LANDMARKS.musaPoint.x, z: GUAN_LANDMARKS.musaPoint.z, r: 4.2 },
  { en: 'Musa Dock', zh: '巫沙碼頭', x: GUAN_LANDMARKS.musaDock.x, z: GUAN_LANDMARKS.musaDock.z, r: 2.4 },
  { en: 'Banana Grove', zh: '蕉林', x: GUAN_LANDMARKS.bananaGrove.x, z: GUAN_LANDMARKS.bananaGrove.z, r: 2.8 },
  { en: 'Volcano', zh: '火山', x: GUAN_LANDMARKS.volcano.x, z: GUAN_LANDMARKS.volcano.z, r: 3.6 },
  { en: 'Brimhaven', zh: '焰灣', x: GUAN_LANDMARKS.brimhaven.x, z: GUAN_LANDMARKS.brimhaven.z, r: 4.0 },
  { en: 'Brimhaven Dock', zh: '焰灣碼頭', x: GUAN_LANDMARKS.brimhavenDock.x, z: GUAN_LANDMARKS.brimhavenDock.z, r: 2.6 },
  { en: 'Tai Bwo Wannai', zh: '泰和南', x: GUAN_LANDMARKS.taiBwoWannai.x, z: GUAN_LANDMARKS.taiBwoWannai.z, r: 3.5 },
  { en: 'Ship Yard', zh: '船塢', x: GUAN_LANDMARKS.shipYard.x, z: GUAN_LANDMARKS.shipYard.z, r: 3.2 },
  { en: 'Shilo Village', zh: '石廬', x: GUAN_LANDMARKS.shilo.x, z: GUAN_LANDMARKS.shilo.z, r: 3.8 },
  {
    en: 'Cairn Isle',
    zh: '石塚島',
    x: GUAN_LANDMARKS.cairnIsle.x,
    z: GUAN_LANDMARKS.cairnIsle.z,
    r: GUAN_LANDMARKS.cairnIsle.r + 0.8,
  },
  { en: 'Musa Passage', zh: '巫沙水道', x: GUAN_LANDMARKS.musaPassage.x, z: GUAN_LANDMARKS.musaPassage.z, r: 2.8 },
  {
    en: GUAN_FISHING_HUT.name.en,
    zh: GUAN_FISHING_HUT.name.zh,
    x: GUAN_FISHING_HUT.x,
    z: GUAN_FISHING_HUT.z,
    r: 2.2,
  },
  {
    en: GUAN_CAPE_LOOM.name.en,
    zh: GUAN_CAPE_LOOM.name.zh,
    x: GUAN_CAPE_LOOM.x,
    z: GUAN_CAPE_LOOM.z,
    r: 2.0,
  },
  {
    en: 'Customs',
    zh: '關口',
    x: GUAN_RETURN_PORTAL.x,
    z: GUAN_RETURN_PORTAL.z,
    r: 2.0,
  },
  ...GUAN_SATELLITE_ISLANDS.map((s) => ({
    en: s.name.en,
    zh: s.name.zh,
    x: s.x,
    z: s.z,
    r: s.r + 1.1,
  })),
  ...GUAN_FISH_SPOTS.map((s) => ({
    en: s.region,
    zh: s.name.zh,
    x: s.x,
    z: s.z,
    r: 2.0,
  })),
]

const RIVER_BIOME_LABEL: Record<string, MinimapPlace> = {
  pier: { en: 'Harbor Piers', zh: '港灣碼頭', kind: 'river' },
  village: { en: 'River Village', zh: '河畔村', kind: 'river' },
  forest: { en: 'Bamboo Bank', zh: '竹岸', kind: 'river' },
  reeds: { en: 'Reed Flats', zh: '蘆灘', kind: 'river' },
  hills: { en: 'River Hills', zh: '河丘', kind: 'river' },
}

function circlePoints(cx: number, cz: number, r: number, n = 12): { x: number; z: number }[] {
  const pts: { x: number; z: number }[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    pts.push({ x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r })
  }
  return pts
}

/** Resolve the sailor’s current named location for the minimap header. */
export function resolveHarborMinimapPlace(
  x: number,
  z: number,
  realm: HarborRealmId | null | undefined,
): MinimapPlace {
  if (realm === 'guan') {
    let best: { en: string; zh: string; d: number } | null = null
    for (const p of GUAN_PLACES) {
      const d = Math.hypot(x - p.x, z - p.z)
      if (d > p.r) continue
      if (!best || d < best.d) best = { en: p.en, zh: p.zh, d }
    }
    if (best) return { en: best.en, zh: best.zh, kind: isGuanLand(x, z) ? 'land' : 'sea' }
    if (isGuanLand(x, z)) return { en: GUAN_HARBOR_META.en, zh: GUAN_HARBOR_META.zh, kind: 'land' }
    return { en: 'Open Sea', zh: '外海', kind: 'sea' }
  }

  if (realm === 'bamboo') {
    return { en: 'Bamboo Academy', zh: '竹院', kind: 'land' }
  }

  // River voyage — nearest landmark or biome strip
  let nearest = HARBOR_VISITABLES[0]!
  let nearestD = Infinity
  for (const v of HARBOR_VISITABLES) {
    const d = Math.hypot(x - v.x, z - v.z)
    if (d < nearestD) {
      nearestD = d
      nearest = v
    }
  }
  if (nearestD < 5.5) {
    return { en: nearest.name.en, zh: nearest.name.zh, kind: Math.abs(x) < RIVER ? 'river' : 'land' }
  }
  const chunk = Math.floor(z / HARBOR_DOCK_SPACING)
  const biome = biomeForChunk(chunk)
  const label = RIVER_BIOME_LABEL[biome] ?? RIVER_BIOME_LABEL.village!
  if (Math.abs(x) < RIVER * 0.95) return { ...label, kind: 'river' }
  return label
}

/** Topography polygons / polylines for the radar disc (world xz). */
export function buildMinimapGeoFeatures(
  realm: HarborRealmId | null | undefined,
  poseX: number,
  poseZ: number,
): MinimapGeoFeature[] {
  if (realm === 'guan') {
    const features: MinimapGeoFeature[] = [
      {
        id: 'guan-main',
        kind: 'land',
        closed: true,
        points: GUAN_LAND_OUTLINE,
      },
      {
        id: 'cairn',
        kind: 'sand',
        closed: true,
        points: circlePoints(
          GUAN_LANDMARKS.cairnIsle.x,
          GUAN_LANDMARKS.cairnIsle.z,
          GUAN_LANDMARKS.cairnIsle.r * 0.92,
          10,
        ),
      },
      {
        id: 'volcano-ridge',
        kind: 'ash',
        closed: true,
        points: circlePoints(GUAN_LANDMARKS.volcano.x, GUAN_LANDMARKS.volcano.z, 2.6, 10),
      },
      {
        id: 'volcano-peak',
        kind: 'ridge',
        closed: true,
        points: circlePoints(GUAN_LANDMARKS.volcano.x, GUAN_LANDMARKS.volcano.z, 1.15, 8),
      },
    ]
    for (const island of GUAN_SATELLITE_ISLANDS) {
      features.push({
        id: `sat-${island.id}`,
        kind: island.biome === 'ember' ? 'ash' : island.biome === 'coral' ? 'sand' : 'land',
        closed: true,
        points: circlePoints(island.x, island.z, island.r * 0.9, 10),
      })
    }
    return features
  }

  // River / bamboo — local corridor around the sailor (relative world strip)
  const z0 = poseZ - 48
  const z1 = poseZ + 48
  const steps = 10
  const leftBank: { x: number; z: number }[] = []
  const rightBank: { x: number; z: number }[] = []
  const riverPoly: { x: number; z: number }[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const z = z0 + (z1 - z0) * t
    leftBank.push({ x: -(RIVER + 0.15), z })
    rightBank.push({ x: RIVER + 0.15, z })
  }
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    riverPoly.push({ x: -RIVER, z: z0 + (z1 - z0) * t })
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps
    riverPoly.push({ x: RIVER, z: z0 + (z1 - z0) * t })
  }
  const westLand: { x: number; z: number }[] = [
    { x: -BANK - 2, z: z0 },
    ...leftBank,
    { x: -BANK - 2, z: z1 },
  ]
  const eastLand: { x: number; z: number }[] = [
    { x: BANK + 2, z: z0 },
    ...rightBank,
    { x: BANK + 2, z: z1 },
  ]
  return [
    { id: 'west-bank', kind: 'land', closed: true, points: westLand },
    { id: 'east-bank', kind: 'land', closed: true, points: eastLand },
    { id: 'river', kind: 'water', closed: true, points: riverPoly },
  ]
}

export const MINIMAP_CARDINALS = [
  { id: 'N', label: 'N', dx: 0, dz: 1 },
  { id: 'E', label: 'E', dx: 1, dz: 0 },
  { id: 'S', label: 'S', dx: 0, dz: -1 },
  { id: 'W', label: 'W', dx: -1, dz: 0 },
] as const
