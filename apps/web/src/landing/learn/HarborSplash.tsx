import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, type CSSProperties } from 'react'
import { unlockHarborAudioBeds } from './harborAmbient'
import { inkEase } from '../../lib/motion'
import { useReducedMotion } from '../../lib/useReducedMotion'
import { HARBOR_GEAR_CATALOG, harborGearMeshInfo, type HarborGearItem } from './harborGear'

type Props = {
  open: boolean
  onEnter: () => void
}

type SplashLantern = {
  key: string
  item: HarborGearItem
  family: 'lantern-paper' | 'lantern-silk' | 'lantern-glass' | 'lantern-iron'
  /** 0 = horizon / moon, 1 = at the prow (nearest). */
  depthT: number
  /** −1 left bank … +1 right bank (perspective path hugs center). */
  lane: number
  size: number
  delay: number
  duration: number
  drift: number
  depth: 'far' | 'mid' | 'near'
}

function hexColor(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`
}

function lanternFamily(id: string): SplashLantern['family'] {
  const info = harborGearMeshInfo(
    HARBOR_GEAR_CATALOG.find((i) => i.id === id) ?? HARBOR_GEAR_CATALOG[0]!,
  )
  if (info.family === 'lantern-silk') return 'lantern-silk'
  if (info.family === 'lantern-glass') return 'lantern-glass'
  if (info.family === 'lantern-iron') return 'lantern-iron'
  return 'lantern-paper'
}

/**
 * Perspective lantern path down the river — near lanterns are large and close
 * to the gunwales; far ones shrink toward the moon.
 */
function buildSplashLanterns(): SplashLantern[] {
  const catalog = HARBOR_GEAR_CATALOG.filter((i) => i.slot === 'lantern')
  const rows: Array<{
    pick: number
    depthT: number
    lane: number
    size: number
    delay: number
    duration: number
    drift: number
    depth: SplashLantern['depth']
  }> = [
    // Far — beads converging under the moon
    { pick: 5, depthT: 0.06, lane: -0.1, size: 0.85, delay: 2.4, duration: 16, drift: 6, depth: 'far' },
    { pick: 8, depthT: 0.1, lane: 0.14, size: 0.8, delay: 3.1, duration: 17, drift: 7, depth: 'far' },
    { pick: 3, depthT: 0.14, lane: -0.2, size: 0.95, delay: 1.8, duration: 15, drift: 8, depth: 'far' },
    { pick: 11, depthT: 0.18, lane: 0.05, size: 0.9, delay: 2.8, duration: 18, drift: 6, depth: 'far' },
    // Mid path
    { pick: 1, depthT: 0.28, lane: -0.26, size: 1.55, delay: 1.2, duration: 13, drift: 10, depth: 'mid' },
    { pick: 6, depthT: 0.34, lane: 0.24, size: 1.7, delay: 0.6, duration: 12.5, drift: 9, depth: 'mid' },
    { pick: 4, depthT: 0.4, lane: -0.06, size: 1.9, delay: 0.9, duration: 11, drift: 8, depth: 'mid' },
    { pick: 7, depthT: 0.46, lane: 0.3, size: 2.05, delay: 1.5, duration: 12, drift: 10, depth: 'mid' },
    { pick: 2, depthT: 0.52, lane: -0.28, size: 2.25, delay: 0.4, duration: 10.5, drift: 8, depth: 'mid' },
    { pick: 9, depthT: 0.58, lane: 0.12, size: 2.4, delay: 1.1, duration: 11.5, drift: 7, depth: 'mid' },
    // Near — large glowing path into the cockpit
    { pick: 0, depthT: 0.66, lane: -0.22, size: 3.4, delay: 0.2, duration: 9.5, drift: 7, depth: 'near' },
    { pick: 10, depthT: 0.72, lane: 0.26, size: 3.6, delay: 0.7, duration: 10, drift: 8, depth: 'near' },
    { pick: 3, depthT: 0.78, lane: -0.04, size: 4.1, delay: 0.35, duration: 9, drift: 6, depth: 'near' },
    { pick: 4, depthT: 0.84, lane: 0.3, size: 3.9, delay: 1.0, duration: 9.8, drift: 7, depth: 'near' },
    { pick: 1, depthT: 0.88, lane: -0.32, size: 4.4, delay: 0.5, duration: 8.8, drift: 5, depth: 'near' },
    { pick: 6, depthT: 0.92, lane: 0.1, size: 4.8, delay: 0.15, duration: 8.5, drift: 5, depth: 'near' },
    { pick: 8, depthT: 0.96, lane: -0.16, size: 4.5, delay: 0.85, duration: 9.2, drift: 5, depth: 'near' },
    { pick: 2, depthT: 0.99, lane: 0.22, size: 5.2, delay: 0.25, duration: 8.2, drift: 4, depth: 'near' },
  ]
  return rows.map((row, i) => {
    const item = catalog[row.pick % catalog.length]!
    return {
      key: `${item.id}-${i}`,
      item,
      family: lanternFamily(item.id),
      depthT: row.depthT,
      lane: row.lane,
      size: row.size,
      delay: row.delay,
      duration: row.duration,
      drift: row.drift,
      depth: row.depth,
    }
  })
}

/** Map depth/lane → CSS % for a vanishing-point river path under the moon. */
function lanternStyle(L: SplashLantern): CSSProperties {
  const t = L.depthT
  // Horizon sits just under the moon (~34%); prow water ~82%
  const top = 34 + t * 48
  const center = 50
  const spread = 2.5 + t * 34
  const left = center + L.lane * spread
  return {
    left: `${left}%`,
    top: `${top}%`,
    ['--hq-lantern-size' as string]: `${L.size}rem`,
    ['--hq-lantern-fill' as string]: hexColor(L.item.color),
    ['--hq-lantern-glow' as string]: hexColor(L.item.accent ?? L.item.color),
    ['--hq-lantern-delay' as string]: `${L.delay}s`,
    ['--hq-lantern-dur' as string]: `${L.duration}s`,
    ['--hq-lantern-drift' as string]: `${L.drift}px`,
    ['--hq-lantern-z' as string]: String(10 + Math.round(t * 40)),
  }
}

/**
 * First-person night river splash — seated in the boat looking toward a huge
 * moon, lanterns lighting a glowing path on the water. Tap / Enter to sail in.
 */
export function HarborSplash({ open, onEnter }: Props) {
  const reduce = useReducedMotion()
  const lanterns = useMemo(() => buildSplashLanterns(), [])

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

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className={`hq-splash hq-splash--boat-night${reduce ? ' is-reduced' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label="Harbor Quest"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.02 }}
          transition={{ duration: reduce ? 0.2 : 0.9, ease: inkEase }}
          onClick={enter}
        >
          <div className="hq-splash-sky" aria-hidden="true" />
          <div className="hq-splash-stars" aria-hidden="true" />

          {/* Huge moon dead ahead */}
          <div className="hq-splash-moon" aria-hidden="true">
            <span className="hq-splash-moon-disc" />
            <span className="hq-splash-moon-halo" />
            <span className="hq-splash-moon-haze" />
          </div>

          {/* Soft distant banks — dark room edges of the world */}
          <div className="hq-splash-bank hq-splash-bank--left" aria-hidden="true" />
          <div className="hq-splash-bank hq-splash-bank--right" aria-hidden="true" />
          <div className="hq-splash-village hq-splash-village--far" aria-hidden="true">
            <span className="hq-splash-roof hq-splash-roof--a" />
            <span className="hq-splash-roof hq-splash-roof--b" />
            <span className="hq-splash-roof hq-splash-roof--d" />
            <span className="hq-splash-roof hq-splash-roof--e" />
            <span className="hq-splash-tower" />
            <span className="hq-splash-window hq-splash-window--1" />
            <span className="hq-splash-window hq-splash-window--2" />
            <span className="hq-splash-window hq-splash-window--4" />
            <span className="hq-splash-window hq-splash-window--5" />
          </div>

          <div className="hq-splash-smoke hq-splash-smoke--a" aria-hidden="true" />
          <div className="hq-splash-smoke hq-splash-smoke--b" aria-hidden="true" />
          <div className="hq-splash-mist hq-splash-mist--a" aria-hidden="true" />
          <div className="hq-splash-mist hq-splash-mist--b" aria-hidden="true" />

          {/* River plane — moonlight + lantern path reflections */}
          <div className="hq-splash-water" aria-hidden="true">
            <div className="hq-splash-moon-path" />
            <div className="hq-splash-lantern-path" />
            <div className="hq-splash-ripple hq-splash-ripple--a" />
            <div className="hq-splash-ripple hq-splash-ripple--b" />
          </div>

          <div className="hq-splash-lanterns" aria-hidden="true">
            {lanterns.map((L) => (
              <span
                key={L.key}
                className={`hq-splash-lantern hq-splash-lantern--${L.family} hq-splash-lantern--${L.depth}`}
                style={lanternStyle(L)}
                title={L.item.name.en}
              >
                <span className="hq-splash-lantern-glow" />
                <span className="hq-splash-lantern-body" />
                <span className="hq-splash-lantern-cap" />
                <span className="hq-splash-lantern-tassel" />
                <span className="hq-splash-lantern-wake" />
              </span>
            ))}
          </div>

          {/* First-person boat cockpit — dark timber room framing the view */}
          <div className="hq-splash-boat" aria-hidden="true">
            <span className="hq-splash-boat-canopy" />
            <span className="hq-splash-boat-gunwale hq-splash-boat-gunwale--left" />
            <span className="hq-splash-boat-gunwale hq-splash-boat-gunwale--right" />
            <span className="hq-splash-boat-prow" />
            <span className="hq-splash-boat-rib hq-splash-boat-rib--l" />
            <span className="hq-splash-boat-rib hq-splash-boat-rib--r" />
            <span className="hq-splash-boat-deck" />
          </div>

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
