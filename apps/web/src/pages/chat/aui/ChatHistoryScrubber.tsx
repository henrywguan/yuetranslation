/**
 * Slim vertical history scrubber on the message viewport — Cursor-like jump rail.
 */
import { useAuiState } from '@assistant-ui/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildScrubberTicks,
  scrubberActiveIndex,
  type ScrubberTick,
} from '../../../lib/chatSelectionChrome'

function messagePlainText(m: {
  content?: unknown
  parts?: ReadonlyArray<{ type?: string; text?: string }>
}): string {
  if (typeof m.content === 'string') return m.content
  if (Array.isArray(m.parts)) {
    return m.parts
      .filter((p) => p && (p.type === 'text' || typeof p.text === 'string'))
      .map((p) => p.text || '')
      .join(' ')
  }
  // assistant-ui ThreadMessage content is often an array of parts
  if (Array.isArray(m.content)) {
    return (m.content as Array<{ type?: string; text?: string }>)
      .filter((p) => p && typeof p.text === 'string')
      .map((p) => p.text || '')
      .join(' ')
  }
  return ''
}

function scrollToMessage(id: string) {
  const el = document.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(id)}"]`)
  el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

function viewportProgress(viewport: HTMLElement): number {
  const max = viewport.scrollHeight - viewport.clientHeight
  if (max <= 0) return 0
  return viewport.scrollTop / max
}

/** Right-edge tick rail — one tick per message; drag/click jumps. */
export function ChatHistoryScrubber() {
  const messages = useAuiState((s) => s.thread.messages)
  const ticks = useMemo(() => {
    const rows = messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: messagePlainText(m as { content?: unknown; parts?: ReadonlyArray<{ type?: string; text?: string }> }),
    }))
    return buildScrubberTicks(rows)
  }, [messages])

  const [active, setActive] = useState(0)
  const dragging = useRef(false)
  const railRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const viewport = document.querySelector<HTMLElement>('.aui-viewport')
    if (!viewport || !ticks.length) return

    const sync = () => {
      if (dragging.current) return
      // Prefer intersection: which message is nearest the upper third of the viewport.
      const mid = viewport.scrollTop + viewport.clientHeight * 0.28
      let best = 0
      let bestDist = Infinity
      for (let i = 0; i < ticks.length; i++) {
        const el = document.querySelector<HTMLElement>(
          `[data-message-id="${CSS.escape(ticks[i]!.id)}"]`,
        )
        if (!el) continue
        const top = el.offsetTop
        const dist = Math.abs(top - mid)
        if (dist < bestDist) {
          bestDist = dist
          best = i
        }
      }
      if (bestDist === Infinity) {
        setActive(scrubberActiveIndex(viewportProgress(viewport), ticks.length))
      } else {
        setActive(best)
      }
    }

    sync()
    viewport.addEventListener('scroll', sync, { passive: true })
    return () => viewport.removeEventListener('scroll', sync)
  }, [ticks])

  const jumpFromClientY = (clientY: number) => {
    const rail = railRef.current
    if (!rail || !ticks.length) return
    const rect = rail.getBoundingClientRect()
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / Math.max(1, rect.height)))
    const idx = scrubberActiveIndex(y, ticks.length)
    const tick = ticks[idx]
    if (!tick) return
    setActive(idx)
    scrollToMessage(tick.id)
  }

  if (ticks.length < 2) return null

  return (
    <div
      ref={railRef}
      className="aui-scrubber"
      role="slider"
      aria-label="Message history"
      aria-valuemin={0}
      aria-valuemax={ticks.length - 1}
      aria-valuenow={active}
      aria-valuetext={tickLabel(ticks[active])}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault()
          const next = Math.min(ticks.length - 1, active + 1)
          setActive(next)
          scrollToMessage(ticks[next]!.id)
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault()
          const next = Math.max(0, active - 1)
          setActive(next)
          scrollToMessage(ticks[next]!.id)
        }
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        dragging.current = true
        railRef.current?.setPointerCapture(e.pointerId)
        jumpFromClientY(e.clientY)
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return
        jumpFromClientY(e.clientY)
      }}
      onPointerUp={(e) => {
        dragging.current = false
        try {
          railRef.current?.releasePointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }
      }}
      onPointerCancel={() => {
        dragging.current = false
      }}
    >
      <div className="aui-scrubber-track" aria-hidden>
        {ticks.map((t, i) => (
          <button
            key={t.id}
            type="button"
            className={`aui-scrubber-tick is-${t.role}${i === active ? ' is-active' : ''}`}
            title={`${t.role}: ${t.snippet}`}
            aria-label={`${t.role}: ${t.snippet}`}
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation()
              setActive(i)
              scrollToMessage(t.id)
            }}
          />
        ))}
      </div>
    </div>
  )
}

function tickLabel(t: ScrubberTick | undefined): string {
  if (!t) return ''
  return `${t.role}: ${t.snippet}`
}
