import { useEffect, useRef, useState } from 'react'
import { BiText } from '../components/BiText'
import type { Bi } from '../lib/uiCopy'

type Step = { title: Bi; body: Bi }

/**
 * Aceternity Tracing Beam — vertical jade rail that fills as you scroll
 * the Creators copy-Jyutping steps. Harbor CSS only.
 */
export function CreatorsTraceTimeline({ steps }: { steps: Step[] }) {
  const rootRef = useRef<HTMLOListElement>(null)
  const [active, setActive] = useState(0)
  const [fill, setFill] = useState(0)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const measure = () => {
      const nodes = [...root.querySelectorAll<HTMLElement>('[data-trace-step]')]
      if (!nodes.length) return
      const mid = window.innerHeight * 0.42
      let best = 0
      let bestDist = Number.POSITIVE_INFINITY
      nodes.forEach((el, i) => {
        const r = el.getBoundingClientRect()
        const center = r.top + r.height / 2
        const dist = Math.abs(center - mid)
        if (dist < bestDist) {
          bestDist = dist
          best = i
        }
      })
      setActive(best)
      const first = nodes[0].getBoundingClientRect()
      const last = nodes[nodes.length - 1].getBoundingClientRect()
      const start = first.top + first.height / 2
      const end = last.top + last.height / 2
      const t = (mid - start) / Math.max(1, end - start)
      setFill(Math.min(1, Math.max(0, t)))
    }

    measure()
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [steps.length])

  return (
    <ol ref={rootRef} className="creators-trace">
      <span className="creators-trace-rail" aria-hidden="true">
        <span className="creators-trace-fill" style={{ height: `${fill * 100}%` }} />
      </span>
      {steps.map((step, i) => (
        <li
          key={step.title.en}
          data-trace-step
          className={`creators-trace-step${i <= active ? ' is-lit' : ''}${i === active ? ' is-active' : ''}`}
        >
          <span className="creators-trace-node" aria-hidden="true">
            {i + 1}
          </span>
          <div className="creators-trace-body">
            <h3 className="creators-h3">
              <BiText copy={step.title} size="md" />
            </h3>
            <p>
              <BiText copy={step.body} size="sm" hideJp />
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
