import type { HarborBaitId, HarborFishId, HarborFishMethod, HarborFishToolId } from './harborFishing'

type Kind = 'fish' | 'tool' | 'bait'

type Props = {
  kind: Kind
  id: HarborFishId | HarborFishToolId | HarborBaitId | string
  /** Optional method hint for fish / tools (drives silhouette family). */
  method?: HarborFishMethod
  /** Dim locked / unknown entries in the collection log. */
  locked?: boolean
  className?: string
}

const FISH_COLORS: Record<string, { fill: string; accent: string }> = {
  'fish-shrimp': { fill: '#f0a878', accent: '#ffe0c0' },
  'fish-anchovy': { fill: '#b8c8d8', accent: '#e8f0f8' },
  'fish-sardine': { fill: '#d4a060', accent: '#f0d898' },
  'fish-herring': { fill: '#5aaa78', accent: '#a8e0b8' },
  'fish-trout': { fill: '#c87858', accent: '#f0b898' },
  'fish-salmon': { fill: '#e07060', accent: '#f8c0b0' },
  'fish-jade-carp': { fill: '#3dcfb6', accent: '#a8fff0' },
  'fish-reed-perch': { fill: '#7aaa50', accent: '#c8e888' },
  'fish-wreck-bass': { fill: '#4a6888', accent: '#98b8d8' },
  'fish-tuna': { fill: '#3a78c8', accent: '#90c0f0' },
  'fish-lobster': { fill: '#d04040', accent: '#f09070' },
  'fish-oyster': { fill: '#c8b090', accent: '#f0e8d0' },
  'fish-mist-eel': { fill: '#687898', accent: '#b0c0d8' },
  'fish-ash-crab': { fill: '#c06040', accent: '#e8a070' },
  'fish-swordfish': { fill: '#7088a8', accent: '#d0e0f0' },
  'fish-shark': { fill: '#4a5868', accent: '#98a8b8' },
}

const TOOL_COLORS: Record<string, { fill: string; accent: string }> = {
  'tool-net': { fill: '#c4a060', accent: '#e8d8a0' },
  'tool-rod': { fill: '#3dcfb6', accent: '#a8fff0' },
  'tool-fly': { fill: '#d8a0c8', accent: '#f0d0e8' },
  'tool-cage': { fill: '#a88850', accent: '#e0c880' },
  'tool-harpoon': { fill: '#8898a8', accent: '#d0dce8' },
  'tool-heavy-cage': { fill: '#708090', accent: '#b0c0d0' },
}

const BAIT_COLORS: Record<string, { fill: string; accent: string }> = {
  'bait-none': { fill: '#4a5860', accent: '#788890' },
  'bait-rice': { fill: '#e8d8b0', accent: '#fff8e0' },
  'bait-feather': { fill: '#90c878', accent: '#d0f0b0' },
  'bait-worm': { fill: '#a06048', accent: '#d09878' },
  'bait-paste': { fill: '#e87860', accent: '#f0b0a0' },
}

/**
 * Low-poly SVG “model card” for fishing tools, bait, and fish — same role as
 * HarborGearModelIcon so lodge / cast / log UIs show shapes, not only names.
 */
export function HarborFishModelIcon({ kind, id, method, locked = false, className }: Props) {
  const palette =
    kind === 'fish'
      ? FISH_COLORS[id] ?? { fill: '#6a9aaa', accent: '#b0d8e0' }
      : kind === 'tool'
        ? TOOL_COLORS[id] ?? { fill: '#8a9a88', accent: '#c0d0b8' }
        : BAIT_COLORS[id] ?? { fill: '#9a8870', accent: '#d0c0a0' }
  const fill = locked ? '#3a4850' : palette.fill
  const accent = locked ? '#5a6870' : palette.accent

  return (
    <span
      className={`hq-fish-model${className ? ` ${className}` : ''}${locked ? ' is-locked' : ''}`}
      aria-hidden="true"
      data-kind={kind}
      data-id={id}
    >
      <svg viewBox="0 0 64 64" width="64" height="64" className="hq-fish-model-svg">
        <rect width="64" height="64" rx="8" fill="rgba(4,16,24,0.55)" />
        {kind === 'fish'
          ? drawFish(id, method, fill, accent)
          : kind === 'tool'
            ? drawTool(id, method, fill, accent)
            : drawBait(id, fill, accent)}
      </svg>
    </span>
  )
}

function drawFish(id: string, method: HarborFishMethod | undefined, fill: string, accent: string) {
  if (id.includes('shrimp') || id.includes('lobster') || id.includes('crab')) {
    return (
      <>
        <ellipse cx="30" cy="34" rx="14" ry="10" fill={fill} />
        <path d="M42 30 L54 24 L50 34 L54 44 L42 38 Z" fill={accent} />
        <circle cx="24" cy="30" r="2" fill="#1a1010" />
        <path d="M18 28 Q10 22 14 18" fill="none" stroke={accent} strokeWidth="2.5" />
        <path d="M18 40 Q10 46 14 50" fill="none" stroke={accent} strokeWidth="2.5" />
        {id.includes('lobster') || id.includes('crab') ? (
          <>
            <path d="M20 26 L12 16 L18 20" fill="none" stroke={accent} strokeWidth="2.2" />
            <path d="M20 42 L12 52 L18 48" fill="none" stroke={accent} strokeWidth="2.2" />
          </>
        ) : null}
      </>
    )
  }
  if (id.includes('oyster')) {
    return (
      <>
        <ellipse cx="32" cy="36" rx="18" ry="12" fill={fill} />
        <ellipse cx="32" cy="34" rx="12" ry="7" fill={accent} opacity="0.7" />
        <circle cx="32" cy="34" r="4" fill="#e8f8ff" opacity="0.9" />
      </>
    )
  }
  if (id.includes('eel')) {
    return (
      <>
        <path
          d="M12 40 Q20 18 32 28 Q44 38 52 22"
          fill="none"
          stroke={fill}
          strokeWidth="8"
          strokeLinecap="round"
        />
        <circle cx="50" cy="22" r="3" fill={accent} />
        <circle cx="52" cy="20" r="1.2" fill="#1a1010" />
      </>
    )
  }
  if (id.includes('swordfish') || id.includes('shark') || method === 'harpoon') {
    return (
      <>
        <ellipse cx="34" cy="34" rx="16" ry="9" fill={fill} />
        <path d="M18 34 L6 28 L10 34 L6 40 Z" fill={accent} />
        <path d="M50 34 L60 30 L56 34 L60 38 Z" fill={fill} />
        <path d="M30 26 L36 16 L40 26" fill={accent} />
        <circle cx="42" cy="32" r="1.8" fill="#1a1010" />
        {id.includes('swordfish') ? (
          <path d="M50 34 L62 32" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
        ) : null}
      </>
    )
  }
  // default finned fish
  return (
    <>
      <ellipse cx="34" cy="34" rx="15" ry="10" fill={fill} />
      <path d="M19 34 L8 26 L12 34 L8 42 Z" fill={accent} />
      <path d="M32 25 L38 16 L42 26" fill={accent} opacity="0.85" />
      <path d="M28 40 Q34 48 42 42" fill="none" stroke={accent} strokeWidth="2" />
      <circle cx="42" cy="32" r="1.8" fill="#1a1010" />
      <ellipse cx="36" cy="36" rx="4" ry="2" fill={accent} opacity="0.45" />
    </>
  )
}

function drawTool(id: string, method: HarborFishMethod | undefined, fill: string, accent: string) {
  const m = method ?? (id.includes('net')
    ? 'net'
    : id.includes('harpoon')
      ? 'harpoon'
      : id.includes('cage')
        ? 'cage'
        : id.includes('fly')
          ? 'lure'
          : 'bait')

  if (m === 'net') {
    return (
      <>
        <rect x="28" y="10" width="4" height="28" rx="1" fill={fill} />
        <path d="M16 36 Q32 52 48 36" fill="none" stroke={accent} strokeWidth="2.5" />
        <path d="M20 38 Q32 48 44 38" fill="none" stroke={fill} strokeWidth="1.5" opacity="0.7" />
        <path d="M24 40 Q32 46 40 40" fill="none" stroke={accent} strokeWidth="1.2" opacity="0.6" />
        <line x1="18" y1="36" x2="22" y2="48" stroke={accent} strokeWidth="1.2" />
        <line x1="46" y1="36" x2="42" y2="48" stroke={accent} strokeWidth="1.2" />
      </>
    )
  }
  if (m === 'cage') {
    return (
      <>
        <rect x="16" y="18" width="32" height="28" rx="3" fill="none" stroke={fill} strokeWidth="3" />
        <line x1="24" y1="18" x2="24" y2="46" stroke={accent} strokeWidth="2" />
        <line x1="32" y1="18" x2="32" y2="46" stroke={accent} strokeWidth="2" />
        <line x1="40" y1="18" x2="40" y2="46" stroke={accent} strokeWidth="2" />
        <line x1="16" y1="28" x2="48" y2="28" stroke={accent} strokeWidth="2" />
        <line x1="16" y1="36" x2="48" y2="36" stroke={accent} strokeWidth="2" />
        <rect x="26" y="12" width="12" height="8" rx="1" fill={fill} />
      </>
    )
  }
  if (m === 'harpoon') {
    return (
      <>
        <rect x="29" y="12" width="5" height="36" rx="1.5" fill={fill} transform="rotate(-18 32 32)" />
        <path d="M38 14 L52 8 L48 16 L54 20 Z" fill={accent} />
        <rect x="27" y="42" width="8" height="6" rx="1" fill={accent} transform="rotate(-18 32 32)" />
      </>
    )
  }
  // rod / fly
  return (
    <>
      <rect x="30" y="8" width="3.5" height="40" rx="1.5" fill={fill} transform="rotate(12 32 32)" />
      <path d="M36 14 Q50 20 46 40" fill="none" stroke={accent} strokeWidth="1.5" />
      <circle cx="46" cy="42" r="3" fill={accent} />
      {m === 'lure' ? (
        <path d="M44 40 L50 36 L48 44 Z" fill={fill} />
      ) : (
        <ellipse cx="46" cy="44" rx="5" ry="2.5" fill={fill} opacity="0.7" />
      )}
    </>
  )
}

function drawBait(id: string, fill: string, accent: string) {
  if (id === 'bait-none') {
    return <circle cx="32" cy="32" r="10" fill={fill} opacity="0.45" stroke={accent} strokeWidth="2" strokeDasharray="4 3" />
  }
  if (id.includes('rice')) {
    return (
      <>
        <ellipse cx="32" cy="36" rx="14" ry="10" fill={fill} />
        <ellipse cx="26" cy="32" rx="3" ry="5" fill={accent} transform="rotate(-20 26 32)" />
        <ellipse cx="32" cy="30" rx="3" ry="5" fill={accent} />
        <ellipse cx="38" cy="32" rx="3" ry="5" fill={accent} transform="rotate(18 38 32)" />
        <ellipse cx="30" cy="38" rx="2.5" ry="4" fill={accent} opacity="0.75" />
      </>
    )
  }
  if (id.includes('feather')) {
    return (
      <>
        <path d="M20 44 Q28 12 44 20 Q36 36 28 48 Z" fill={fill} />
        <path d="M24 40 Q30 18 40 24" fill="none" stroke={accent} strokeWidth="2" />
        <line x1="28" y1="36" x2="36" y2="28" stroke={accent} strokeWidth="1.2" opacity="0.7" />
        <line x1="26" y1="42" x2="34" y2="32" stroke={accent} strokeWidth="1.2" opacity="0.55" />
      </>
    )
  }
  if (id.includes('worm')) {
    return (
      <>
        <path
          d="M14 36 Q22 18 32 30 Q42 42 50 24"
          fill="none"
          stroke={fill}
          strokeWidth="7"
          strokeLinecap="round"
        />
        <circle cx="16" cy="34" r="3" fill={accent} />
        <circle cx="48" cy="26" r="2.5" fill={accent} />
      </>
    )
  }
  // paste
  return (
    <>
      <ellipse cx="32" cy="36" rx="16" ry="11" fill={fill} />
      <ellipse cx="32" cy="32" rx="10" ry="6" fill={accent} opacity="0.65" />
      <circle cx="26" cy="34" r="2" fill={fill} />
      <circle cx="34" cy="30" r="2.5" fill={fill} />
      <circle cx="38" cy="36" r="1.8" fill={fill} />
    </>
  )
}
