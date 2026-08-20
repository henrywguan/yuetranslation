import { useEffect, useRef, useState } from 'react'
import { BiText } from './BiText'
import { InkSettle } from './InkSettle'
import { ResultWithDefinition } from './ResultWithDefinition'
import { TranslateThinking } from './TranslateThinking'
import { TranslationAlternatives } from './TranslationAlternatives'
import { useYueStore } from '../lib/store'
import { biPlain, ui } from '../lib/uiCopy'
import type { Lang } from '../lib/types'

const AUTO_TRANSLATE_MS = 700

function isWorthAutoTranslate(value: string, from: Lang): boolean {
  const t = value.trim()
  if (!t) return false
  if (from === 'yue') {
    // At least one CJK ideograph, or a short Latin transliteration.
    return /[\u4e00-\u9fff]/.test(t) || t.length >= 2
  }
  // Skip single-letter / mid-word fragments like "h", "he", "wha".
  const letters = t.replace(/[^\p{L}\p{N}]+/gu, '')
  return letters.length >= 3 || t.split(/\s+/).filter(Boolean).length >= 2
}

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
  const translating = useYueStore((s) => s.translating)
  const yueAlternatives = useYueStore((s) => s.yueAlternatives)
  const altsLoading = useYueStore((s) => s.altsLoading)
  const trimmed = text.trim()
  const latest = history[0]
  const match =
    latest && latest.from === from && latest.source === trimmed ? latest : null
  const showThinking = busy || translating
  const showYueAlts = Boolean(match && match.to === 'yue')
  // Prefer this turn’s history alts so a prior Solo result cannot leak in.
  const alts = showYueAlts
    ? match!.alternatives?.length
      ? match!.alternatives
      : yueAlternatives
    : []

  const openMatchBreakdown = (phrase: string) => {
    if (!match) return
    if (match.to === 'yue') {
      openBreakdown(phrase, {
        translation: match.source,
        definition: match.definition || undefined,
        definitions: match.definitions,
        alternatives: alts,
      })
      return
    }
    openBreakdown(match.source, {
      translation: match.translation,
      definition: match.definition || undefined,
      definitions: match.definitions,
    })
  }
  const placeholder = from === 'en' ? ui.typeEnglish : ui.typeCantonese
  const fromRef = useRef(from)
  const translateRef = useRef(translateTyped)
  const historyRef = useRef(history)
  fromRef.current = from
  translateRef.current = translateTyped
  historyRef.current = history

  const runTranslate = (value: string, delay: number, force = false) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const next = value.trim()
    if (!next) {
      setBusy(false)
      return
    }
    if (!force && !isWorthAutoTranslate(next, fromRef.current)) {
      setBusy(false)
      return
    }
    const top = historyRef.current[0]
    if (top && top.from === fromRef.current && top.source === next) {
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
          runTranslate(text, 0, true)
        }}
        rows={4}
        placeholder={`${placeholder.en} / ${placeholder.zh}`}
        aria-label={biPlain(placeholder)}
      />
      <p className="text-auto-status" aria-live="polite">
        {showThinking || trimmed ? null : (
          <BiText copy={ui.autoTranslateHint} size="sm" layout="inline" />
        )}
      </p>
      <div className="text-lower">
        {showThinking ? (
          <TranslateThinking className="text-thinking" />
        ) : match ? (
          <InkSettle id={match.id} className="text-result">
            <p className="muted">
              <BiText copy={ui.result} size="sm" layout="inline" />
            </p>
            <ResultWithDefinition
              text={match.translation}
              definition={match.to === 'yue' ? match.definition || match.source : match.definition}
              definitions={match.definitions}
              cantonese={match.to === 'yue'}
              onActivate={openMatchBreakdown}
              speakLang={match.to}
            />
            {showYueAlts && altsLoading && alts.length === 0 ? (
              <p className="text-alts-loading muted" aria-live="polite">
                <BiText copy={ui.loadingVariations} size="sm" layout="inline" />
              </p>
            ) : null}
            {showYueAlts && alts.length > 0 ? (
              <TranslationAlternatives alternatives={alts} onSelect={selectYueVariation} />
            ) : null}
          </InkSettle>
        ) : null}
      </div>
    </div>
  )
}
