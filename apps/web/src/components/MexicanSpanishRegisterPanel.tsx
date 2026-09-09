import { useState } from 'react'
import { isInformalMexicanSpanish } from '../lib/mexicanSpanishPedagogy'
import { useYueStore } from '../lib/store'
import { biPlain, ui } from '../lib/uiCopy'
import type { Lang } from '../lib/types'
import { BiText } from './BiText'

/**
 * Details-only: note when the Mexican Spanish line is informal + icon to formalize.
 * Rewrites the Spanish line in place (es→es formal); optional source is a fallback.
 */
export function MexicanSpanishRegisterPanel({
  text,
  sourceText,
  sourceLang = 'en',
}: {
  text: string
  /** Paired utterance (usually English) — fallback if rewrite fails. */
  sourceText?: string
  sourceLang?: Lang
}) {
  const formalize = useYueStore((s) => s.formalizeMexicanSpanish)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const trimmed = text.trim()
  const informal = isInformalMexicanSpanish(trimmed)

  if (!trimmed || !informal) return null

  return (
    <section className="mx-register" aria-label={biPlain(ui.mxInformalNote)}>
      <div className="mx-register-row">
        <p className="mx-register-note">
          <BiText copy={ui.mxInformalNote} size="sm" hideJp />
        </p>
        <button
          type="button"
          className="mx-formalize-btn"
          disabled={busy}
          aria-label={biPlain(ui.mxFormalize)}
          title={biPlain(ui.mxFormalize)}
          onClick={() => {
            if (busy) return
            setErr(null)
            setBusy(true)
            void formalize({
              spanish: trimmed,
              sourceText: sourceText?.trim() || '',
              sourceLang,
            })
              .catch((e: unknown) => {
                setErr(e instanceof Error ? e.message : 'Formalize failed')
              })
              .finally(() => setBusy(false))
          }}
        >
          {busy ? (
            <span className="mx-formalize-busy" aria-hidden="true" />
          ) : (
            <svg className="mx-formalize-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M7 17V9.5M7 9.5 4.5 12M7 9.5 9.5 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.85"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12.5 16.5h6.2c.7 0 1.3-.6 1.3-1.3v-6.4c0-.7-.6-1.3-1.3-1.3H14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.85"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M13.8 12.2 15.6 14l3.2-3.6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.85"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>
      {err ? <p className="mx-register-error muted">{err}</p> : null}
    </section>
  )
}
