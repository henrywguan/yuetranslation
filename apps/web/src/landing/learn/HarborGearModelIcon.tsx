import type { HarborGearItem } from './harborGear'
import { harborGearMeshInfo } from './harborGear'

function hex(n: number) {
  return `#${n.toString(16).padStart(6, '0')}`
}

/**
 * Low-poly SVG “model card” for Gear Codex / OSRS bag slots — silhouette per
 * mesh family, tinted with the catalog color so every piece shows a readable
 * shape (not just a flat swatch + name).
 */
export function HarborGearModelIcon({
  item,
  compact = false,
}: {
  item: HarborGearItem
  /** Bag / inventory slot — no card plate, fills the cell. */
  compact?: boolean
}) {
  const mesh = harborGearMeshInfo(item)
  const fill = hex(item.color)
  const accent = hex(item.accent ?? item.color)
  const family = mesh.family

  return (
    <span
      className={compact ? 'hq-bag-model' : 'hq-codex-model'}
      aria-hidden="true"
      data-family={family}
      data-slot={item.slot}
    >
      <svg
        viewBox="0 0 64 64"
        // Compact bag slots must NOT ship intrinsic 64×64 — that blows mobile
        // grid cells and spills silhouettes across neighbors (Safari especially).
        width={compact ? undefined : 64}
        height={compact ? undefined : 64}
        className={compact ? 'hq-bag-model-svg' : 'hq-codex-model-svg'}
        preserveAspectRatio="xMidYMid meet"
      >
        {compact ? null : <rect width="64" height="64" rx="10" fill="rgba(4,16,24,0.72)" />}
        {drawSilhouette(item.slot, family, item.id, fill, accent)}
      </svg>
    </span>
  )
}

function drawSilhouette(
  slot: HarborGearItem['slot'],
  family: string,
  id: string,
  fill: string,
  accent: string,
) {
  if (slot === 'hat') {
    if (id.includes('bamboo') || id.includes('straw')) {
      return (
        <>
          <ellipse cx="32" cy="38" rx="22" ry="8" fill={fill} />
          <path d="M18 36 Q32 10 46 36 Z" fill={fill} />
          <ellipse cx="32" cy="36" rx="8" ry="3" fill={accent} />
        </>
      )
    }
    if (id.includes('scarf') || id.includes('fisherman')) {
      return (
        <>
          <ellipse cx="32" cy="28" rx="14" ry="12" fill={fill} />
          <path d="M18 30 Q10 44 22 48 Q28 40 32 34 Z" fill={fill} />
          <path d="M46 30 Q54 44 42 48 Q36 40 32 34 Z" fill={accent} opacity="0.85" />
        </>
      )
    }
    return (
      <>
        <ellipse cx="32" cy="34" rx="16" ry="14" fill={fill} />
        <rect x="20" y="42" width="24" height="6" rx="2" fill={accent} />
      </>
    )
  }

  if (slot === 'top') {
    return (
      <>
        <path d="M18 18 L32 14 L46 18 L52 28 L44 30 L44 50 L20 50 L20 30 L12 28 Z" fill={fill} />
        <rect x="26" y="28" width="12" height="18" rx="2" fill={accent} opacity="0.7" />
      </>
    )
  }

  if (slot === 'bottom') {
    return (
      <>
        <path d="M22 14 H42 V30 L48 54 H36 L32 36 L28 54 H16 L22 30 Z" fill={fill} />
        <rect x="28" y="14" width="8" height="10" fill={accent} opacity="0.55" />
      </>
    )
  }

  if (slot === 'shoes') {
    return (
      <>
        <path d="M12 36 H28 V48 H10 Q8 42 12 36 Z" fill={fill} />
        <path d="M36 36 H52 Q56 42 54 48 H36 Z" fill={fill} />
        <rect x="14" y="34" width="12" height="4" fill={accent} />
        <rect x="38" y="34" width="12" height="4" fill={accent} />
      </>
    )
  }

  if (slot === 'hand') {
    if (family === 'hand-none' || id === 'hand-none') {
      return <circle cx="32" cy="32" r="10" fill={fill} opacity="0.45" />
    }
    if (family === 'hand-fan' || id.includes('fan')) {
      return (
        <>
          <path d="M32 48 L14 24 Q32 12 50 24 Z" fill={fill} />
          <path d="M32 48 L20 28 Q32 20 44 28 Z" fill={accent} opacity="0.55" />
          <line x1="32" y1="48" x2="32" y2="22" stroke={accent} strokeWidth="3" />
          <line x1="32" y1="46" x2="22" y2="28" stroke={accent} strokeWidth="1.2" opacity="0.7" />
          <line x1="32" y1="46" x2="42" y2="28" stroke={accent} strokeWidth="1.2" opacity="0.7" />
        </>
      )
    }
    if (family === 'hand-lantern' || id.includes('lantern')) {
      return (
        <>
          <rect x="22" y="22" width="20" height="24" rx="3" fill={fill} />
          <rect x="26" y="16" width="12" height="8" rx="2" fill={accent} />
          <rect x="20" y="22" width="24" height="3" fill={accent} opacity="0.7" />
          <rect x="20" y="43" width="24" height="3" fill={accent} opacity="0.7" />
          <rect x="28" y="28" width="8" height="10" rx="1" fill={accent} opacity="0.8" />
        </>
      )
    }
    if (family === 'hand-oar' || id.includes('oar')) {
      return (
        <>
          <rect x="28" y="10" width="6" height="36" rx="2" fill={fill} transform="rotate(25 32 32)" />
          <rect x="29" y="14" width="4" height="8" fill={accent} transform="rotate(25 32 32)" opacity="0.7" />
          <ellipse cx="42" cy="14" rx="10" ry="6" fill={accent} transform="rotate(25 42 14)" />
          <line x1="36" y1="12" x2="48" y2="16" stroke={fill} strokeWidth="1.5" opacity="0.6" />
        </>
      )
    }
    // scroll
    return (
      <>
        <rect x="16" y="26" width="32" height="12" rx="6" fill={fill} />
        <rect x="14" y="24" width="6" height="16" rx="3" fill={accent} />
        <rect x="44" y="24" width="6" height="16" rx="3" fill={accent} />
        <rect x="28" y="28" width="8" height="8" rx="1" fill={accent} />
      </>
    )
  }

  if (slot === 'boat') {
    const tall = family.includes('pearl') || family.includes('imperial') || family.includes('junk')
    return (
      <>
        <path d="M8 40 Q32 52 56 40 L50 34 H14 Z" fill={fill} />
        {/* Hull plank seams — bag icons need value breakup too */}
        <path d="M14 38 Q32 46 50 38" fill="none" stroke={accent} strokeWidth="1.2" opacity="0.45" />
        <path d="M16 36 Q32 42 48 36" fill="none" stroke={accent} strokeWidth="1" opacity="0.35" />
        <rect x="28" y={tall ? 14 : 20} width="4" height={tall ? 22 : 16} fill={accent} />
        <rect x="26" y={tall ? 18 : 24} width="8" height="2" rx="1" fill={fill} opacity="0.7" />
        <path
          d={tall ? 'M30 16 L48 24 L30 28 Z' : 'M30 22 L44 28 L30 32 Z'}
          fill={accent}
          opacity="0.9"
        />
        <line
          x1="32"
          y1={tall ? 18 : 24}
          x2="32"
          y2={tall ? 34 : 36}
          stroke={fill}
          strokeWidth="1"
          opacity="0.5"
        />
        {family.includes('dragon') || family.includes('imperial') ? (
          <path d="M50 34 L58 28 L54 36 Z" fill={accent} />
        ) : null}
        {family.includes('bamboo') ? (
          <>
            <rect x="18" y="36" width="3" height="8" fill={accent} />
            <rect x="28" y="36" width="3" height="8" fill={accent} />
            <rect x="38" y="36" width="3" height="8" fill={accent} />
          </>
        ) : null}
        {family.includes('junk') ? (
          <>
            <rect x="16" y="24" width="14" height="10" rx="1" fill={fill} />
            <rect x="18" y="26" width="4" height="4" fill={accent} opacity="0.7" />
          </>
        ) : null}
        {/* Gunwale highlight */}
        <path d="M12 36 Q32 32 52 36" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.55" />
      </>
    )
  }

  // lantern
  if (family.includes('silk')) {
    return (
      <>
        <rect x="22" y="14" width="20" height="6" rx="2" fill={accent} />
        <rect x="20" y="20" width="24" height="28" rx="10" fill={fill} />
        <rect x="28" y="48" width="8" height="6" fill={accent} />
      </>
    )
  }
  if (family.includes('glass')) {
    return (
      <>
        <polygon points="32,12 48,32 32,52 16,32" fill={fill} />
        <polygon points="32,20 40,32 32,44 24,32" fill={accent} opacity="0.75" />
      </>
    )
  }
  if (family.includes('iron')) {
    return (
      <>
        <rect x="20" y="18" width="24" height="28" rx="2" fill={fill} />
        <rect x="24" y="22" width="16" height="20" fill={accent} opacity="0.55" />
        <line x1="28" y1="18" x2="28" y2="46" stroke={accent} strokeWidth="2" />
        <line x1="36" y1="18" x2="36" y2="46" stroke={accent} strokeWidth="2" />
      </>
    )
  }
  // paper box
  return (
    <>
      <rect x="18" y="16" width="28" height="30" rx="3" fill={fill} />
      <rect x="24" y="12" width="16" height="6" rx="2" fill={accent} />
      <rect x="26" y="46" width="12" height="6" fill={accent} />
    </>
  )
}
