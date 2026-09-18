import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, type CSSProperties } from 'react'
import { resumeSharedAudioContext } from '../../lib/audioReactive'
import { inkEase } from '../../lib/motion'
import { useReducedMotion } from '../../lib/useReducedMotion'
import { HARBOR_GEAR_CATALOG, harborGearMeshInfo, type HarborGearItem } from './harborGear'
import { playHarborUiClick } from './harborInteractSfx'

type Props = {
  open: boolean
  onEnter: () => void
}

type SplashLantern = {
  key: string
  item: HarborGearItem
  family: 'lantern-paper' | 'lantern-silk' | 'lantern-glass' | 'lantern-iron'
  left: string
  top: string
  size: number
  delay: number
  duration: number
  drift: number
  depth: 'far' | 'mid' | 'near'
}

function hexColor(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`
}

function lanternFamily(
  id: string,
): SplashLantern['family'] {
  const info = harborGearMeshInfo(
    HARBOR_GEAR_CATALOG.find((i) => i.id === id) ?? HARBOR_GEAR_CATALOG[0]!,
  )
  if (info.family === 'lantern-silk') return 'lantern-silk'
  if (info.family === 'lantern-glass') return 'lantern-glass'
  if (info.family === 'lantern-iron') return 'lantern-iron'
  return 'lantern-paper'
}

/** Seeded layout of in-game lanterns drifting across the title harbor. */
function buildSplashLanterns(): SplashLantern[] {
  const catalog = HARBOR_GEAR_CATALOG.filter((i) => i.slot === 'lantern')
  const layout: Array<Omit<SplashLantern, 'item' | 'family' | 'key'> & { pick: number }> = [
    { pick: 0, left: '6%', top: '58%', size: 0.72, delay: 0.2, duration: 11, drift: 18, depth: 'near' },
    { pick: 1, left: '14%', top: '42%', size: 0.48, delay: 1.1, duration: 13, drift: 22, depth: 'mid' },
    { pick: 2, left: '22%', top: '64%', size: 0.58, delay: 0.6, duration: 9.5, drift: 14, depth: 'near' },
    { pick: 3, left: '31%', top: '36%', size: 0.4, delay: 2.0, duration: 14, drift: 26, depth: 'far' },
    { pick: 4, left: '38%', top: '52%', size: 0.55, delay: 0.9, duration: 10.5, drift: 16, depth: 'mid' },
    { pick: 5, left: '46%', top: '28%', size: 0.36, delay: 2.8, duration: 15, drift: 30, depth: 'far' },
    { pick: 0, left: '54%', top: '60%', size: 0.62, delay: 1.4, duration: 12, drift: 15, depth: 'near' },
    { pick: 6, left: '62%', top: '40%', size: 0.5, delay: 0.4, duration: 11.5, drift: 20, depth: 'mid' },
    { pick: 7, left: '70%', top: '55%', size: 0.44, delay: 1.8, duration: 13.5, drift: 18, depth: 'mid' },
    { pick: 8, left: '78%', top: '33%', size: 0.38, delay: 2.4, duration: 14.5, drift: 24, depth: 'far' },
    { pick: 9, left: '86%', top: '48%', size: 0.66, delay: 0.7, duration: 10, drift: 17, depth: 'near' },
    { pick: 10, left: '92%', top: '62%', size: 0.42, delay: 1.6, duration: 12.5, drift: 19, depth: 'mid' },
    { pick: 11, left: '10%', top: '24%', size: 0.32, delay: 3.2, duration: 16, drift: 28, depth: 'far' },
    { pick: 3, left: '48%', top: '70%', size: 0.52, delay: 0.3, duration: 9, drift: 12, depth: 'near' },
    { pick: 4, left: '28%', top: '22%', size: 0.34, delay: 2.2, duration: 15.5, drift: 32, depth: 'far' },
    { pick: 1, left: '66%', top: '68%', size: 0.46, delay: 1.0, duration: 11, drift: 14, depth: 'near' },
    { pick: 8, left: '82%', top: '22%', size: 0.3, delay: 3.6, duration: 17, drift: 34, depth: 'far' },
    { pick: 6, left: '18%', top: '72%', size: 0.5, delay: 0.5, duration: 10.2, drift: 13, depth: 'near' },
    { pick: 9, left: '40%', top: '18%', size: 0.28, delay: 4.0, duration: 18, drift: 36, depth: 'far' },
    { pick: 2, left: '74%', top: '74%', size: 0.48, delay: 1.3, duration: 9.8, drift: 11, depth: 'near' },
    { pick: 5, left: '3%', top: '46%', size: 0.4, delay: 2.6, duration: 13, drift: 21, depth: 'mid' },
    { pick: 7, left: '58%', top: '16%', size: 0.33, delay: 3.1, duration: 16.5, drift: 29, depth: 'far' },
  ]
  return layout.map((row, i) => {
    const item = catalog[row.pick % catalog.length]!
    return {
      key: `${item.id}-${i}`,
      item,
      family: lanternFamily(item.id),
      left: row.left,
      top: row.top,
      size: row.size,
      delay: row.delay,
      duration: row.duration,
      drift: row.drift,
      depth: row.depth,
    }
  })
}

/**
 * Cinematic Harbor Quest title / splash — looping night river of floating
 * in-game lanterns, smoky fog, and low-light village silhouettes.
 * Tap / click / Enter / Space to sail in.
 */
export function HarborSplash({ open, onEnter }: Props) {
  const reduce = useReducedMotion()
  const lanterns = useMemo(() => buildSplashLanterns(), [])

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
          className={`hq-splash${reduce ? ' is-reduced' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label="Harbor Quest"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.015 }}
          transition={{ duration: reduce ? 0.2 : 0.85, ease: inkEase }}
          onClick={enter}
        >
          <div className="hq-splash-sky" aria-hidden="true" />
          <div className="hq-splash-stars" aria-hidden="true" />

          {/* Distant low-light villages behind fog */}
          <div className="hq-splash-village hq-splash-village--far" aria-hidden="true">
            <span className="hq-splash-roof hq-splash-roof--a" />
            <span className="hq-splash-roof hq-splash-roof--b" />
            <span className="hq-splash-roof hq-splash-roof--c" />
            <span className="hq-splash-roof hq-splash-roof--d" />
            <span className="hq-splash-roof hq-splash-roof--e" />
            <span className="hq-splash-tower" />
            <span className="hq-splash-window hq-splash-window--1" />
            <span className="hq-splash-window hq-splash-window--2" />
            <span className="hq-splash-window hq-splash-window--3" />
            <span className="hq-splash-window hq-splash-window--4" />
            <span className="hq-splash-window hq-splash-window--5" />
            <span className="hq-splash-window hq-splash-window--6" />
          </div>
          <div className="hq-splash-village hq-splash-village--near" aria-hidden="true">
            <span className="hq-splash-pier" />
            <span className="hq-splash-roof hq-splash-roof--f" />
            <span className="hq-splash-roof hq-splash-roof--g" />
            <span className="hq-splash-roof hq-splash-roof--h" />
            <span className="hq-splash-window hq-splash-window--7" />
            <span className="hq-splash-window hq-splash-window--8" />
            <span className="hq-splash-window hq-splash-window--9" />
          </div>

          <div className="hq-splash-smoke hq-splash-smoke--a" aria-hidden="true" />
          <div className="hq-splash-smoke hq-splash-smoke--b" aria-hidden="true" />
          <div className="hq-splash-smoke hq-splash-smoke--c" aria-hidden="true" />
          <div className="hq-splash-mist hq-splash-mist--a" aria-hidden="true" />
          <div className="hq-splash-mist hq-splash-mist--b" aria-hidden="true" />
          <div className="hq-splash-mist hq-splash-mist--c" aria-hidden="true" />

          <div className="hq-splash-water" aria-hidden="true">
            <div className="hq-splash-ripple hq-splash-ripple--a" />
            <div className="hq-splash-ripple hq-splash-ripple--b" />
          </div>

          <div className="hq-splash-lanterns" aria-hidden="true">
            {lanterns.map((L) => {
              const fill = hexColor(L.item.color)
              const glow = hexColor(L.item.accent ?? L.item.color)
              return (
                <span
                  key={L.key}
                  className={`hq-splash-lantern hq-splash-lantern--${L.family} hq-splash-lantern--${L.depth}`}
                  style={
                    {
                      left: L.left,
                      top: L.top,
                      ['--hq-lantern-size' as string]: `${L.size}rem`,
                      ['--hq-lantern-fill' as string]: fill,
                      ['--hq-lantern-glow' as string]: glow,
                      ['--hq-lantern-delay' as string]: `${L.delay}s`,
                      ['--hq-lantern-dur' as string]: `${L.duration}s`,
                      ['--hq-lantern-drift' as string]: `${L.drift}px`,
                    } as CSSProperties
                  }
                  title={L.item.name.en}
                >
                  <span className="hq-splash-lantern-glow" />
                  <span className="hq-splash-lantern-body" />
                  <span className="hq-splash-lantern-cap" />
                  <span className="hq-splash-lantern-tassel" />
                </span>
              )
            })}
          </div>

          <div className="hq-splash-vignette" aria-hidden="true" />

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
