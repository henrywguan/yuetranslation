import { Fragment, useCallback, useEffect, useState } from 'react'
import { JyutpingSylText } from '../../components/JyutpingSylText'
import { SpeakButton } from '../../components/SpeakButton'
import { useYueStore } from '../../lib/store'
import { stopSpeaking, unlockTtsPlayback } from '../../lib/tts'
import {
  MATCH_GOLD_PER_HIT,
  MATCH_ROUND_SECONDS,
  buildMatchRound,
  type MatchRound,
} from './matchDefinitionBank'

type Phase = 'intro' | 'play' | 'feedback'

type Props = {
  open: boolean
  gold: number
  onClose: () => void
  onEarnGold: (amount: number) => void
}

/** Match the Definition — timed gloss pick for a Cantonese word. */
export function MatchDefinitionModal({ open, gold, onClose, onEarnGold }: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [round, setRound] = useState<MatchRound | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(MATCH_ROUND_SECONDS)
  const [picked, setPicked] = useState<number | null>(null)
  const [sessionGold, setSessionGold] = useState(0)
  const [hits, setHits] = useState(0)
  const speakManual = useYueStore((s) => s.speakManual)

  const startRound = useCallback((prevId?: string) => {
    const next = buildMatchRound(prevId)
    setRound(next)
    setSecondsLeft(MATCH_ROUND_SECONDS)
    setPicked(null)
    setPhase('play')
  }, [])

  const enterArena = useCallback(() => {
    // Unlock during the tap so the first auto-speak works on iOS Safari.
    unlockTtsPlayback()
    startRound()
  }, [startRound])

  useEffect(() => {
    if (!open) return
    setPhase('intro')
    setRound(null)
    setPicked(null)
    setSessionGold(0)
    setHits(0)
    setSecondsLeft(MATCH_ROUND_SECONDS)
    return () => {
      stopSpeaking()
    }
  }, [open])

  useEffect(() => {
    if (!open || phase !== 'play' || !round) return
    if (secondsLeft <= 0) {
      setPicked(-1)
      setPhase('feedback')
      return
    }
    const t = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [open, phase, round, secondsLeft])

  useEffect(() => {
    if (!open || phase !== 'feedback' || !round) return
    const t = window.setTimeout(() => startRound(round.word.id), 1100)
    return () => window.clearTimeout(t)
  }, [open, phase, round, startRound])

  // Auto-play Cantonese TTS whenever a new arena word lands in play.
  useEffect(() => {
    if (!open || phase !== 'play' || !round) return
    const han = round.word.han.trim()
    if (!han) return
    void speakManual(han, 'yue')
    return () => {
      stopSpeaking()
    }
  }, [open, phase, round?.word.id, round?.word.han, speakManual])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const onPick = (index: number) => {
    if (phase !== 'play' || !round || picked !== null) return
    setPicked(index)
    const ok = index === round.correctIndex
    if (ok) {
      onEarnGold(MATCH_GOLD_PER_HIT)
      setSessionGold((g) => g + MATCH_GOLD_PER_HIT)
      setHits((h) => h + 1)
    }
    setPhase('feedback')
  }

  const timerPct = Math.max(0, (secondsLeft / MATCH_ROUND_SECONDS) * 100)
  const timedOut = picked === -1
  const correct = picked !== null && picked === round?.correctIndex

  return (
    <div className="hq-match-overlay" role="presentation" onClick={onClose}>
      <div
        className="hq-match-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hq-match-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="hq-match-head">
          <div>
            <p className="hq-match-kicker">Arena · 擂台</p>
            <h2 id="hq-match-title" className="hq-match-title">
              Match the Definition
            </h2>
          </div>
          <div className="hq-match-gold" aria-live="polite">
            <span className="hq-match-gold-icon" aria-hidden="true">
              金
            </span>
            <span>{gold}</span>
          </div>
          <button type="button" className="hq-btn hq-btn--ghost hq-match-close" onClick={onClose}>
            Close
          </button>
        </header>

        {phase === 'intro' ? (
          <div className="hq-match-intro">
            <p className="hq-match-intro-lead" lang="zh-HK">
              睇字、聽音、揀意思
            </p>
            <p className="hq-match-intro-body">
              A Chinese character appears with Jyutping + Chao tone letters. Match the English
              definition before the time runs out!
            </p>
            <ul className="hq-match-rules">
              <li>
                <strong>{MATCH_ROUND_SECONDS}s</strong> per round
              </li>
              <li>
                <strong>3</strong> definitions — one is correct
              </li>
              <li>
                Each hit earns <strong>{MATCH_GOLD_PER_HIT} gold</strong>
              </li>
              <li>
                Each word <strong>auto-speaks</strong> — tap the speaker to hear again
              </li>
            </ul>
            <button type="button" className="hq-btn hq-btn--primary hq-btn--lg" onClick={enterArena}>
              Enter the arena
            </button>
          </div>
        ) : round ? (
          <div className="hq-match-play">
            <div className="hq-match-timer" aria-label={`${secondsLeft} seconds left`}>
              <div
                className={`hq-match-timer-fill${secondsLeft <= 5 ? ' is-urgent' : ''}`}
                style={{ width: `${timerPct}%` }}
              />
              <span className="hq-match-timer-num">{secondsLeft}s</span>
            </div>

            <div className="hq-match-prompt">
              <div className="hq-match-prompt-row">
                <p className="hq-match-han" lang="zh-HK">
                  {round.word.han}
                </p>
                <SpeakButton text={round.word.han} lang="yue" className="hq-match-speak" warm />
              </div>
              <p className="hq-match-jp" aria-label={round.word.jp}>
                {round.word.jp.split(/\s+/).map((syl, i) => (
                  <Fragment key={`${syl}-${i}`}>
                    {i > 0 ? ' ' : null}
                    <JyutpingSylText jp={syl} />
                  </Fragment>
                ))}
              </p>
            </div>

            <div className="hq-match-choices" role="group" aria-label="Definitions">
              {round.choices.map((choice, i) => {
                let cls = 'hq-match-choice'
                if (phase === 'feedback') {
                  if (i === round.correctIndex) cls += ' is-correct'
                  else if (i === picked) cls += ' is-wrong'
                }
                return (
                  <button
                    key={`${choice}-${i}`}
                    type="button"
                    className={cls}
                    disabled={phase !== 'play'}
                    onClick={() => onPick(i)}
                  >
                    {choice}
                  </button>
                )
              })}
            </div>

            <p className="hq-match-session" aria-live="polite">
              {phase === 'feedback'
                ? timedOut
                  ? 'Time’s up — next word…'
                  : correct
                    ? `+${MATCH_GOLD_PER_HIT} gold`
                    : 'Not quite — next word…'
                : `Session · ${hits} hits · +${sessionGold} gold`}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
