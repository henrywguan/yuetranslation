import { Fragment, useCallback, useEffect, useState } from 'react'
import { JyutpingSylText } from '../../components/JyutpingSylText'
import { SpeakButton } from '../../components/SpeakButton'
import { useYueStore } from '../../lib/store'
import { stopSpeaking, unlockTtsPlayback } from '../../lib/tts'
import {
  HARBOR_GOLD_TO_COINS,
  MATCH_DIFFICULTIES,
  MATCH_DIFFICULTY,
  buildMatchRound,
  type MatchDifficulty,
  type MatchRound,
} from './matchDefinitionBank'

type Phase = 'select' | 'play' | 'feedback'

type Props = {
  open: boolean
  gold: number
  coins: number
  onClose: () => void
  onEarnGold: (amount: number) => void
  onExchangeGold: (amount: number) =>
    | { ok: true; coinsGained: number; goldSpent: number }
    | { ok: false; reason: string }
}

/** Match the Definition — difficulty select, then timed gloss pick. */
export function MatchDefinitionModal({
  open,
  gold,
  coins,
  onClose,
  onEarnGold,
  onExchangeGold,
}: Props) {
  const [phase, setPhase] = useState<Phase>('select')
  const [difficulty, setDifficulty] = useState<MatchDifficulty | null>(null)
  const [round, setRound] = useState<MatchRound | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(MATCH_DIFFICULTY.easy.seconds)
  const [picked, setPicked] = useState<number | null>(null)
  const [sessionGold, setSessionGold] = useState(0)
  const [hits, setHits] = useState(0)
  const [exchangeMsg, setExchangeMsg] = useState<string | null>(null)
  const speakManual = useYueStore((s) => s.speakManual)

  const cfg = difficulty ? MATCH_DIFFICULTY[difficulty] : null

  const startRound = useCallback(
    (diff: MatchDifficulty, prevId?: string) => {
      const next = buildMatchRound(diff, prevId)
      setRound(next)
      setSecondsLeft(next.seconds)
      setPicked(null)
      setPhase('play')
    },
    [],
  )

  const enterDifficulty = useCallback(
    (diff: MatchDifficulty) => {
      unlockTtsPlayback()
      setDifficulty(diff)
      setSessionGold(0)
      setHits(0)
      setExchangeMsg(null)
      startRound(diff)
    },
    [startRound],
  )

  const backToSelect = useCallback(() => {
    stopSpeaking()
    setPhase('select')
    setDifficulty(null)
    setRound(null)
    setPicked(null)
  }, [])

  useEffect(() => {
    if (!open) return
    setPhase('select')
    setDifficulty(null)
    setRound(null)
    setPicked(null)
    setSessionGold(0)
    setHits(0)
    setExchangeMsg(null)
    setSecondsLeft(MATCH_DIFFICULTY.easy.seconds)
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
    if (!open || phase !== 'feedback' || !round || !difficulty) return
    const t = window.setTimeout(() => startRound(difficulty, round.word.id), 1100)
    return () => window.clearTimeout(t)
  }, [open, phase, round, difficulty, startRound])

  // Auto-play Cantonese TTS whenever a new arena prompt lands in play.
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
      if (e.key === 'Escape') {
        if (phase === 'play' || phase === 'feedback') backToSelect()
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, phase, backToSelect])

  if (!open) return null

  const onPick = (index: number) => {
    if (phase !== 'play' || !round || picked !== null) return
    setPicked(index)
    const ok = index === round.correctIndex
    if (ok) {
      onEarnGold(round.goldPerHit)
      setSessionGold((g) => g + round.goldPerHit)
      setHits((h) => h + 1)
    }
    setPhase('feedback')
  }

  const doExchange = (amount: number) => {
    const res = onExchangeGold(amount)
    if (!res.ok) {
      setExchangeMsg(res.reason)
      return
    }
    setExchangeMsg(`Exchanged ${res.goldSpent} gold → ${res.coinsGained} ferry coins`)
  }

  const timerPct = round ? Math.max(0, (secondsLeft / round.seconds) * 100) : 0
  const timedOut = picked === -1
  const correct = picked !== null && picked === round?.correctIndex
  const goldPerHit = round?.goldPerHit ?? cfg?.goldPerHit ?? MATCH_DIFFICULTY.easy.goldPerHit

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
          <div className="hq-match-wallets" aria-live="polite">
            <div className="hq-match-gold" title="Arena gold">
              <span className="hq-match-gold-icon" aria-hidden="true">
                金
              </span>
              <span>{gold}</span>
            </div>
            <div className="hq-match-coins" title="Ferry coins">
              <span className="hq-match-coins-icon" aria-hidden="true">
                ◌
              </span>
              <span>{coins}</span>
            </div>
          </div>
          <button type="button" className="hq-btn hq-btn--ghost hq-match-close" onClick={onClose}>
            Close
          </button>
        </header>

        {phase === 'select' ? (
          <div className="hq-match-intro">
            <p className="hq-match-intro-lead" lang="zh-HK">
              揀難度 · 睇字 · 聽音 · 揀意思
            </p>
            <p className="hq-match-intro-body">
              Pick a difficulty. Each prompt auto-speaks — match the English meaning before time
              runs out. Arena gold converts to ferry coins for the Outfitter.
            </p>

            <div className="hq-match-diff-grid" role="group" aria-label="Difficulty">
              {MATCH_DIFFICULTIES.map((id) => {
                const d = MATCH_DIFFICULTY[id]
                return (
                  <button
                    key={id}
                    type="button"
                    className={`hq-match-diff hq-match-diff--${id}`}
                    onClick={() => enterDifficulty(id)}
                  >
                    <span className="hq-match-diff-label">
                      <span lang="zh-HK">{d.label.zh}</span>
                      <span>{d.label.en}</span>
                    </span>
                    <span className="hq-match-diff-blurb">
                      <span lang="zh-HK">{d.blurb.zh}</span>
                      <span>{d.blurb.en}</span>
                    </span>
                    <span className="hq-match-diff-meta">
                      {d.seconds}s · +{d.goldPerHit} gold
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="hq-match-exchange">
              <p className="hq-match-exchange-title">
                Exchange gold · 兌換金幣
                <span className="hq-match-exchange-rate">
                  1 gold = {HARBOR_GOLD_TO_COINS} ferry coin
                  {HARBOR_GOLD_TO_COINS === 1 ? '' : 's'}
                </span>
              </p>
              <div className="hq-match-exchange-actions">
                <button
                  type="button"
                  className="hq-btn hq-btn--ghost"
                  disabled={gold < 10}
                  onClick={() => doExchange(10)}
                >
                  10 → {10 * HARBOR_GOLD_TO_COINS}¢
                </button>
                <button
                  type="button"
                  className="hq-btn hq-btn--ghost"
                  disabled={gold < 50}
                  onClick={() => doExchange(50)}
                >
                  50 → {50 * HARBOR_GOLD_TO_COINS}¢
                </button>
                <button
                  type="button"
                  className="hq-btn hq-btn--primary"
                  disabled={gold <= 0}
                  onClick={() => doExchange(0)}
                >
                  Exchange all ({gold})
                </button>
              </div>
              {exchangeMsg ? <p className="hq-match-exchange-msg">{exchangeMsg}</p> : null}
            </div>
          </div>
        ) : round ? (
          <div className="hq-match-play">
            <div className="hq-match-play-bar">
              <button type="button" className="hq-btn hq-btn--ghost hq-btn--tiny" onClick={backToSelect}>
                Difficulty
              </button>
              {cfg ? (
                <span className={`hq-match-diff-pill hq-match-diff-pill--${cfg.id}`}>
                  {cfg.label.en} · {cfg.blurb.en}
                </span>
              ) : null}
            </div>

            <div className="hq-match-timer" aria-label={`${secondsLeft} seconds left`}>
              <div
                className={`hq-match-timer-fill${secondsLeft <= 5 ? ' is-urgent' : ''}`}
                style={{ width: `${timerPct}%` }}
              />
              <span className="hq-match-timer-num">{secondsLeft}s</span>
            </div>

            <div className="hq-match-prompt">
              <div className="hq-match-prompt-row">
                <p className={`hq-match-han${round.difficulty === 'hard' ? ' is-sentence' : ''}`} lang="zh-HK">
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
                if (phase === 'feedback' && correct && i !== round.correctIndex) return null
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
                  ? 'Time’s up — next…'
                  : correct
                    ? `+${goldPerHit} gold`
                    : 'Not quite — next…'
                : `Session · ${hits} hits · +${sessionGold} gold`}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
