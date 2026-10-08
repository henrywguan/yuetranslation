import { useCallback, useEffect, useRef, useState } from 'react'
import { useYueStore } from '../lib/store'
import { sayItBackMatches } from '../lib/sayItBackMatch'
import { unlockTtsPlayback } from '../lib/tts'
import { biPlain, ui } from '../lib/uiCopy'
import { hasHan } from '../lib/jyutping'

type Phase = 'idle' | 'playing' | 'ready' | 'listening' | 'match' | 'miss' | 'unsupported'

function recognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

/**
 * Cantonese pronunciation check: play the line, then listen once (zh-HK) and
 * loosely compare the transcript to the expected Han. Browser Web Speech only —
 * no Azure / paid STT. Never starts while the app live mic is on.
 */
export function SayItBack({ text, className = '' }: { text: string; className?: string }) {
  const expected = text.trim()
  const speakManual = useYueStore((s) => s.speakManual)
  const live = useYueStore((s) => s.live)
  const [phase, setPhase] = useState<Phase>('idle')
  const recRef = useRef<SpeechRecognition | null>(null)
  const runRef = useRef(0)

  const abort = useCallback(() => {
    runRef.current += 1
    const rec = recRef.current
    recRef.current = null
    if (!rec) return
    rec.onresult = null
    rec.onerror = null
    rec.onend = null
    try {
      rec.abort()
    } catch {
      /* already stopped */
    }
  }, [])

  useEffect(() => abort, [abort])

  // Background privacy: drop the mic the moment the page is hidden.
  useEffect(() => {
    const release = () => {
      abort()
      setPhase((p) => (p === 'listening' || p === 'playing' ? 'idle' : p))
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') release()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', release)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', release)
    }
  }, [abort])

  const listen = useCallback(
    (runId: number, fromGesture: boolean) => {
      const Ctor = recognitionCtor()
      if (!Ctor) {
        setPhase('unsupported')
        return
      }
      const rec = new Ctor()
      rec.lang = 'zh-HK'
      rec.continuous = false
      rec.interimResults = false
      rec.maxAlternatives = 3
      let settled = false
      rec.onresult = (event) => {
        if (runRef.current !== runId) return
        const last = event.results[event.results.length - 1]
        const heard: string[] = []
        for (let i = 0; i < 3; i += 1) {
          const alt = last[i]
          if (!alt) break
          if (alt.transcript) heard.push(alt.transcript)
        }
        settled = true
        setPhase(heard.some((h) => sayItBackMatches(expected, h)) ? 'match' : 'miss')
      }
      rec.onerror = (event) => {
        if (runRef.current !== runId) return
        settled = true
        if (event.error === 'no-speech' || event.error === 'aborted') {
          setPhase('miss')
        } else if (!fromGesture && event.error === 'not-allowed') {
          // Safari wants recognition.start() inside the tap — let the next tap listen.
          setPhase('ready')
        } else {
          setPhase('unsupported')
        }
      }
      rec.onend = () => {
        if (runRef.current !== runId) return
        recRef.current = null
        if (!settled) setPhase('miss')
      }
      recRef.current = rec
      setPhase('listening')
      try {
        rec.start()
      } catch {
        recRef.current = null
        setPhase(fromGesture ? 'unsupported' : 'ready')
      }
    },
    [expected],
  )

  if (!expected || !hasHan(expected)) return null

  const busy = phase === 'playing' || phase === 'listening'
  const label = {
    idle: ui.sayItBack,
    playing: ui.sayItBack,
    ready: ui.sayItBack,
    listening: ui.sayItBackListening,
    match: ui.sayItBackMatch,
    miss: ui.sayItBackMiss,
    unsupported: ui.sayItBackUnsupported,
  }[phase]

  return (
    <button
      type="button"
      className={`copy-btn say-back-btn${phase === 'match' ? ' is-match' : ''}${phase === 'miss' ? ' is-miss' : ''}${busy ? ' is-listening' : ''} ${className}`.trim()}
      disabled={live || phase === 'unsupported'}
      aria-label={biPlain(label)}
      title={biPlain(label)}
      aria-live="polite"
      onClick={(e) => {
        e.stopPropagation()
        if (busy) {
          abort()
          setPhase('idle')
          return
        }
        if (!recognitionCtor()) {
          setPhase('unsupported')
          return
        }
        if (phase === 'ready') {
          abort()
          listen(runRef.current, true)
          return
        }
        abort()
        const runId = runRef.current
        unlockTtsPlayback()
        setPhase('playing')
        void speakManual(expected, 'yue').finally(() => {
          if (runRef.current !== runId) return
          listen(runId, false)
        })
      }}
    >
      <svg className="copy-btn-icon" viewBox="0 0 24 24" aria-hidden="true">
        {phase === 'match' ? (
          <path d="M9.5 16.2 5.8 12.5l1.4-1.4 2.3 2.3 6.5-6.5 1.4 1.4-7.9 7.9Z" fill="currentColor" />
        ) : (
          <>
            <rect
              x="9"
              y="4"
              width="6"
              height="10.5"
              rx="3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <path
              d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3"
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
