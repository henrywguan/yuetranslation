import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Full agent name for nested Inbox project rows: no ellipsis.
 * When the label overflows, runs a repeating horizontal ticker and keeps a
 * manual overflow scrollbar. Reduced-motion: static full text + scroll only.
 */
export function InboxTickerName({ children }: { children: ReactNode }) {
  const viewportRef = useRef<HTMLSpanElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const [overflowing, setOverflowing] = useState(false)

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const label = labelRef.current
    if (!viewport || !label) return

    const measure = () => {
      const next = label.scrollWidth > viewport.clientWidth + 1
      setOverflowing((prev) => (prev === next ? prev : next))
      if (next) {
        const pxPerSec = 28
        const duration = Math.max(8, label.scrollWidth / pxPerSec)
        viewport.style.setProperty('--inbox-ticker-duration', `${duration}s`)
      } else {
        viewport.style.removeProperty('--inbox-ticker-duration')
      }
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(viewport)
    ro.observe(label)
    return () => ro.disconnect()
  }, [children])

  return (
    <span
      ref={viewportRef}
      className={`inbox-agent-name-marquee${overflowing ? ' is-overflowing' : ''}`}
    >
      <span className="inbox-agent-name-track">
        <span ref={labelRef} className="inbox-agent-name-label">
          {children}
        </span>
        {overflowing ? (
          <span className="inbox-agent-name-label inbox-agent-name-label--dup" aria-hidden="true">
            {children}
          </span>
        ) : null}
      </span>
    </span>
  )
}
