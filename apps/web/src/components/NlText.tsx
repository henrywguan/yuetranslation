import type { ReactNode } from 'react'
import {
  DUTCH_HONESTY_NOTE,
  detectDutchAddress,
  dutchAddressChip,
  dutchAddressLabel,
} from '../lib/dutchPedagogy'

/**
 * Netherlands Dutch line for Solo / Conversation / Cam.
 * Compact: Dutch orthography only (`lang="nl-NL"`) — no IPA, Chao, or register chips.
 * Details (`showDetail`) add a je/u chip when detectable plus a short honesty note.
 */
export function NlText({
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

  const address = showDetail ? detectDutchAddress(trimmed) : null

  const body = (
    <span className={`dutch-block${showDetail ? ' dutch-block--detail' : ''}`}>
      <span className={className || undefined} lang="nl-NL">
        {trimmed}
      </span>
      {address ? (
        <span className="dutch-address-row" aria-label="Address form">
          <span className="dutch-address-scheme" aria-hidden="true">
            Address
          </span>
          <span
            className={`dutch-address-chip dutch-address-chip--${address}`}
            title={dutchAddressLabel(address)}
            aria-label={dutchAddressLabel(address)}
          >
            {dutchAddressChip(address)}
          </span>
        </span>
      ) : null}
      {showDetail ? <span className="dutch-honesty">{DUTCH_HONESTY_NOTE}</span> : null}
    </span>
  )

  if (!onActivate) return body

  return (
    <button
      type="button"
      className="dutch-activate"
      onClick={() => onActivate(trimmed)}
      aria-label={activateLabel || `${trimmed}. Open details.`}
    >
      {body}
    </button>
  )
}
