import type { UserRole } from '../lib/userRoles'

type Props = {
  role: UserRole
  className?: string
  onClick?: () => void
  /** Shown under the badge (e.g. current plan in admin table). */
  subtitle?: string
}

function CrownIcon({ shiny }: { shiny?: boolean }) {
  return (
    <span className="role-badge-crown" aria-hidden="true">
      <svg className="role-badge-crown-svg" viewBox="0 0 24 16" width="14" height="10">
        <path
          d="M2 13.5 4.2 5.2 8.1 9.4 12 2.5l3.9 6.9 3.9-4.2 2.2 8.3Z"
          fill="currentColor"
        />
        <path d="M2 13.5h20v1.8H2z" fill="currentColor" opacity="0.9" />
        <circle cx="4.2" cy="5" r="1.15" fill="currentColor" />
        <circle cx="12" cy="2.4" r="1.25" fill="currentColor" />
        <circle cx="19.8" cy="5" r="1.15" fill="currentColor" />
      </svg>
      <span className={`role-badge-star role-badge-star--a${shiny ? ' role-badge-star--gold' : ''}`} />
      <span className={`role-badge-star role-badge-star--b${shiny ? ' role-badge-star--gold' : ''}`} />
      <span className={`role-badge-star role-badge-star--c${shiny ? ' role-badge-star--gold' : ''}`} />
    </span>
  )
}

/**
 * Neo-brutalist role badge — admin (jade) or 家 family (gold), crown + twinkling stars.
 */
export function RoleBadge({ role, className = '', onClick, subtitle }: Props) {
  const label = role === 'admin' ? 'admin' : '家'
  const variant = role === 'admin' ? 'admin' : 'family'
  const title = onClick ? `${label} role — click to change` : `${label} role`

  const face = (
    <span className="role-badge-face">
      <span className="role-badge-label">
        <CrownIcon shiny={role === 'family'} />
        <span className="role-badge-word">{label}</span>
      </span>
    </span>
  )

  const badge = onClick ? (
    <button
      type="button"
      className={`role-badge role-badge--${variant} role-badge--btn ${className}`.trim()}
      title={title}
      aria-label={title}
      onClick={onClick}
    >
      {face}
    </button>
  ) : (
    <span
      className={`role-badge role-badge--${variant} ${className}`.trim()}
      title={title}
    >
      {face}
    </span>
  )

  return (
    <span className="role-badge-wrap">
      {badge}
      {subtitle ? <span className="role-badge-sub">{subtitle}</span> : null}
    </span>
  )
}
