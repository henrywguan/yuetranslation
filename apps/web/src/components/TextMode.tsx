import { useEffect, useRef, useState } from 'react'
import { BiText } from './BiText'
import { InkSettle } from './InkSettle'
import { PaneParticles } from './PaneParticles'
import { ResultWithDefinition } from './ResultWithDefinition'
import { TranslationAlternatives } from './TranslationAlternatives'
import { useYueStore } from '../lib/store'
import { biPlain, ui } from '../lib/uiCopy'
import type { Lang } from '../lib/types'

const AUTO_TRANSLATE_MS = 450

export function TextMode() {
  const [text, setText] = useState('')
  const [from, setFrom] = useState<Lang>('en')
  const [busy, setBusy] = useState(false)
  const reqId = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const translateTyped = useYueStore((s) => s.translateTyped)
  const openBreakdown = useYueStore((s) => s.openBreakdown)
  const selectYueVariation = useYueStore((s) => s.selectYueVariation)
  const history = useYueStore((s) => s.history)
  const trimmed = text.trim()
  const latest = history[0]
  const match =
    latest && latest.from === from && latest.source === trimmed ? latest : null
  const placeholder = from === 'en' ? ui.typeEnglish : ui.typeCantonese
  const fromRef = useRef(from)
  const translateRef = useRef(translateTyped)
  fromRef.current = from
  translateRef.current = translateTyped

  const runTranslate = (value: string, delay: number) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const next = value.trim()
    if (!next) {
      setBusy(false)
      return
    }
    const id = ++reqId.current
    setBusy(true)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      void translateRef.current(next, fromRef.current).finally(() => {
        if (reqId.current === id) setBusy(false)
      })
    }, delay)
  }

  useEffect(() => {
    runTranslate(text, AUTO_TRANSLATE_MS)
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
    // Intentionally only re-debounce when the typed text or direction changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runTranslate closes over latest refs
  }, [text, from])

  return (
    <div className="text-mode">
      <div className="text-dirs">
        <button type="button" className={from === 'en' ? 'active' : ''} onClick={() => setFrom('en')}>
          EN → 粵
        </button>
        <button type="button" className={from === 'yue' ? 'active' : ''} onClick={() => setFrom('yue')}>
          粵 → EN
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || e.shiftKey) return
          e.preventDefault()
          runTranslate(text, 0)
        }}
        rows={4}
        placeholder={`${placeholder.en} / ${placeholder.zh}`}
        aria-label={biPlain(placeholder)}
      />
      <p className="text-auto-status" aria-live="polite">
        {busy ? (
          <BiText copy={ui.translating} size="sm" />
        ) : trimmed ? null : (
          <BiText copy={ui.autoTranslateHint} size="sm" />
        )}
      </p>
      <div className="text-lower">
        <PaneParticles />
        {match ? (
          <InkSettle id={match.id} className="text-result">
            <p className="muted">
              <BiText copy={ui.result} size="sm" />
            </p>
            <ResultWithDefinition
              text={match.translation}
              definition={match.to === 'yue' ? match.definition || match.source : match.definition}
              cantonese={match.to === 'yue'}
              onActivate={match.to === 'yue' ? openBreakdown : undefined}
            />
            {match.to === 'yue' ? (
              <TranslationAlternatives
                alternatives={match.alternatives || []}
                onSelect={selectYueVariation}
              />
            ) : null}
          </InkSettle>
        ) : null}
      </div>
    </div>
  )
}
