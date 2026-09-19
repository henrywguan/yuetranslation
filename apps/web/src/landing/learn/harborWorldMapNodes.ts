/**
 * Harbor Quest map · chapter / landmark nodes for continent drill-down.
 * Positions are normalized 0–1 over the region chart (MapleStory-style dots).
 */
import { HARBOR_CAMPAIGNS, HARBOR_LEVELS, levelCampaign, type HarborCampaignId } from './curriculum'
import {
  GUAN_FISHING_HUT,
  fishingXpToLevel,
  guanFishSpotsByLevel,
  harborFishSpotMinLevel,
  type HarborFishSpotId,
} from './harborFishing'
import type { HarborProgress } from './progressMerge'
import { isLevelCleared, isLevelUnlocked } from './progressMerge'

export type WorldMapNodeKind = 'chapter' | 'landmark' | 'fish-spot'

export type WorldMapNode = {
  id: string
  kind: WorldMapNodeKind
  /** Campaign / landmark label. */
  title: { en: string; zh: string }
  /** Normalized position on the continent chart. */
  x: number
  y: number
  /** For chapter nodes — first pier id to open. */
  levelId?: string
  campaign?: HarborCampaignId
  /** Guan fish-spot teleport target (world xz). */
  fishSpotId?: HarborFishSpotId | 'fishing-hut'
  fishLevel?: number
  worldX?: number
  worldZ?: number
  /** Cleared / current / locked / landmark. */
  status: 'cleared' | 'current' | 'unlocked' | 'locked' | 'here' | 'landmark'
}

/** Place n nodes along a soft S-curve (MapleStory path feel). */
function pathPoints(n: number, opts?: { x0?: number; x1?: number; y0?: number; y1?: number }): { x: number; y: number }[] {
  const x0 = opts?.x0 ?? 0.14
  const x1 = opts?.x1 ?? 0.86
  const y0 = opts?.y0 ?? 0.22
  const y1 = opts?.y1 ?? 0.78
  const out: { x: number; y: number }[] = []
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1)
    const x = x0 + (x1 - x0) * t
    // Gentle S vertical wobble so the path isn’t a straight diagonal.
    const y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * 0.06 * (i % 2 === 0 ? 1 : -1)
    out.push({ x, y: Math.min(0.9, Math.max(0.1, y)) })
  }
  return out
}

function shortCampaignTitle(id: HarborCampaignId): { en: string; zh: string } {
  const meta = HARBOR_CAMPAIGNS.find((c) => c.id === id)
  if (!meta) return { en: id, zh: id }
  const en = meta.title.en.replace(/^Campaign \d+ · /, '').replace(/^Life Unit /, 'U')
  const zh = meta.title.zh.replace(/^航線[^·]+ · /, '')
  return { en, zh }
}

/**
 * Learning voyage continent — one node per campaign (Sounds → Life 0–11).
 * Dot status from pier progress within that campaign.
 */
export function voyageChapterNodes(
  progress: HarborProgress,
  activeLevelId: string | null,
): WorldMapNode[] {
  const ids = HARBOR_LEVELS.map((l) => l.id)
  const pts = pathPoints(HARBOR_CAMPAIGNS.length, { y0: 0.18, y1: 0.82 })
  return HARBOR_CAMPAIGNS.map((camp, i) => {
    const levels = HARBOR_LEVELS.filter((l) => levelCampaign(l) === camp.id)
    const allCleared = levels.length > 0 && levels.every((l) => isLevelCleared(l.id, progress))
    const anyUnlocked = levels.some((l) => isLevelUnlocked(l.id, ids, progress))
    const currentHere = levels.some((l) => l.id === activeLevelId)
    const firstOpen =
      levels.find((l) => !isLevelCleared(l.id, progress) && isLevelUnlocked(l.id, ids, progress)) ??
      levels[0]
    let status: WorldMapNode['status'] = 'locked'
    if (currentHere) status = 'current'
    else if (allCleared) status = 'cleared'
    else if (anyUnlocked) status = 'unlocked'
    const title = shortCampaignTitle(camp.id)
    return {
      id: `camp-${camp.id}`,
      kind: 'chapter' as const,
      title,
      x: pts[i]!.x,
      y: pts[i]!.y,
      levelId: firstOpen?.id,
      campaign: camp.id,
      status,
    }
  })
}

/** Overview continent badge — cleared / total chapter piers. */
export function voyageProgressSummary(progress: HarborProgress): { cleared: number; total: number } {
  const total = HARBOR_LEVELS.length
  const cleared = HARBOR_LEVELS.filter((l) => isLevelCleared(l.id, progress)).length
  return { cleared, total }
}

/**
 * Guan Harbor nodes — Fishing Lodge + cast spots ordered by fishing level (1 → 99 path).
 * Selecting a fish-spot node teleports the canoe to that water.
 */
export function guanLandmarkNodes(
  here: boolean,
  opts?: { fishingXp?: number; nearSpotId?: string | null },
): WorldMapNode[] {
  const fishingLevel = fishingXpToLevel(opts?.fishingXp ?? 0)
  const nearId = opts?.nearSpotId ?? null
  const spots = guanFishSpotsByLevel()
  // Lodge first (gear), then spots by bite-level band toward 99.
  const entries: Array<{
    id: string
    fishSpotId: HarborFishSpotId | 'fishing-hut'
    en: string
    zh: string
    level: number
    x: number
    z: number
  }> = [
    {
      id: 'guan-fish-lodge',
      fishSpotId: 'fishing-hut',
      en: GUAN_FISHING_HUT.name.en,
      zh: GUAN_FISHING_HUT.name.zh,
      level: 1,
      x: GUAN_FISHING_HUT.x,
      z: GUAN_FISHING_HUT.z,
    },
    ...spots.map((s) => ({
      id: s.id,
      fishSpotId: s.id as HarborFishSpotId,
      en: s.name.en,
      zh: s.name.zh,
      level: harborFishSpotMinLevel(s),
      x: s.x,
      z: s.z,
    })),
  ]
  const pts = pathPoints(entries.length, { x0: 0.14, x1: 0.88, y0: 0.18, y1: 0.84 })
  return entries.map((s, i) => {
    const unlocked = fishingLevel >= s.level
    let status: WorldMapNode['status'] = 'locked'
    if (nearId && (nearId === s.id || nearId === s.fishSpotId)) status = 'here'
    else if (!unlocked) status = 'locked'
    else if (here) status = 'unlocked'
    else status = 'landmark'
    return {
      id: s.id,
      kind: 'fish-spot' as const,
      title: {
        en: `Lv ${s.level} · ${s.en}`,
        zh: `Lv ${s.level} · ${s.zh}`,
      },
      x: pts[i]!.x,
      y: pts[i]!.y,
      fishSpotId: s.fishSpotId,
      fishLevel: s.level,
      worldX: s.x,
      worldZ: s.z,
      status,
    }
  })
}
