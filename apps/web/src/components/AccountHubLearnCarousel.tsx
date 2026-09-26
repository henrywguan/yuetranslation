import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { HarborQuestAccountLaunch } from './HarborQuestAccountLaunch'
import { PracticePartnerAccountLaunch } from './PracticePartnerAccountLaunch'
import { biPlain, ui } from '../lib/uiCopy'
import './AccountHubLearnCarousel.css'

export type AccountHubLearnSlide = 'harbor' | 'partner'

const SLIDES: AccountHubLearnSlide[] = ['harbor', 'partner']
const STORAGE_KEY = 'yue-account-hub-learn-v1'
const SWIPE_PX = 36

type Props = {
  /** Close Account Hub before navigating. */
  onNavigate?: () => void
}

function readSlide(): AccountHubLearnSlide {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'partner' || v === 'harbor') return v
  } catch {
    /* ignore */
  }
  return 'harbor'
}

function writeSlide(slide: AccountHubLearnSlide) {
  try {
    localStorage.setItem(STORAGE_KEY, slide)
  } catch {
    /* ignore */
  }
}

function nextSlide(cur: AccountHubLearnSlide, dir: -1 | 1): AccountHubLearnSlide {
  const i = SLIDES.indexOf(cur)
  return SLIDES[(i + dir + SLIDES.length) % SLIDES.length]
}

/** Account Hub header: swipe or tap arrows to pick Harbor Quest / Practice Partner. */
export function AccountHubLearnCarousel({ onNavigate }: Props) {
  const [slide, setSlide] = useState<AccountHubLearnSlide>(readSlide)
  const [dir, setDir] = useState<1 | -1>(1)
  const pointerRef = useRef<{ id: number; x: number; y: number; swiped: boolean } | null>(null)
  const ignoreClickRef = useRef(false)

  const go = (nextDir: -1 | 1) => {
    setDir(nextDir < 0 ? -1 : 1)
    setSlide((cur) => {
      const next = nextSlide(cur, nextDir)
      writeSlide(next)
      return next
    })
  }

  const showHarbor = slide === 'harbor'
  const otherLabel = showHarbor
    ? biPlain(ui.practicePartnerShort)
    : biPlain(ui.harborQuestShort)

  return (
    <div
      className="account-hub-learn-carousel"
      role="group"
      aria-label={biPlain(ui.accountLearnCarousel)}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        if ((e.target as HTMLElement).closest('.account-hub-learn-arrow')) return
        pointerRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, swiped: false }
      }}
      onPointerMove={(e) => {
        const p = pointerRef.current
        if (!p || p.id !== e.pointerId || p.swiped) return
        const dx = e.clientX - p.x
        const dy = e.clientY - p.y
        if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) <= Math.abs(dy) * 1.15) return
        p.swiped = true
        ignoreClickRef.current = true
        go(dx < 0 ? 1 : -1)
      }}
      onPointerUp={() => {
        pointerRef.current = null
      }}
      onPointerCancel={() => {
        pointerRef.current = null
      }}
      onClickCapture={(e) => {
        if (!ignoreClickRef.current) return
        e.preventDefault()
        e.stopPropagation()
        ignoreClickRef.current = false
      }}
    >
      <button
        type="button"
        className="account-hub-learn-arrow"
        aria-label={`${biPlain(ui.accountLearnPrev)} · ${otherLabel}`}
        onClick={() => go(-1)}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path
            d="M10.2 3.2L5.4 8l4.8 4.8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className="account-hub-learn-viewport">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={slide}
            className="account-hub-learn-slide"
            initial={{ opacity: 0, x: dir * 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -18 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {showHarbor ? (
              <HarborQuestAccountLaunch onNavigate={onNavigate} />
            ) : (
              <PracticePartnerAccountLaunch onNavigate={onNavigate} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <button
        type="button"
        className="account-hub-learn-arrow"
        aria-label={`${biPlain(ui.accountLearnNext)} · ${otherLabel}`}
        onClick={() => go(1)}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path
            d="M5.8 3.2L10.6 8 5.8 12.8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  )
}
