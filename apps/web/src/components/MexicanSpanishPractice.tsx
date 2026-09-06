import { useEffect, useRef, useState } from 'react'
import { createAzureLiveSession } from '../lib/azureSpeech'
import { canUseMicrophone, micBlockedMessage } from '../lib/mediaAccess'
import { scoreMexicanSpanishSpeech, type MxSpeakScore } from '../lib/mexicanSpanishPedagogy'
import { unlockTtsPlayback, speakText } from '../lib/tts'
import { createWebSpeechSession } from '../lib/webSpeech'
import { biPlain, ui } from '../lib/uiCopy'
import { BiText } from './BiText'
import type { LiveSession } from '../lib/types'

/**
 * Practice saying a Mexican Spanish line — local speak-score vs the target.
 * Compact translation line stays unchanged; this is a secondary affordance.
 */
export function MexicanSpanishPractice({
  target,
  className = '',
}: {
  target: string
  className?: string
}) {
  const trimmed = target.trim()
  const [open, setOpen] = useState(false)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [heard, setHeard] = useState('')
  const [score, setScore] = useState<MxSpeakScore | null>(null)
  const [error, setError] = useState<string | null>(null)
  const sessionRef = useRef<LiveSession | null>(null)
  const finalBuf = useRef('')
  const interimRef = useRef('')
  const scoreRef = useRef<MxSpeakScore | null>(null)

  useEffect(() => {
    return () => {
      void sessionRef.current?.stop()
      sessionRef.current = null
    }
  }, [])

  useEffect(() => {
    setHeard('')
    setInterim('')
    setScore(null)
    setError(null)
    scoreRef.current = null
    interimRef.current = ''
  }, [trimmed])

  if (!trimmed) return null

  const stopListen = async () => {
    const s = sessionRef.current
    sessionRef.current = null
    setListening(false)
    if (s) await s.stop()
    const finalText = (finalBuf.current || interimRef.current).trim()
    finalBuf.current = ''
    interimRef.current = ''
    if (finalText) {
      setHeard(finalText)
      const next = scoreMexicanSpanishSpeech(finalText, trimmed)
      scoreRef.current = next
      setScore(next)
    } else if (!scoreRef.current) {
      const next = scoreMexicanSpanishSpeech('', trimmed)
      scoreRef.current = next
      setScore(next)
    }
    setInterim('')
  }

  const startListen = async () => {
    if (sessionRef.current) return
    setError(null)
    setScore(null)
    scoreRef.current = null
    setHeard('')
    setInterim('')
    finalBuf.current = ''
    interimRef.current = ''
    unlockTtsPlayback()

    const ok = await canUseMicrophone()
    if (!ok) {
      setError(micBlockedMessage())
      return
    }

    const handlers = {
      onInterim: (_lang: 'en' | 'yue' | 'cmn' | 'wuu' | 'tl' | 'es', text: string) => {
        interimRef.current = text
        setInterim(text)
      },
      onFinal: (_lang: 'en' | 'yue' | 'cmn' | 'wuu' | 'tl' | 'es', text: string) => {
        const t = text.trim()
        if (!t) return
        finalBuf.current = finalBuf.current ? `${finalBuf.current} ${t}` : t
        setHeard(finalBuf.current)
      },
      onError: (message: string) => {
        setError(message)
        setListening(false)
      },
      onStatus: (_status: 'listening' | 'idle' | 'speaking') => {},
    }

    try {
      let stream: MediaStream | null = null
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch {
        stream = null
      }
      let session = await createAzureLiveSession(handlers, stream, 'es')
      if (!session) session = createWebSpeechSession(handlers, 'es')
      if (!session) {
        setError(biPlain(ui.mxPracticeNoMic))
        stream?.getTracks().forEach((t) => t.stop())
        return
      }
      sessionRef.current = session
      setListening(true)
      await session.start()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setListening(false)
    }
  }

  const toggleListen = () => {
    if (listening) void stopListen()
    else void startListen()
  }

  return (
    <div className={`mx-practice ${className}`.trim()}>
      <button
        type="button"
        className={`mx-practice-toggle${open ? ' is-open' : ''}`}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        <BiText copy={ui.mxPractice} size="sm" hideJp />
      </button>

      {open ? (
        <div className="mx-practice-panel" onClick={(e) => e.stopPropagation()}>
          <p className="mx-practice-target" lang="es-MX">
            {trimmed}
          </p>
          <div className="mx-practice-actions">
            <button
              type="button"
              className="mx-practice-hear"
              onClick={() => void speakText(trimmed, 'es')}
            >
              <BiText copy={ui.mxPracticeHear} size="sm" hideJp />
            </button>
            <button
              type="button"
              className={`mx-practice-mic${listening ? ' is-listening' : ''}`}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                toggleListen()
              }}
            >
              <BiText
                copy={listening ? ui.mxPracticeListening : ui.mxPracticeSpeak}
                size="sm"
                hideJp
              />
            </button>
          </div>
          {interim || heard ? (
            <p className="mx-practice-heard muted" lang="es-MX">
              {interim || heard}
            </p>
          ) : null}
          {score ? (
            <div
              className={`mx-practice-score mx-practice-score--${
                score.score >= 75 ? 'good' : score.score >= 40 ? 'mid' : 'low'
              }`}
              aria-live="polite"
            >
              <span className="mx-practice-score-num">{score.score}</span>
              <span className="mx-practice-score-label">
                {score.labelEn}
                <span className="mx-practice-score-zh" lang="zh-HK">
                  {' '}
                  · {score.labelZh}
                </span>
              </span>
              {score.tipsEn.length ? (
                <ul className="mx-practice-tips">
                  {score.tipsEn.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          {error ? <p className="mx-practice-error">{error}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
