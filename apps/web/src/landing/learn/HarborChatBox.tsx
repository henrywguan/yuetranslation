import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useFloatingPanel } from '../../lib/useFloatingPanel'
import { inkEase } from '../../lib/motion'
import { HARBOR_CHAT_MAX_LEN, sanitizeChatText } from './harborPresence'

export type HarborChatLine = {
  id: string
  userId: string
  username: string
  text: string
  t: number
  self?: boolean
}

type Props = {
  lines: HarborChatLine[]
  /** Hide while NPC dialogue strip owns the bottom (Talk mode). */
  hidden?: boolean
  disabled?: boolean
  placeholder?: string
  onSend: (text: string) => void
}

type ChatGeom = {
  x: number
  y: number
  w: number
  h: number
  minimized: boolean
}

const PANEL_KEY = 'yue-harbor-chat-panel-v1'
const EDGE_Y_KEY = 'yue-harbor-chat-edge-y-v1'

function defaultGeom(): ChatGeom {
  if (typeof window === 'undefined') {
    return { x: 24, y: 120, w: 300, h: 280, minimized: false }
  }
  const w = 300
  const h = Math.min(320, window.innerHeight - 160)
  return {
    x: 20,
    y: Math.max(72, window.innerHeight - h - 96),
    w,
    h,
    minimized: false,
  }
}

function loadEdgeY(): number {
  try {
    const n = Number(localStorage.getItem(EDGE_Y_KEY))
    return Number.isFinite(n) ? Math.min(78, Math.max(18, n)) : 42
  } catch {
    return 42
  }
}

/**
 * Public chat as a History-style expandable drawer.
 * Mobile: slim right-edge tab (vertically draggable) → slide-over drawer.
 * Desktop: floating draggable / resizable rail; collapse returns the edge tab.
 * Enter opens + focuses; Esc blurs / closes so WASD / tap-to-move stay free.
 */
export function HarborChatBox({
  lines,
  hidden,
  disabled,
  placeholder = 'Press Enter to chat…',
  onSend,
}: Props) {
  const [draft, setDraft] = useState('')
  const [focused, setFocused] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [edgeY, setEdgeY] = useState(loadEdgeY)
  const edgeYRef = useRef(edgeY)
  edgeYRef.current = edgeY
  const inputRef = useRef<HTMLInputElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const { geom, persist, desktop, onDragPointerDown } = useFloatingPanel<ChatGeom>({
    storageKey: PANEL_KEY,
    minW: 240,
    minH: 180,
    defaultGeom,
  })

  const expandedDesktop = desktop && !geom.minimized
  const showEdgeTab = !hidden && !drawerOpen && !expandedDesktop
  const count = lines.length

  useEffect(() => {
    const el = logRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [lines, drawerOpen, expandedDesktop])

  useEffect(() => {
    if (hidden) setDrawerOpen(false)
  }, [hidden])

  useEffect(() => {
    if (!drawerOpen) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const focusInput = () => {
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }

  const openChat = () => {
    if (desktop) {
      persist({ ...geom, minimized: false })
    } else {
      setDrawerOpen(true)
    }
    focusInput()
  }

  useEffect(() => {
    if (hidden || disabled) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement | null)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
          return
        }
        e.preventDefault()
        openChat()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hidden, disabled, desktop, geom, persist])

  if (hidden) return null

  /** iOS/Android leave the fixed game shell scrolled after the soft keyboard. */
  const snapViewport = () => {
    try {
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    } catch {
      /* ignore */
    }
  }

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const cleaned = sanitizeChatText(draft)
    if (!cleaned || disabled) return
    onSend(cleaned)
    setDraft('')
    // Dismiss keyboard *after* send so overhead say paints while layout is stable,
    // then reveal the sailor (and free WASD / tap-to-move).
    inputRef.current?.blur()
    snapViewport()
  }

  const onInputKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setDraft('')
      inputRef.current?.blur()
      snapViewport()
      if (drawerOpen) setDrawerOpen(false)
    }
  }

  const onEdgePointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    const startY = e.clientY
    const startPct = edgeY
    let dragged = false
    const onMove = (ev: PointerEvent) => {
      const dy = ev.clientY - startY
      if (Math.abs(dy) > 8) dragged = true
      if (!dragged) return
      const next = Math.min(78, Math.max(18, startPct + (dy / window.innerHeight) * 100))
      edgeYRef.current = next
      setEdgeY(next)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      if (dragged) {
        try {
          localStorage.setItem(EDGE_Y_KEY, String(edgeYRef.current))
        } catch {
          /* ignore */
        }
        return
      }
      openChat()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  const logAndForm = (
    <>
      <div className="hq-chat-log" ref={logRef} role="log" aria-live="polite">
        {lines.length === 0 ? (
          <p className="hq-chat-empty">Say hello to sailors on the river…</p>
        ) : (
          lines.map((line) => (
            <p key={line.id} className={`hq-chat-line${line.self ? ' is-self' : ''}`}>
              <span className="hq-chat-user">{line.username}</span>
              <span className="hq-chat-sep">: </span>
              <span className="hq-chat-text">{line.text}</span>
            </p>
          ))
        )}
      </div>
      <form className="hq-chat-form" onSubmit={submit}>
        <input
          ref={inputRef}
          className="hq-chat-input"
          type="text"
          value={draft}
          maxLength={HARBOR_CHAT_MAX_LEN}
          disabled={disabled}
          placeholder={disabled ? 'Sign in to chat with other sailors' : placeholder}
          aria-label="Chat message"
          autoComplete="off"
          enterKeyHint="send"
          spellCheck
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false)
            snapViewport()
          }}
          onKeyDown={onInputKey}
        />
        <button
          type="submit"
          className="hq-chat-send"
          disabled={disabled || !draft.trim()}
          onPointerDown={(e) => {
            // Keep the input focused until submit runs. On mobile, blurring first
            // dismisses the keyboard, shifts the dock, and the click misses Say —
            // the tap falls through to the world canvas (no overhead / feels frozen).
            if (e.button === 0) e.preventDefault()
          }}
        >
          Say
        </button>
      </form>
    </>
  )

  return (
    <>
      {showEdgeTab ? (
        <button
          type="button"
          className="hq-chat-edge-tab"
          style={{ top: `${edgeY}%` }}
          onPointerDown={onEdgePointerDown}
          aria-haspopup="dialog"
          aria-expanded={drawerOpen || expandedDesktop}
          aria-controls={titleId}
          aria-label="Public chat"
        >
          <span className="hq-chat-edge-tab-label">Chat</span>
          {count ? <span className="hq-chat-edge-tab-count">{count > 99 ? '99+' : count}</span> : null}
          <span className="hq-chat-edge-tab-chevron" aria-hidden="true">
            ‹
          </span>
        </button>
      ) : null}

      {expandedDesktop ? (
        <aside
          className={`hq-chat hq-chat-rail${focused ? ' is-focused' : ''}`}
          aria-labelledby={titleId}
          style={{ left: geom.x, top: geom.y, width: geom.w, height: geom.h }}
        >
          <header
            className="hq-chat-rail-chrome"
            onPointerDown={(e) => onDragPointerDown(e, 'move')}
          >
            <h2 id={titleId} className="hq-chat-title">
              Chat
              {count ? <span className="hq-chat-count">{count}</span> : null}
            </h2>
            <button
              type="button"
              className="hq-chat-rail-collapse"
              onClick={() => persist({ ...geom, minimized: true })}
              aria-label="Collapse chat"
              title="Collapse chat"
            >
              –
            </button>
          </header>
          {logAndForm}
          <div
            className="hq-chat-resize-handle"
            aria-hidden="true"
            onPointerDown={(e) => onDragPointerDown(e, 'resize')}
          />
        </aside>
      ) : null}

      <AnimatePresence>
        {drawerOpen ? (
          <>
            <motion.div
              key="hq-chat-drawer-backdrop"
              className="hq-chat-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              key="hq-chat-drawer"
              className={`hq-chat hq-chat-drawer${focused ? ' is-focused' : ''}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.28, ease: inkEase }}
            >
              <header className="hq-chat-drawer-header">
                <h2 id={titleId} className="hq-chat-title">
                  Chat
                  {count ? <span className="hq-chat-count">{count}</span> : null}
                </h2>
                <button
                  ref={closeRef}
                  type="button"
                  className="hq-chat-drawer-close"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Collapse chat"
                  title="Collapse chat"
                >
                  ›
                </button>
              </header>
              {logAndForm}
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  )
}
