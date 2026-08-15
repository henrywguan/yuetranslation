import { useId } from 'react'

type JyutLogoProps = {
  /** Full JyutTranslate wordmark, or the J+粵 monogram alone. */
  variant?: 'lockup' | 'mark'
  className?: string
  title?: string
}

/**
 * JyutTranslate lockup: Syne “JyutTranslate” with 粵 seated in the J.
 * 粵 is the character whose Jyutping is “jyut” — one name, two scripts.
 */
export function JyutLogo({
  variant = 'lockup',
  className = '',
  title = 'JyutTranslate',
}: JyutLogoProps) {
  const rawId = useId().replace(/:/g, '')
  const jadeId = `jyut-jade-${rawId}`
  const shineId = `jyut-shine-${rawId}`

  if (variant === 'mark') {
    return (
      <svg
        className={`jyut-logo jyut-logo--mark ${className}`.trim()}
        viewBox="0 0 64 64"
        role="img"
        aria-label={title}
      >
        <title>{title}</title>
        <defs>
          <linearGradient id={jadeId} x1="12" y1="8" x2="56" y2="58" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--jade-bright)" />
            <stop offset="0.45" stopColor="var(--jade)" />
            <stop offset="1" stopColor="var(--jade-deep)" />
          </linearGradient>
          <radialGradient id={shineId} cx="32%" cy="26%" r="70%">
            <stop stopColor="rgba(255,255,255,0.42)" />
            <stop offset="1" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
        <rect width="64" height="64" rx="18" fill={`url(#${jadeId})`} />
        <rect width="64" height="64" rx="18" fill={`url(#${shineId})`} />
        <text className="jyut-logo-mark-j" x="10" y="50" fontSize="46">
          J
        </text>
        <text
          className="jyut-logo-yue jyut-logo-yue--on-jade"
          x="38"
          y="41"
          textAnchor="middle"
          fontSize="18"
        >
          粵
        </text>
      </svg>
    )
  }

  return (
    <svg
      className={`jyut-logo jyut-logo--lockup ${className}`.trim()}
      viewBox="0 0 340 56"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={jadeId} x1="8" y1="6" x2="40" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--jade-bright)" />
          <stop offset="0.5" stopColor="var(--jade)" />
          <stop offset="1" stopColor="var(--jade-deep)" />
        </linearGradient>
      </defs>
      <text className="jyut-logo-latin" x="0" y="42" fontSize="36">
        J
      </text>
      <text
        className="jyut-logo-yue"
        x="14"
        y="30"
        textAnchor="middle"
        fontSize="14"
        fill={`url(#${jadeId})`}
      >
        粵
      </text>
      <text className="jyut-logo-latin" x="28" y="42" fontSize="36">
        yutTranslate
      </text>
    </svg>
  )
}
