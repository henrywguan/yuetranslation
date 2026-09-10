import { useEffect, useId, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BiText } from './BiText'
import { isTextOnlyLang, textOnlyLangLabel } from '../lib/langCapabilities'
import { inkEase } from '../lib/motion'
import { useYueStore } from '../lib/store'
import { biPlain, ui } from '../lib/uiCopy'
import type { TextOnlyLang } from '../lib/types'
import './TextOnlyLangTip.css'

const STORAGE_KEY = 'yue.textOnlyLangTip.dismissed'

function readDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((x): x is string => typeof x === 'string'))
  } catch {
    return new Set()
  }
}

function writeDismissed(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
  } catch {
    /* ignore */
  }
}

/**
 * Soft dismissible notice for text-only languages (no mic/TTS).
 * Per-language dismiss persists in localStorage.
 */
export function TextOnlyLangNotice({ langs }: { langs: TextOnlyLang[] }) {
  const titleId = useId()
  const [dismissed, setDismissed] = useState<Set<string>>(() => readDismissed())

  useEffect(() => {
    setDismissed(readDismissed())
  }, [])

  const showLang = langs.find((lang) => !dismissed.has(lang)) ?? null

  const dismiss = (lang: TextOnlyLang) => {
    setDismissed((prev) => {
      const next = new Set(prev)
      next.add(lang)
      writeDismissed(next)
      return next
    })
  }

  return (
    <AnimatePresence>
      {showLang ? (
        <motion.div
          key={showLang}
          className="text-only-lang-tip"
          role="status"
          aria-labelledby={titleId}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.28, ease: inkEase }}
        >
          <p className="text-only-lang-tip-copy" id={titleId}>
            <span className="text-only-lang-tip-name">{textOnlyLangLabel(showLang)}</span>
            {' · '}
            <BiText copy={ui.textOnlyLangTip} size="sm" hideJp />
          </p>
          <button
            type="button"
            className="text-only-lang-tip-close"
            aria-label={biPlain(ui.textOnlyLangTipClose)}
            onClick={() => dismiss(showLang)}
          >
            ×
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

/** Solo: show when either pane is Cebuano / Ilocano. */
export function SoloTextOnlyLangTip() {
  const upper = useYueStore((s) => s.soloUpperLang)
  const lower = useYueStore((s) => s.soloLowerLang)
  const langs: TextOnlyLang[] = []
  if (isTextOnlyLang(upper)) langs.push(upper)
  if (isTextOnlyLang(lower) && lower !== upper) langs.push(lower)
  return <TextOnlyLangNotice langs={langs} />
}

/** Cam: show when translate target is text-only. */
export function CamTextOnlyLangTip({ target }: { target: string }) {
  const langs: TextOnlyLang[] = isTextOnlyLang(target) ? [target] : []
  return <TextOnlyLangNotice langs={langs} />
}
