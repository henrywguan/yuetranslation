import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, type SyntheticEvent } from 'react'
import { unlockHarborAudioBeds } from './harborAmbient'
import { inkEase } from '../../lib/motion'
import { useReducedMotion } from '../../lib/useReducedMotion'

type Props = {
  open: boolean
  onEnter: () => void
}

/** Higgsfield Cinema Studio 3.0 — first-person lantern canoe night. */
export const HARBOR_SPLASH_VIDEO_SRC = '/assets/harbor-quest/splash/lantern-canoe-fpov.mp4'
/** Still poster / reduced-motion fallback (FP canoe POV). */
export const HARBOR_SPLASH_POSTER_SRC = '/assets/harbor-quest/splash/lantern-canoe-fpov-b.png'

/**
 * First-person night river splash — cinematic canoe POV with thousands of
 * lanterns and a huge moon. Tap / Enter to sail in (unlocks Harbor audio).
 */
export function HarborSplash({ open, onEnter }: Props) {
  const reduce = useReducedMotion()
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const enter = useCallback(() => {
    // Sync resume + audible chirp + BGM/ambient rebuild must run inside this
    // gesture (iPhone). No await / void-Promise — helper is fully synchronous.
    unlockHarborAudioBeds({ theme: 'river' })
    onEnter()
  }, [onEnter])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault()
        enter()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, enter])

  useEffect(() => {
    if (!open || reduce) return
    const v = videoRef.current
    if (!v) return
    v.muted = true
    const play = () => {
      void v.play().catch(() => {
        /* autoplay blocked — poster still shows */
      })
    }
    play()
    return () => {
      try {
        v.pause()
      } catch {
        /* ignore */
      }
    }
  }, [open, reduce])

  const onVideoReady = (e: SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget
    v.muted = true
    if (!reduce && open) void v.play().catch(() => undefined)
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className={`hq-splash hq-splash--boat-night hq-splash--cinematic${reduce ? ' is-reduced' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label="Harbor Quest"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.02 }}
          transition={{ duration: reduce ? 0.2 : 0.9, ease: inkEase }}
          onClick={enter}
        >
          {reduce ? (
            <img
              className="hq-splash-cinematic hq-splash-cinematic--still"
              src={HARBOR_SPLASH_POSTER_SRC}
              alt=""
              aria-hidden="true"
              draggable={false}
            />
          ) : (
            <video
              ref={videoRef}
              className="hq-splash-cinematic"
              src={HARBOR_SPLASH_VIDEO_SRC}
              poster={HARBOR_SPLASH_POSTER_SRC}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-hidden="true"
              onLoadedData={onVideoReady}
            />
          )}

          <div className="hq-splash-vignette" aria-hidden="true" />

          <div className="hq-splash-inner">
            <motion.p
              className="hq-splash-brand"
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: reduce ? 0 : 0.2, ease: inkEase }}
            >
              <span className="hq-splash-brand-en">JyutTranslate</span>
              <span className="hq-splash-brand-dot" aria-hidden="true">
                ·
              </span>
              <span className="hq-splash-brand-zh" lang="zh-HK">
                粵譯
              </span>
            </motion.p>

            <motion.h1
              className="hq-splash-title"
              initial={reduce ? false : { opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.05, delay: reduce ? 0 : 0.4, ease: inkEase }}
            >
              Harbor Quest
            </motion.h1>

            <motion.p
              className="hq-splash-sub"
              lang="zh-HK"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, delay: reduce ? 0 : 0.7, ease: inkEase }}
            >
              港灣任務
            </motion.p>

            <motion.button
              type="button"
              className={`hq-splash-enter${reduce ? ' is-reduced' : ''}`}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: reduce ? 0 : 1.05, ease: inkEase }}
              onClick={(e) => {
                e.stopPropagation()
                enter()
              }}
            >
              Enter HarborQuest
            </motion.button>

            <p className="hq-splash-hint">Tap · Enter · Space</p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
