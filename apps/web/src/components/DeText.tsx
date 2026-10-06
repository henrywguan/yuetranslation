import type { ReactNode } from 'react'
import {
  GERMAN_HONESTY_NOTE,
  detectGermanAddress,
  germanAddressChip,
  germanAddressLabel,
} from '../lib/germanPedagogy'

/**
 * Standard German (Deutschland / de-DE) line for Solo / Conversation / Cam.
 * Compact: German orthography only (`lang="de-DE"`) — no IPA, Chao, or register chips.
 * Details (`showDetail`) add a du/Sie chip when detectable plus a short honesty note.
 */
export function DeText({
  text,
  className,
  placeholder,
  onActivate,
  activateLabel,
  showDetail = false,
}: {
  text: string
  definition?: string
  definitions?: string[]
  className?: string
  placeholder?: ReactNode
  onActivate?: (text: string) => void
  activateLabel?: string
  /** Compact panes: false. Details can opt in. */
  showDetail?: boolean
}) {
  const trimmed = text.trim()
  if (!trimmed) return placeholder ? <>{placeholder}</> : null

  const address = showDetail ? detectGermanAddress(trimmed) : null

  const body = (
    <span className={`german-block${showDetail ? ' german-block--detail' : ''}`}>
      <span className={className || undefined} lang="de-DE">
        {trimmed}
      </span>
      {address ? (
        <span className="german-address-row" aria-label="Address form">
          <span className="german-address-scheme" aria-hidden="true">
            Address
          </span>
          <span
            className={`german-address-chip german-address-chip--${address}`}
            title={germanAddressLabel(address)}
            aria-label={germanAddressLabel(address)}
          >
            {germanAddressChip(address)}
          </span>
        </span>
      ) : null}
      {showDetail ? <span className="german-honesty">{GERMAN_HONESTY_NOTE}</span> : null}
    </span>
  )

  if (!onActivate) return body

  return (
    <button
      type="button"
      className="german-activate"
      onClick={() => onActivate(trimmed)}
      aria-label={activateLabel || `${trimmed}. Open details.`}
    >
      {body}
    </button>
  )
}
