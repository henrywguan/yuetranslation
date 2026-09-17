import { useEffect, useMemo, useState } from 'react'
import { SpeakButton } from '../../components/SpeakButton'
import { stopSpeaking, unlockTtsPlayback } from '../../lib/tts'
import {
  buildHarborDelve,
  HARBOR_DELVE_CLEAR_TITLE,
  HARBOR_DELVE_COINS_PER_HIT,
  HARBOR_DELVE_COMPANION,
  HARBOR_DELVE_INTRO,
  HARBOR_DELVE_OUTRO_OK,
  type HarborDelveRound,
} from './harborDelve'
import { speakHarborTts } from './harborSpeak'

type Phase = 'intro' | 'play' | 'feedback' | 'done'

type Props = {
  open: boolean
  alone: boolean
  onClose: () => void
  onHit: (coins: number) => void
  onComplete: (hits: number) => void
}

/** 港灣 companion delve — scripted coach when the dock is quiet. */
export function HarborDelveModal({ open, alone, onClose, onHit, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [rounds, setRounds] = useState<HarborDelveRound[]>([])
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [hits, setHits] = useState(0)

  const round = rounds[idx] ?? null

  useEffect(() => {
    if (!open) return
    setPhase('intro')
    setRounds(buildHarborDelve(Date.now(), 5))
    setIdx(0)
    setPicked(null)
    setHits(0)
  }, [open])

  // Harbor Quest always auto-plays Cantonese hear clips (independent of Account Auto-speak).
  useEffect(() => {
    if (!open || phase !== 'play' || !round?.hearHan) return
    const han = round.hearHan.trim()
    if (!han) return
    void speakHarborTts(han, 'yue')
    return () => {
      stopSpeaking()
    }
  }, [open, phase, round?.id, round?.hearHan])

  const progressLabel = useMemo(() => {
    if (!rounds.length) return ''
    return `${Math.min(idx + 1, rounds.length)} / ${rounds.length}`
  }, [idx, rounds.length])

  if (!open) return null

  const start = () => {
    unlockTtsPlayback()
    setPhase('play')
    setIdx(0)
    setPicked(null)
  }

  const choose = (id: string) => {
    if (!round || phase !== 'play') return
    setPicked(id)
    const ok = id === round.correctId
    if (ok) {
      setHits((h) => h + 1)
      onHit(HARBOR_DELVE_COINS_PER_HIT)
    }
    setPhase('feedback')
  }

  const advance = () => {
    if (idx + 1 >= rounds.length) {
      setPhase('done')
      return
    }
    setIdx((i) => i + 1)
    setPicked(null)
    setPhase('play')
  }

  const finish = () => {
    onComplete(hits)
    onClose()
  }

  return (
    <div className="hq-delve-overlay" role="presentation" onClick={onClose}>
      <div
        className="hq-delve-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="港灣 companion delve"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="hq-delve-head">
          <div>
            <p className="hq-delve-kicker">
              {HARBOR_DELVE_COMPANION.name.en}
              <span aria-hidden="true"> · </span>
              <span lang="zh-HK">{HARBOR_DELVE_COMPANION.name.zh}</span>
            </p>
            <h2 className="hq-delve-title">Companion delve</h2>
            <p className="hq-delve-sub">
              {alone
                ? 'Dock is quiet — coach on duty.'
                : 'Sailors nearby — you can still drill with 港灣.'}
            </p>
          </div>
          <button type="button" className="hq-btn hq-btn--ghost" onClick={onClose}>
            Close
          </button>
        </header>

        {phase === 'intro' ? (
          <div className="hq-delve-body">
            <p className="hq-delve-coach">{HARBOR_DELVE_INTRO.en}</p>
            <p className="hq-delve-coach-zh" lang="zh-HK">
              {HARBOR_DELVE_INTRO.zh}
            </p>
            <button type="button" className="hq-btn hq-btn--primary" onClick={start}>
              Begin · 開始
            </button>
          </div>
        ) : null}

        {phase === 'play' && round ? (
          <div className="hq-delve-body">
            <p className="hq-delve-progress">{progressLabel}</p>
            <p className="hq-delve-coach">{round.prompt.en}</p>
            <p className="hq-delve-coach-zh" lang="zh-HK">
              {round.prompt.zh}
            </p>
            {round.hearHan ? (
              <div className="hq-delve-hear">
                <SpeakButton text={round.hearHan} lang="yue" playText={speakHarborTts} />
              </div>
            ) : null}
            <ul className="hq-delve-choices">
              {round.choices.map((c) => (
                <li key={c.id}>
                  <button type="button" className="hq-delve-choice" onClick={() => choose(c.id)}>
                    <span className="hq-delve-choice-label">{c.label}</span>
                    {c.sub ? <span className="hq-delve-choice-sub">{c.sub}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {phase === 'feedback' && round && picked ? (
          <div className="hq-delve-body">
            <p className="hq-delve-progress">{progressLabel}</p>
            {picked === round.correctId ? (
              <>
                <p className="hq-delve-coach hq-delve-coach--ok">{round.coachOk.en}</p>
                <p className="hq-delve-coach-zh" lang="zh-HK">
                  {round.coachOk.zh}
                </p>
              </>
            ) : (
              <>
                <p className="hq-delve-coach hq-delve-coach--no">{round.coachNo.en}</p>
                <p className="hq-delve-coach-zh" lang="zh-HK">
                  {round.coachNo.zh}
                </p>
              </>
            )}
            <button type="button" className="hq-btn hq-btn--primary" onClick={advance}>
              {idx + 1 >= rounds.length ? 'Finish · 完成' : 'Next · 下一題'}
            </button>
          </div>
        ) : null}

        {phase === 'done' ? (
          <div className="hq-delve-body">
            <p className="hq-delve-coach">{HARBOR_DELVE_OUTRO_OK.en}</p>
            <p className="hq-delve-coach-zh" lang="zh-HK">
              {HARBOR_DELVE_OUTRO_OK.zh}
            </p>
            <p className="hq-delve-score">
              Hits · {hits}/{rounds.length}
              {hits > 0 ? ` · +${hits * HARBOR_DELVE_COINS_PER_HIT} coins` : ''}
            </p>
            <p className="hq-delve-title-hint">
              First clear unlocks · 港灣門生 ({HARBOR_DELVE_CLEAR_TITLE})
            </p>
            <button type="button" className="hq-btn hq-btn--primary" onClick={finish}>
              Cast off
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
