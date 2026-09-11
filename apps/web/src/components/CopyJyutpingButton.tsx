import { useState } from 'react'
import { openUpgrade } from '../lib/billing'
import { hasHan } from '../lib/jyutping'
import { copyableJyutpingChao } from '../lib/copyText'
import { useYueStore } from '../lib/store'
import { biPlain, ui } from '../lib/uiCopy'

async function writeClipboard(payload: string) {
  try {
    await navigator.clipboard.writeText(payload)
  } catch {
    const area = document.createElement('textarea')
    area.value = payload
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.left = '-9999px'
    document.body.appendChild(area)
    area.select()
    document.execCommand('copy')
    document.body.removeChild(area)
  }
}

function canCopyJyutping(plan: string | undefined): boolean {
  // Family+ — Business includes everything in Family (same as auto-speak).
  return plan === 'family' || plan === 'business'
}

/**
 * Copies Jyutping + Chao tone letters for Cantonese creators
 * (e.g. `teng1˥ m4˨˩ teng1˥ dou3˧`). Distinct icon from Han CopyButton.
 * Locked to Family/Business — tap opens upgrade when on Free/guest.
 */
export function CopyJyutpingButton({
  text,
  className = '',
}: {
  text: string
  className?: string
}) {
  const trimmed = text.trim()
  const entitlement = useYueStore((s) => s.entitlement)
  const unlocked = !entitlement || canCopyJyutping(entitlement.plan)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!trimmed || !hasHan(trimmed)) return null

  const label = !unlocked
    ? ui.copyJyutpingFamily
    : copied
      ? ui.copiedJyutping
      : ui.copyJyutping

  return (
    <button
      type="button"
      className={`copy-btn copy-btn--jyutping${copied ? ' is-copied' : ''}${busy ? ' is-busy' : ''}${!unlocked ? ' is-locked' : ''} ${className}`.trim()}
      aria-label={biPlain(label)}
      title={biPlain(label)}
      disabled={busy}
      onClick={(e) => {
        e.stopPropagation()
        if (!unlocked) {
          void openUpgrade('family')
          return
        }
        if (busy) return
        void (async () => {
          setBusy(true)
          try {
            const payload = await copyableJyutpingChao(trimmed)
            if (!payload) return
            await writeClipboard(payload)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1500)
          } finally {
            setBusy(false)
          }
        })()
      }}
    >
      <svg className="copy-btn-icon" viewBox="0 0 24 24" aria-hidden="true">
        {copied ? (
          <path
            d="M9.5 16.2 5.8 12.5l1.4-1.4 2.3 2.3 6.5-6.5 1.4 1.4-7.9 7.9Z"
            fill="currentColor"
          />
        ) : (
          <>
            {/* Single page + phonetic underline — distinct from dual-rect Han copy */}
            <path
              d="M7 4.5h7.2L18 8.3V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V6A1.5 1.5 0 0 1 7.5 4.5H7Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <path
              d="M14 4.6V8h3.4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            {/* Tone / romanization strokes */}
            <path
              d="M9 12.2h6.2M9 15h4.6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
            <path
              d="M9.2 18.2c1.1-.9 2.4-.9 3.5 0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>
    </button>
  )
}
