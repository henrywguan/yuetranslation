import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useState } from 'react'
import { BiText } from '../../components/BiText'
import { inkEase } from '../../lib/motion'
import { useReducedMotion } from '../../lib/useReducedMotion'
import { ui } from '../../lib/uiCopy'
import { humContour } from './humTone'
import { ToneContour } from './ToneContour'
import { TONES, type ToneDef } from './tonesData'

/** Interactive six-tone theater — pick a tone, watch the pitch draw, hum the shape. */
export function ToneTheater() {
  const reduce = useReducedMotion()
  const [active, setActive] = useState<ToneDef>(TONES[0]!)
  const [humming, setHumming] = useState(false)

  const select = useCallback(
    (tone: ToneDef) => {
      setActive(tone)
      if (reduce) return
      void humContour(tone.freqs).catch(() => {})
    },
    [reduce],
  )

  const hum = useCallback(async () => {
    if (humming) return
    setHumming(true)
    try {
      await humContour(active.freqs, 820)
    } catch {
      /* ignore autoplay / audio errors */
    } finally {
      window.setTimeout(() => setHumming(false), 200)
    }
  }, [active, humming])

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
            initial={reduce ? false : { opacity: 0, y: 18, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={reduce ? undefined : { opacity: 0, y: -12, filter: 'blur(4px)' }}
            transition={{ duration: 0.45, ease: inkEase }}
          >
            <div className="tone-theater-num" aria-hidden="true">
              {active.n}
            </div>
            <div className="tone-theater-glyph">
              <span className="tone-theater-han" lang="zh-HK">
                {active.han}
              </span>
              <span className="tone-theater-meta">
                <span className="tone-theater-jp">{active.jp}</span>
                <span className="tone-theater-chao">{active.chao}</span>
                <span className="tone-theater-gloss">{active.meaningEn}</span>
              </span>
            </div>
            <div className="tone-theater-shape">
              <span className="tone-theater-shape-en">{active.shapeEn}</span>
              <span className="tone-theater-shape-zh" lang="zh-HK">
                {active.shapeZh}
              </span>
            </div>
            <ToneContour points={active.contour} active={!reduce} />
          </motion.div>
        </AnimatePresence>
      </div>

      <button
        type="button"
        className={`tone-hum${humming ? ' is-on' : ''}`}
        onClick={() => void hum()}
        aria-pressed={humming}
      >
        <span className="tone-hum-wave" aria-hidden="true" />
        <BiText copy={ui.tonesHum} size="sm" hideJp />
      </button>

      <div className="tone-dial" role="tablist" aria-label={ui.navTones.en}>
        {TONES.map((tone) => {
          const on = tone.n === active.n
          return (
            <button
              key={tone.n}
              type="button"
              role="tab"
              aria-selected={on}
              className={`tone-dial-btn${on ? ' is-active' : ''}`}
              onClick={() => select(tone)}
            >
              <span className="tone-dial-n">{tone.n}</span>
              <span className="tone-dial-han" lang="zh-HK">
                {tone.han}
              </span>
              <ToneContour points={tone.contour} compact active={on && !reduce} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
