import { useState } from 'react'
import { copyableText } from '../lib/copyText'
import { biPlain, ui } from '../lib/uiCopy'
import type { Lang } from '../lib/types'

/** Copies script-pure result text (Han for 粵, Latin for English). */
export function CopyButton({
  text,
  lang,
  className = '',
}: {
  text: string
  lang: Lang
  className?: string
}) {
  const trimmed = text.trim()
  const [copied, setCopied] = useState(false)

  if (!trimmed) return null

  const payload = copyableText(trimmed, lang)
  if (!payload) return null

  const label = copied ? ui.copied : ui.copyText

  return (
    <button
      type="button"
      className={`copy-btn${copied ? ' is-copied' : ''} ${className}`.trim()}
      aria-label={biPlain(label)}
      title={biPlain(label)}
      onClick={(e) => {
        e.stopPropagation()
        void (async () => {
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
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1500)
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
            <path
              d="M8.25 4.5h7.5A2.25 2.25 0 0 1 18 6.75v9A2.25 2.25 0 0 1 15.75 18h-7.5A2.25 2.25 0 0 1 6 15.75v-9A2.25 2.25 0 0 1 8.25 4.5Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <path
              d="M9.75 6H15a2.25 2.25 0 0 1 2.25 2.25V15"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>
    </button>
  )
}
