import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect } from 'react'
import { resumeSharedAudioContext } from '../../lib/audioReactive'
import { inkEase } from '../../lib/motion'
import { useReducedMotion } from '../../lib/useReducedMotion'
import { playHarborUiClick } from './harborInteractSfx'

type Props = {
  open: boolean
  onEnter: () => void
}

/**
 * Cinematic Harbor Quest title / splash — full-bleed night harbor,
 * brand-led, slow-pulsing Enter cue. Tap / click / Enter / Space to sail in.
 */
export function HarborSplash({ open, onEnter }: Props) {
  const reduce = useReducedMotion()

  const enter = useCallback(() => {
    playHarborUiClick()
    void resumeSharedAudioContext()
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

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="hq-splash"
          role="dialog"
          aria-modal="true"
          aria-label="Harbor Quest"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.02 }}
          transition={{ duration: reduce ? 0.2 : 0.7, ease: inkEase }}
          onClick={enter}
        >
          <div className="hq-splash-sky" aria-hidden="true" />
          <div className="hq-splash-mist hq-splash-mist--a" aria-hidden="true" />
          <div className="hq-splash-mist hq-splash-mist--b" aria-hidden="true" />
          <div className="hq-splash-water" aria-hidden="true" />
          <div className="hq-splash-lanterns" aria-hidden="true">
            <span className="hq-splash-lantern hq-splash-lantern--1" />
            <span className="hq-splash-lantern hq-splash-lantern--2" />
            <span className="hq-splash-lantern hq-splash-lantern--3" />
          </div>

          <div className="hq-splash-inner">
            <motion.p
              className="hq-splash-brand"
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: reduce ? 0 : 0.15, ease: inkEase }}
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
              transition={{ duration: 1.05, delay: reduce ? 0 : 0.35, ease: inkEase }}
            >
              Harbor Quest
            </motion.h1>

            <motion.p
              className="hq-splash-sub"
              lang="zh-HK"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, delay: reduce ? 0 : 0.65, ease: inkEase }}
            >
              港灣任務
            </motion.p>

            <motion.button
              type="button"
              className={`hq-splash-enter${reduce ? ' is-reduced' : ''}`}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: reduce ? 0 : 1.0, ease: inkEase }}
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
