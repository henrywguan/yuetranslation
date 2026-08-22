import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useRef, useState } from 'react'
import { BiText } from '../../components/BiText'
import { inkEase } from '../../lib/motion'
import { useYueStore } from '../../lib/store'
import { unlockTtsPlayback } from '../../lib/tts'
import { useReducedMotion } from '../../lib/useReducedMotion'
import { ui } from '../../lib/uiCopy'
import { ToneContour } from './ToneContour'
import { ToneRuby } from './ToneTheater'
import { TONE_TWINS } from './tonesData'

type Side = 'buy' | 'sell'

const SIDES: Side[] = ['buy', 'sell']

const STORY = {
  buy: {
    han: TONE_TWINS.buy.han,
    jp: TONE_TWINS.buy.jp,
    chao: TONE_TWINS.buy.chao,
    contour: TONE_TWINS.buy.contour,
    toneN: TONE_TWINS.buy.n,
    head: ui.tonesStoryBuyHead,
    line: ui.tonesStoryBuyLine,
    scene: ui.tonesStoryBuyScene,
  },
  sell: {
    han: TONE_TWINS.sell.han,
    jp: TONE_TWINS.sell.jp,
    chao: TONE_TWINS.sell.chao,
    contour: TONE_TWINS.sell.contour,
    toneN: TONE_TWINS.sell.n,
    head: ui.tonesStorySellHead,
    line: ui.tonesStorySellLine,
    scene: ui.tonesStorySellScene,
  },
} as const

/** Full-width flip-story: same syllable, two tones — swipe or arrow through buy vs sell. */
export function ToneTwinsStory() {
  const reduce = useReducedMotion()
  const speakManual = useYueStore((s) => s.speakManual)
  const speakingText = useYueStore((s) => s.speakingText)
  const status = useYueStore((s) => s.status)
  const [side, setSide] = useState<Side>('buy')
  const [dir, setDir] = useState(1)
  const dragStart = useRef<number | null>(null)

  const active = STORY[side]
  const speaking = status === 'speaking' && speakingText === active.han

  const go = useCallback(
    (next: Side) => {
      const nextIdx = SIDES.indexOf(next)
      const curIdx = SIDES.indexOf(side)
      if (nextIdx === curIdx) return
      setDir(nextIdx > curIdx ? 1 : -1)
      setSide(next)
      unlockTtsPlayback()
      void speakManual(STORY[next].han, 'yue')
    },
    [side, speakManual],
  )

  const step = useCallback(
    (delta: -1 | 1) => {
      const idx = SIDES.indexOf(side)
      const next = SIDES[(idx + delta + SIDES.length) % SIDES.length]!
      go(next)
    },
    [go, side],
  )

  const onPlay = () => {
    unlockTtsPlayback()
    void speakManual(active.han, 'yue')
  }

  return (
    <section className="tones-story" aria-label={ui.tonesTwinsTitle.en}>
      <div className="tones-story-intro">
        <h2 className="tones-story-title">
          <BiText copy={ui.tonesTwinsTitle} size="lg" />
        </h2>
        <p className="tones-story-syllable">
          <BiText copy={ui.tonesStorySame} size="sm" hideJp />
        </p>
      </div>

      <div className="tones-story-stage">
        <button
          type="button"
          className="tones-story-nav tones-story-nav--prev"
          aria-label={ui.tonesStoryPrev.en}
          onClick={() => step(-1)}
        >
          ←
        </button>

        <div
          className="tones-story-viewport"
          onPointerDown={(e) => {
            dragStart.current = e.clientX
          }}
          onPointerUp={(e) => {
            if (dragStart.current == null) return
            const dx = e.clientX - dragStart.current
            dragStart.current = null
            if (Math.abs(dx) < 48) return
            step(dx < 0 ? 1 : -1)
          }}
          onPointerCancel={() => {
            dragStart.current = null
          }}
        >
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={side}
              className={`tones-story-panel tones-story-panel--${side}${speaking ? ' is-speaking' : ''}`}
              custom={dir}
              initial={
                reduce
                  ? false
                  : { opacity: 0, x: dir > 0 ? 120 : -120, rotateY: dir > 0 ? 18 : -18, scale: 0.94 }
              }
              animate={{ opacity: 1, x: 0, rotateY: 0, scale: 1 }}
              exit={
                reduce
                  ? undefined
                  : { opacity: 0, x: dir > 0 ? -120 : 120, rotateY: dir > 0 ? -18 : 18, scale: 0.94 }
              }
              transition={{ duration: 0.55, ease: inkEase }}
              style={{ transformPerspective: 900 }}
            >
              <motion.p
                className="tones-story-headline"
                aria-hidden="true"
                initial={reduce ? false : { opacity: 0, y: 24, scale: 0.88 }}
                animate={{ opacity: 0.14, y: 0, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.08, ease: inkEase }}
              >
                <BiText copy={active.head} size="lg" only="en" />
              </motion.p>

              <div className="tones-story-panel-inner">
                <span className="tones-story-tone-tag">Tone {active.toneN}</span>
                <p className="tones-story-scene">
                  <BiText copy={active.scene} size="sm" />
                </p>
                <button type="button" className="tones-story-glyph" onClick={onPlay}>
                  <ToneRuby han={active.han} jp={active.jp} size="lg" />
                  <span className="tones-story-chao">{active.chao}</span>
                </button>
                <p className="tones-story-line">
                  <BiText copy={active.line} size="md" />
                </p>
                <ToneContour
                  points={active.contour}
                  active={!reduce}
                  speaking={speaking}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <button
          type="button"
          className="tones-story-nav tones-story-nav--next"
          aria-label={ui.tonesStoryNext.en}
          onClick={() => step(1)}
        >
          →
        </button>
      </div>

      <div className="tones-story-footer">
        <div className="tones-story-dots" role="tablist" aria-label={ui.tonesStorySame.en}>
          {SIDES.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={s === side}
              className={`tones-story-dot${s === side ? ' is-active' : ''}`}
              onClick={() => go(s)}
            >
              <BiText copy={s === 'buy' ? ui.tonesBuy : ui.tonesSell} size="sm" hideJp />
            </button>
          ))}
        </div>
        <p className="tones-story-hint">
          <BiText copy={ui.tonesStoryHint} size="sm" hideJp />
        </p>
      </div>
    </section>
  )
}
