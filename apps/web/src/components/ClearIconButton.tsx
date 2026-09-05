import { biPlain, ui } from '../lib/uiCopy'

/** Grey circle X — clears the current Solo / Conversation turn. */
export function ClearIconButton({
  onClick,
  className = '',
  disabled = false,
}: {
  onClick: () => void
  className?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      className={`clear-icon-btn ${className}`.trim()}
      aria-label={biPlain(ui.clear)}
      title={biPlain(ui.clear)}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <svg className="clear-icon-btn-svg" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M7.2 7.2 16.8 16.8M16.8 7.2 7.2 16.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  )
}
