import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useYueStore } from '../lib/store'

type Dot = {
  left: string
  top: string
  size: number
  delay: number
  pull: number
}

const DOTS: Dot[] = [
  { left: '6%', top: '38%', size: 6, delay: 0, pull: 0.1 },
  { left: '17%', top: '18%', size: 4, delay: 0.45, pull: 0.14 },
  { left: '29%', top: '48%', size: 5, delay: 1.1, pull: 0.1 },
  { left: '42%', top: '12%', size: 3.6, delay: 0.2, pull: 0.16 },
  { left: '55%', top: '36%', size: 6.2, delay: 0.85, pull: 0.09 },
  { left: '67%', top: '8%', size: 3.2, delay: 1.4, pull: 0.18 },
  { left: '79%', top: '42%', size: 5, delay: 0.55, pull: 0.12 },
  { left: '91%', top: '16%', size: 4, delay: 1.7, pull: 0.15 },
]

function useSpeechEnergy() {
  const live = useYueStore((s) => s.live)
  const status = useYueStore((s) => s.status)
  const enInterim = useYueStore((s) => s.enInterim)
  const yueInterim = useYueStore((s) => s.yueInterim)
  const enTranslation = useYueStore((s) => s.enTranslation)
  const yueTranslation = useYueStore((s) => s.yueTranslation)
  const [energy, setEnergy] = useState(0)
  const [settle, setSettle] = useState(false)

  useEffect(() => {
    if (!live) {
      setEnergy(0)
      return
    }
    const len = enInterim.length + yueInterim.length
    setEnergy((e) => Math.min(1, e + 0.2 + Math.min(len, 48) * 0.006))
  }, [enInterim, yueInterim, live])

  useEffect(() => {
    if (!live) return
    const id = window.setInterval(() => {
      setEnergy((e) => e * 0.84)
    }, 140)
    return () => window.clearInterval(id)
  }, [live])

  useEffect(() => {
    if (!live || (!enTranslation && !yueTranslation)) return
    setSettle(true)
    const t = window.setTimeout(() => setSettle(false), 380)
    return () => window.clearTimeout(t)
  }, [enTranslation, yueTranslation, live])

  return { energy, settle, live, status }
}

export function DockConstellation({
  pointerX = 0.5,
}: {
  pointerX?: number
}) {
  const reduce = useReducedMotion()
  const { energy, settle, live, status } = useSpeechEnergy()

  if (reduce) return null

  const listening = live && status !== 'speaking'
  const drift = listening ? 3.2 + energy * 5 : 5
  const period = listening ? 1.7 - energy * 0.45 : 4.4

  return (
    <div className="dock-constellation" aria-hidden="true">
      {DOTS.map((dot, i) => {
        const toward = (pointerX - 0.5) * 10 * dot.pull
        const gather = live ? (0.5 - parseFloat(dot.left) / 100) * (6 + energy * 10) : 0
        return (
          <motion.span
            key={i}
            className="dock-dot"
            style={{ left: dot.left, top: dot.top, width: dot.size, height: dot.size }}
            animate={{
              x: settle ? 0 : toward + gather,
              y: settle ? 8 : [0, -drift, 0],
              scale: settle ? 0.62 : listening ? 1 + energy * 0.55 : 1,
              opacity: settle ? 0.14 : listening ? 0.62 + energy * 0.38 : 0.52,
            }}
            transition={{
              x: { duration: 0.45, ease: 'easeOut' },
              y: { duration: period, repeat: Infinity, ease: 'easeInOut', delay: dot.delay },
              scale: { duration: 0.28 },
              opacity: { duration: 0.28 },
            }}
          />
        )
      })}
    </div>
  )
}
