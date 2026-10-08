import { useState } from 'react'
import { biPlain, ui } from '../lib/uiCopy'

async function copyFallback(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.left = '-9999px'
    document.body.appendChild(area)
    area.select()
    document.execCommand('copy')
    document.body.removeChild(area)
  }
}

/** Share a translation line via Web Share, falling back to the clipboard. */
export function ShareButton({
  text,
  title = 'JyutTranslate',
  className = '',
}: {
  text: string
  title?: string
  className?: string
}) {
  const payload = text.trim()
  const [copied, setCopied] = useState(false)

  if (!payload) return null

  const label = copied ? ui.shareCopied : ui.share

  return (
    <button
      type="button"
      className={`copy-btn share-btn${copied ? ' is-copied' : ''} ${className}`.trim()}
      aria-label={biPlain(label)}
      title={biPlain(label)}
      onClick={(e) => {
        e.stopPropagation()
        void (async () => {
          if (typeof navigator.share === 'function') {
            try {
              await navigator.share({ title, text: payload })
              return
            } catch (err) {
              // User dismissed the sheet — do not fall through to a silent copy.
              if (err instanceof DOMException && err.name === 'AbortError') return
            }
          }
          await copyFallback(payload)
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1500)
        })()
      }}
    >
      <svg className="copy-btn-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 15.2V4.6M12 4.6 8.4 8.2M12 4.6l3.6 3.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6 11.5v6.2c0 .9.7 1.6 1.6 1.6h8.8c.9 0 1.6-.7 1.6-1.6v-6.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
