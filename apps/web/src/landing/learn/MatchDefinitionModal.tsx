import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { JyutpingSylText } from '../../components/JyutpingSylText'
import { SpeakButton } from '../../components/SpeakButton'
import { stopSpeaking, unlockTtsPlayback } from '../../lib/tts'
import { speakHarborTts } from './harborSpeak'
import {
  HARBOR_GOLD_TO_COINS,
  MATCH_DIFFICULTIES,
  MATCH_DIFFICULTY,
  MATCH_TOPIC,
  MATCH_TOPICS,
  buildMatchRound,
  type MatchDifficulty,
  type MatchRound,
  type MatchTopic,
} from './matchDefinitionBank'

type Phase = 'topic' | 'difficulty' | 'play' | 'feedback'

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

/** Match the Definition — topic → difficulty → timed gloss pick. */
export function MatchDefinitionModal({
  open,
  gold,
  coins,
  onClose,
  onEarnGold,
  onExchangeGold,
}: Props) {
  const [phase, setPhase] = useState<Phase>('topic')
  const [topic, setTopic] = useState<MatchTopic | null>(null)
  const [difficulty, setDifficulty] = useState<MatchDifficulty | null>(null)
  const [round, setRound] = useState<MatchRound | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(MATCH_DIFFICULTY.easy.seconds)
  const [picked, setPicked] = useState<number | null>(null)
  const [sessionGold, setSessionGold] = useState(0)
  const [hits, setHits] = useState(0)
  const [exchangeMsg, setExchangeMsg] = useState<string | null>(null)
  /** Word ids already served this difficulty run — avoid 10-round repeats. */
  const usedIdsRef = useRef<string[]>([])

  const topicCfg = topic ? MATCH_TOPIC[topic] : null
  const diffCfg = difficulty ? MATCH_DIFFICULTY[difficulty] : null

  const startRound = useCallback((t: MatchTopic, diff: MatchDifficulty, alreadyUsed: readonly string[] = []) => {
    const next = buildMatchRound(t, diff, alreadyUsed)
    usedIdsRef.current = [...alreadyUsed, next.word.id]
    setRound(next)
    setSecondsLeft(next.seconds)
    setPicked(null)
    setPhase('play')
  }, [])

  const pickTopic = useCallback((t: MatchTopic) => {
    setTopic(t)
    setDifficulty(null)
    setRound(null)
    setPicked(null)
    usedIdsRef.current = []
    setPhase('difficulty')
    setExchangeMsg(null)
  }, [])

  const enterDifficulty = useCallback(
    (diff: MatchDifficulty) => {
      if (!topic) return
      unlockTtsPlayback()
      setDifficulty(diff)
      setSessionGold(0)
      setHits(0)
      usedIdsRef.current = []
      setExchangeMsg(null)
      startRound(topic, diff, [])
    },
    [topic, startRound],
  )

  const backToDifficulty = useCallback(() => {
    stopSpeaking()
    setPhase('difficulty')
    setDifficulty(null)
    setRound(null)
    setPicked(null)
    usedIdsRef.current = []
  }, [])

  const backToTopic = useCallback(() => {
    stopSpeaking()
    setPhase('topic')
    setTopic(null)
    setDifficulty(null)
    setRound(null)
    setPicked(null)
    usedIdsRef.current = []
  }, [])
  useEffect(() => {
    if (!open) return
    setPhase('topic')
    setTopic(null)
    setDifficulty(null)
    setRound(null)
    setPicked(null)
    setSessionGold(0)
    setHits(0)
    usedIdsRef.current = []
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
    if (!open || phase !== 'feedback' || !round || !topic || !difficulty) return
    const t = window.setTimeout(() => startRound(topic, difficulty, usedIdsRef.current), 1100)
    return () => window.clearTimeout(t)
  }, [open, phase, round, topic, difficulty, startRound])

  useEffect(() => {
    if (!open || phase !== 'play' || !round) return
    // Native: English prompt — don't auto-speak the Cantonese answer.
    if (round.promptMode === 'gloss') return
    const han = round.word.han.trim()
    if (!han) return
    void speakHarborTts(han, 'yue')
    return () => {
      stopSpeaking()
    }
  }, [open, phase, round?.word.id, round?.word.han, round?.promptMode])

  useEffect(() => {
    if (!open || phase !== 'feedback' || !round || round.promptMode !== 'gloss') return
    const han = round.word.han.trim()
    if (!han) return
    void speakHarborTts(han, 'yue')
    return () => {
      stopSpeaking()
    }
  }, [open, phase, round?.word.id, round?.word.han, round?.promptMode])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (phase === 'play' || phase === 'feedback') backToDifficulty()
      else if (phase === 'difficulty') backToTopic()
      else onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, phase, backToDifficulty, backToTopic])

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
  const goldPerHit = round?.goldPerHit ?? diffCfg?.goldPerHit ?? MATCH_DIFFICULTY.easy.goldPerHit

  const exchangePanel = (
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
  )

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

        {phase === 'topic' ? (
          <div className="hq-match-intro">
            <p className="hq-match-intro-lead" lang="zh-HK">
              揀主題 · 再揀難度
            </p>
            <p className="hq-match-intro-body">
              Pick a topic first. Difficulty then scales inside that theme — words, phrases, then
              full sentences. Arena gold converts to ferry coins for the Outfitter.
            </p>

            <div className="hq-match-topic-grid" role="group" aria-label="Topic">
              {MATCH_TOPICS.map((id) => {
                const t = MATCH_TOPIC[id]
                return (
                  <button
                    key={id}
                    type="button"
                    className={`hq-match-topic hq-match-topic--${id}`}
                    onClick={() => pickTopic(id)}
                  >
                    <span className="hq-match-topic-label">
                      <span lang="zh-HK">{t.label.zh}</span>
                      <span>{t.label.en}</span>
                    </span>
                    <span className="hq-match-topic-blurb">
                      <span lang="zh-HK">{t.blurb.zh}</span>
                      <span>{t.blurb.en}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            {exchangePanel}
          </div>
        ) : null}

        {phase === 'difficulty' && topicCfg ? (
          <div className="hq-match-intro">
            <div className="hq-match-play-bar">
              <button type="button" className="hq-btn hq-btn--ghost hq-btn--tiny" onClick={backToTopic}>
                Topics
              </button>
              <span className={`hq-match-topic-pill hq-match-topic-pill--${topicCfg.id}`}>
                {topicCfg.label.zh} · {topicCfg.label.en}
              </span>
            </div>
            <p className="hq-match-intro-lead" lang="zh-HK">
              揀難度
            </p>
            <p className="hq-match-intro-body">
              Same topic, harder form — Easy words, Medium phrases, Hard sentences, then Native
              news-desk Cantonese choices. More gold as you climb.
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
          </div>
        ) : null}

        {(phase === 'play' || phase === 'feedback') && round ? (
          <div className="hq-match-play">
            <div className="hq-match-play-bar">
              <button
                type="button"
                className="hq-btn hq-btn--ghost hq-btn--tiny"
                onClick={backToDifficulty}
              >
                Difficulty
              </button>
              <span className="hq-match-session-pills">
                {topicCfg ? (
                  <span className={`hq-match-topic-pill hq-match-topic-pill--${topicCfg.id}`}>
                    {topicCfg.label.en}
                  </span>
                ) : null}
                {diffCfg ? (
                  <span className={`hq-match-diff-pill hq-match-diff-pill--${diffCfg.id}`}>
                    {diffCfg.label.en}
                  </span>
                ) : null}
              </span>
            </div>

            <div className="hq-match-timer" aria-label={`${secondsLeft} seconds left`}>
              <div
                className={`hq-match-timer-fill${secondsLeft <= 5 ? ' is-urgent' : ''}`}
                style={{ width: `${timerPct}%` }}
              />
              <span className="hq-match-timer-num">{secondsLeft}s</span>
            </div>

            <div className="hq-match-prompt">
              {round.promptMode === 'gloss' ? (
                <>
                  <p className="hq-match-gloss-prompt">{round.word.def}</p>
                  <p className="hq-match-gloss-hint" lang="zh-HK">
                    揀最似新聞報導嘅粵語
                  </p>
                </>
              ) : (
                <>
                  <div className="hq-match-prompt-row">
                    <p
                      className={`hq-match-han${round.difficulty === 'hard' || round.difficulty === 'native' ? ' is-sentence' : ''}`}
                      lang="zh-HK"
                    >
                      {round.word.han}
                    </p>
                    <SpeakButton
                      text={round.word.han}
                      lang="yue"
                      className="hq-match-speak"
                      warm
                      playText={speakHarborTts}
                    />
                  </div>
                  <p className="hq-match-jp" aria-label={round.word.jp}>
                    {round.word.jp.split(/\s+/).map((syl, i) => (
                      <Fragment key={`${syl}-${i}`}>
                        {i > 0 ? ' ' : null}
                        <JyutpingSylText jp={syl} />
                      </Fragment>
                    ))}
                  </p>
                </>
              )}
            </div>

            <div
              className={`hq-match-choices${round.promptMode === 'gloss' ? ' hq-match-choices--native' : ''}`}
              role="group"
              aria-label={round.promptMode === 'gloss' ? 'Cantonese lines' : 'Definitions'}
            >
              {round.choices.map((choice, i) => {
                if (phase === 'feedback' && correct && i !== round.correctIndex) return null
                let cls = 'hq-match-choice'
                if (round.promptMode === 'gloss') cls += ' is-han'
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
                    lang={round.promptMode === 'gloss' ? 'zh-HK' : undefined}
                    onClick={() => onPick(i)}
                  >
                    {choice}
                  </button>
                )
              })}
            </div>

            {phase === 'feedback' && round.promptMode === 'gloss' ? (
              <div className="hq-match-native-reveal">
                <p className="hq-match-jp" aria-label={round.word.jp}>
                  {round.word.jp.split(/\s+/).map((syl, i) => (
                    <Fragment key={`${syl}-${i}`}>
                      {i > 0 ? ' ' : null}
                      <JyutpingSylText jp={syl} />
                    </Fragment>
                  ))}
                </p>
                <SpeakButton
                  text={round.word.han}
                  lang="yue"
                  className="hq-match-speak"
                  warm
                  playText={speakHarborTts}
                />
              </div>
            ) : null}

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
