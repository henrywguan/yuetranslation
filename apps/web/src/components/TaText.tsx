import type { ReactNode } from 'react'
import { romanizeTamilIso15919 } from '../lib/tamilIso15919'
import {
  TAMIL_HONESTY_NOTE,
  detectTamilAddress,
  tamilAddressChip,
  tamilAddressLabel,
} from '../lib/tamilPedagogy'

/**
 * Tamil line for Solo / Conversation / Cam.
 * Compact: Tamil script only (no ISO 15919 / Tanglish Latin dump on every line).
 * Details (`showDetail`): optional ISO 15919 reading + நீங்கள் / நீ chip + honesty.
 * Not tonal — no Chao tone letters, no Cantonese ASCII tones.
 */
export function TaText({
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
  /** Details pane: ISO 15919 + address + honesty (compact stays Tamil-script-only). */
  showDetail?: boolean
}) {
  const trimmed = text.trim()
  if (!trimmed) return placeholder ? <>{placeholder}</> : null

  const reading = showDetail ? romanizeTamilIso15919(trimmed) : null
  const address = showDetail ? detectTamilAddress(trimmed) : null

  const body = (
    <span className={`tamil-block${showDetail ? ' tamil-block--detail' : ''}`}>
      <span className={className || undefined} lang="ta-IN">
        {trimmed}
      </span>
      {reading ? (
        <span className="tamil-reading-row" aria-label="ISO 15919 romanization">
          <span className="tamil-reading" lang="ta-Latn">
            {reading}
          </span>
          <span className="tamil-reading-label" aria-hidden="true">
            ISO 15919
          </span>
        </span>
      ) : null}
      {address ? (
        <span className="tamil-address-row" aria-label="Address form">
          <span className="tamil-address-scheme" aria-hidden="true">
            Form
          </span>
          <span
            className={`tamil-address-chip tamil-address-chip--${address}`}
            title={tamilAddressLabel(address)}
          >
            {tamilAddressChip(address)}
          </span>
        </span>
      ) : null}
      {showDetail ? <span className="tamil-honesty">{TAMIL_HONESTY_NOTE}</span> : null}
    </span>
  )

  if (!onActivate) return body

  return (
    <button
      type="button"
      className="tamil-activate"
      onClick={() => onActivate(trimmed)}
      aria-label={
        activateLabel ||
        (reading ? `${trimmed}. ${reading}. Open details.` : `${trimmed}. Open details.`)
      }
    >
      {body}
    </button>
  )
}
