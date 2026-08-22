import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useState } from 'react'
import { BiText } from '../../components/BiText'
import { SpeakButton } from '../../components/SpeakButton'
import { inkEase } from '../../lib/motion'
import { useYueStore } from '../../lib/store'
import { unlockTtsPlayback } from '../../lib/tts'
import { useReducedMotion } from '../../lib/useReducedMotion'
import { ui } from '../../lib/uiCopy'
import { ToneContour } from './ToneContour'
import { TONES, type ToneDef } from './tonesData'

/** Jyutping stacked above Han — same cell geometry as app ruby. */
export function ToneRuby({
  han,
  jp,
  size = 'md',
}: {
  han: string
  jp: string
  size?: 'sm' | 'md' | 'lg'
}) {
  return (
    <span className={`tone-ruby tone-ruby--${size}`}>
      <span className="tone-ruby-jp">{jp}</span>
      <span className="tone-ruby-han" lang="zh-HK">
        {han}
      </span>
    </span>
  )
}

/** Interactive six-tone theater — shape labels, ruby Jyutping, real TTS on tap. */
export function ToneTheater() {
  const reduce = useReducedMotion()
  const speakManual = useYueStore((s) => s.speakManual)
  const speakingText = useYueStore((s) => s.speakingText)
  const status = useYueStore((s) => s.status)
  const [active, setActive] = useState<ToneDef>(TONES[0]!)

  const playTone = useCallback(
    (tone: ToneDef) => {
      unlockTtsPlayback()
      setActive(tone)
      void speakManual(tone.han, 'yue')
    },
    [speakManual],
  )

  return (
    <div className="tone-theater">
      <p className="tone-theater-hint">
        <BiText copy={ui.tonesTap} size="sm" hideJp />
      </p>

      <div className="tone-theater-stage" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.n}
            className="tone-theater-focus"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: inkEase }}
          >
            <div className="tone-theater-num" aria-hidden="true">
              {active.n}
            </div>
            <div className="tone-theater-glyph">
              <ToneRuby han={active.han} jp={active.jp} size="lg" />
              <span className="tone-theater-meta">
                <span className="tone-theater-chao">{active.chao}</span>
                <span className="tone-theater-gloss">{active.meaningEn}</span>
                <SpeakButton text={active.han} lang="yue" className="tone-speak" />
              </span>
            </div>
            <div className="tone-theater-shape">
              <span className="tone-theater-shape-en">{active.shapeEn}</span>
              <span className="tone-theater-shape-zh" lang="zh-HK">
                {active.shapeZh}
              </span>
            </div>
            <ToneContour
              points={active.contour}
              active={!reduce || status === 'speaking'}
              speaking={status === 'speaking' && speakingText === active.han}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="tone-dial" role="tablist" aria-label={ui.navTones.en}>
        {TONES.map((tone) => {
          const on = tone.n === active.n
          const speaking = status === 'speaking' && speakingText === tone.han
          return (
            <button
              key={tone.n}
              type="button"
              role="tab"
              aria-selected={on}
              className={`tone-dial-btn${on ? ' is-active' : ''}${speaking ? ' is-speaking' : ''}`}
              onClick={() => playTone(tone)}
            >
              <span className="tone-dial-n">{tone.n}</span>
              <ToneRuby han={tone.han} jp={tone.jp} size="sm" />
              <span className="tone-dial-shape">{tone.shapeEn}</span>
              <ToneContour points={tone.contour} compact active={on && !reduce} speaking={speaking} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
