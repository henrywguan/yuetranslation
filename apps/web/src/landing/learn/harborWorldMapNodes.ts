/**
 * Harbor World map · chapter / landmark nodes for continent drill-down.
 * Positions are normalized 0–1 over the region chart (MapleStory-style dots).
 */
import { HARBOR_CAMPAIGNS, HARBOR_LEVELS, levelCampaign, type HarborCampaignId } from './curriculum'
import type { HarborProgress } from './progressMerge'
import { isLevelCleared, isLevelUnlocked } from './progressMerge'

export type WorldMapNodeKind = 'chapter' | 'landmark'

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

/** Guan Harbor landmark nodes (not curriculum chapters). */
export function guanLandmarkNodes(here: boolean): WorldMapNode[] {
  const spots: { id: string; en: string; zh: string; x: number; y: number }[] = [
    { id: 'guan-customs', en: 'Customs', zh: '關口', x: 0.22, y: 0.55 },
    { id: 'guan-dock', en: 'Musa Dock', zh: '碼頭', x: 0.34, y: 0.68 },
    { id: 'guan-loom', en: 'Cape Loom', zh: '海角織坊', x: 0.58, y: 0.32 },
    { id: 'guan-fish', en: 'Fishing Lodge', zh: '釣魚屋', x: 0.72, y: 0.58 },
    { id: 'guan-lagoon', en: 'Lagoon', zh: '潟湖', x: 0.78, y: 0.74 },
  ]
  return spots.map((s) => ({
    id: s.id,
    kind: 'landmark' as const,
    title: { en: s.en, zh: s.zh },
    x: s.x,
    y: s.y,
    status: here ? ('here' as const) : ('landmark' as const),
  }))
}
