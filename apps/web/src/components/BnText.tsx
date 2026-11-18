import type { ReactNode } from 'react'
import { romanizeBengaliIso15919 } from '../lib/bengaliIso15919'
import {
  BENGALI_HONESTY_NOTE,
  detectBengaliAddress,
  bengaliAddressChip,
  bengaliAddressLabel,
} from '../lib/bengaliPedagogy'

/**
 * Bengali line for Solo / Conversation / Cam.
 * Compact: Bangla script only (no ISO 15919 / Banglish Latin dump on every line).
 * Details (`showDetail`): optional ISO 15919 reading + আপনি / তুমি / তুই chip + honesty.
 * Not tonal — no Chao tone letters, no Cantonese ASCII tones.
 */
export function BnText({
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
  /** Details pane: ISO 15919 + address + honesty (compact stays Bangla-script-only). */
  showDetail?: boolean
}) {
  const trimmed = text.trim()
  if (!trimmed) return placeholder ? <>{placeholder}</> : null

  const reading = showDetail ? romanizeBengaliIso15919(trimmed) : null
  const address = showDetail ? detectBengaliAddress(trimmed) : null

  const body = (
    <span className={`bengali-block${showDetail ? ' bengali-block--detail' : ''}`}>
      <span className={className || undefined} lang="bn-IN">
        {trimmed}
      </span>
      {reading ? (
        <span className="bengali-reading-row" aria-label="ISO 15919 romanization">
          <span className="bengali-reading" lang="bn-Latn">
            {reading}
          </span>
          <span className="bengali-reading-label" aria-hidden="true">
            ISO 15919
          </span>
        </span>
      ) : null}
      {address ? (
        <span className="bengali-address-row" aria-label="Address form">
          <span className="bengali-address-scheme" aria-hidden="true">
            Form
          </span>
          <span
            className={`bengali-address-chip bengali-address-chip--${address}`}
            title={bengaliAddressLabel(address)}
          >
            {bengaliAddressChip(address)}
          </span>
        </span>
      ) : null}
      {showDetail ? <span className="bengali-honesty">{BENGALI_HONESTY_NOTE}</span> : null}
    </span>
  )

  if (!onActivate) return body

  return (
    <button
      type="button"
      className="bengali-activate"
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
