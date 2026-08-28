import { RoleBadge } from './RoleBadge'

/** @deprecated Use RoleBadge — kept for imports that expect AdminPlanBadge. */
export function AdminPlanBadge({
  className = '',
  plan,
  onClick,
}: {
  className?: string
  plan?: 'free' | 'pro' | 'max'
  onClick?: () => void
}) {
  return (
    <RoleBadge
      role="admin"
      className={className}
      onClick={onClick}
      subtitle={plan}
    />
  )
}

export { RoleBadge } from './RoleBadge'
