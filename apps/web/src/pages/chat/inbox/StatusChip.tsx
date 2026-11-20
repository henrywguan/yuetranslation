import { isIdleStatus, statusChipLabel } from '../../../lib/chatInbox'

/** Compact status affordance: colored dot + short label. Idle hides at all densities until hover/focus. */
export function StatusChip({ status }: { status: string }) {
  const label = statusChipLabel(status)
  const idle = isIdleStatus(status)
  return (
    <span
      className={`inbox-agent-status is-${status}${idle ? ' is-idle' : ''}`}
      title={label}
      aria-label={label}
    >
      <span className="inbox-agent-status-dot" aria-hidden />
      <span className="inbox-agent-status-label">{label}</span>
    </span>
  )
}
