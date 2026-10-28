import { useEffect, useId, useRef, useState } from 'react'
import { DeepSeekMark } from '../components/DeepSeekMark'
import { IosHomescreenTip } from '../components/IosHomescreenGuide'
import { PwaInstallButton } from '../components/PwaInstallButton'
import { streamDeepseekChat } from '../lib/api'
import {
  apiMessagesFromThread,
  appendChatMessage,
  deleteChatThread,
  emptyThread,
  patchAssistantContent,
  readChatThreads,
  upsertChatThread,
  type ChatMessage,
  type ChatSource,
  type ChatThread,
} from '../lib/chatHistory'
import { openAuthScreen } from '../lib/auth'
import { renderChatMarkdown } from '../lib/renderChatMarkdown'
import { openApp, openPricing } from '../lib/siteLinks'
import { useYueStore } from '../lib/store'
import { useAppViewportLock } from '../lib/useAppViewportLock'
import { useDocumentMeta } from '../lib/useDocumentMeta'
import './ChatPage.css'

const SUGGESTIONS = [
  'Explain quantum computing simply',
  'Draft a polite follow-up email',
  'Give me a 3-day city trip outline',
  'Help me debug this error message',
]

const THINK_KEY = 'yue-deepseek-chat-deepthink-v1'
const SEARCH_KEY = 'yue-deepseek-chat-search-v1'

const MENU_ICON = (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path
      d="M5 7h14M5 12h14M5 17h14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
)

const BACK_ICON = (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path
      d="M15.2 5.2 8.4 12l6.8 6.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const SEND_ICON = (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path d="M12 4.5v11M7.5 10.5 12 15l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const STOP_ICON = (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" />
  </svg>
)

const PLUS_ICON = (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const CHEVRON_ICON = (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" className="ds-chat-reasoning-chevron">
    <path d="M8 10l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const BRAIN_ICON = (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <path
      d="M9.5 4.5a3 3 0 0 0-3 3v.4A3.5 3.5 0 0 0 4 11.2v1.1a3.5 3.5 0 0 0 2.2 3.25V17a3 3 0 0 0 3 3h.5M14.5 4.5a3 3 0 0 1 3 3v.4A3.5 3.5 0 0 1 20 11.2v1.1a3.5 3.5 0 0 1-2.2 3.25V17a3 3 0 0 1-3 3h-.5M12 4.5v15.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
)

const SEARCH_ICON = (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M16.2 16.2 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)

const COPY_ICON = (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <rect x="9" y="9" width="10" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
    <path
      d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
)

const REGEN_ICON = (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path
      d="M20 12a8 8 0 1 1-2.2-5.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
    <path d="M20 4v5h-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function canChat(entitlement: ReturnType<typeof useYueStore.getState>['entitlement']): boolean {
  if (!entitlement) return false
  if (entitlement.allowed?.chat) return true
  if (entitlement.isAdmin) return true
  return entitlement.plan === 'family' || entitlement.plan === 'business'
}

function readFlag(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key)
    if (v === '0') return false
    if (v === '1') return true
  } catch {
    /* ignore */
  }
  return fallback
}

function writeFlag(key: string, on: boolean) {
  try {
    localStorage.setItem(key, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

function formatThoughtSeconds(ms?: number): string {
  const sec = Math.max(1, Math.round((ms || 0) / 1000))
  return `Thought for ${sec} second${sec === 1 ? '' : 's'}`
}

function ReasoningPanel({
  reasoning,
  thoughtMs,
  streaming,
  thinkStartedAt,
  defaultOpen = true,
  autoCollapse = false,
}: {
  reasoning: string
  thoughtMs?: number
  streaming?: boolean
  thinkStartedAt?: number | null
  defaultOpen?: boolean
  /** Collapse after answer completes when the trace is long. */
  autoCollapse?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [liveMs, setLiveMs] = useState(0)
  const didAutoCollapse = useRef(false)

  useEffect(() => {
    if (!streaming || !thinkStartedAt) return
    const tick = () => setLiveMs(Date.now() - thinkStartedAt)
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [streaming, thinkStartedAt])

  useEffect(() => {
    if (streaming) {
      didAutoCollapse.current = false
      setOpen(true)
      return
    }
    if (autoCollapse && !didAutoCollapse.current && reasoning.length > 420) {
      didAutoCollapse.current = true
      setOpen(false)
    }
  }, [streaming, autoCollapse, reasoning.length])

  if (!reasoning.trim() && !streaming) return null

  const labelMs = streaming ? liveMs || thoughtMs : thoughtMs
  const header =
    streaming && !thoughtMs
      ? liveMs > 0
        ? formatThoughtSeconds(liveMs)
        : 'Thinking…'
      : formatThoughtSeconds(labelMs)

  return (
    <div className={`ds-chat-reasoning${streaming ? ' is-streaming' : ''}${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="ds-chat-reasoning-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span aria-hidden="true">{BRAIN_ICON}</span>
        <span className="ds-chat-reasoning-label">
          {header}
          {!open ? ' · tap to expand' : streaming ? '' : ' · tap to collapse'}
        </span>
        <span aria-hidden="true">{CHEVRON_ICON}</span>
      </button>
      <div className={`ds-chat-reasoning-panel${open ? ' is-open' : ''}`}>
        <pre className="ds-chat-reasoning-body">{reasoning || (streaming ? '…' : '')}</pre>
      </div>
    </div>
  )
}

function SourcesList({ sources }: { sources: ChatSource[] }) {
  if (!sources.length) return null
  return (
    <div className="ds-chat-sources">
      <div className="ds-chat-sources-label">Sources</div>
      <ol className="ds-chat-sources-list">
        {sources.map((s, i) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              <span className="ds-chat-source-index">{i + 1}</span>
              <span className="ds-chat-source-title">{s.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </div>
  )
}

function MessageActions({
  content,
  disabled,
  onRegenerate,
}: {
  content: string
  disabled?: boolean
  onRegenerate: () => void
}) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [])

  const copy = async () => {
    const text = content.trim()
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="ds-chat-actions">
      <button
        type="button"
        className={`ds-chat-action${copied ? ' is-copied' : ''}`}
        aria-label={copied ? 'Copied' : 'Copy'}
        title={copied ? 'Copied' : 'Copy'}
        disabled={!content.trim()}
        onClick={() => void copy()}
      >
        {COPY_ICON}
        <span className="ds-chat-action-label">{copied ? 'Copied' : 'Copy'}</span>
      </button>
      <button
        type="button"
        className="ds-chat-action"
        aria-label="Regenerate"
        title="Regenerate"
        disabled={disabled}
        onClick={onRegenerate}
      >
        {REGEN_ICON}
        <span className="ds-chat-action-label">Regenerate</span>
      </button>
    </div>
  )
}

function AssistantBody({
  message,
  streaming,
  thinking,
  searching,
  thinkStartedAt,
}: {
  message: ChatMessage
  streaming?: boolean
  thinking?: boolean
  searching?: boolean
  thinkStartedAt?: number | null
}) {
  const hasContent = Boolean(message.content)
  return (
    <>
      {(message.reasoning || (streaming && thinking)) && (
        <ReasoningPanel
          reasoning={message.reasoning || ''}
          thoughtMs={message.thoughtMs}
          streaming={streaming && thinking && !hasContent}
          thinkStartedAt={thinkStartedAt}
          defaultOpen
          autoCollapse={!streaming && hasContent}
        />
      )}
      <div className={`ds-chat-assistant-body${streaming && hasContent ? ' is-streaming' : ''}`}>
        {hasContent ? (
          renderChatMarkdown(message.content, { sources: message.sources })
        ) : streaming && searching && !thinking ? (
          <span className="ds-chat-thinking-line">Searching…</span>
        ) : streaming && thinking ? (
          <span className="ds-chat-thinking-line">Thinking…</span>
        ) : streaming ? (
          ''
        ) : (
          '…'
        )}
      </div>
      {!streaming && message.sources?.length ? <SourcesList sources={message.sources} /> : null}
    </>
  )
}

function TopBrand() {
  return (
    <div className="ds-chat-top-brand" aria-hidden="true">
      <DeepSeekMark className="ds-chat-top-brand-mark" />
      <span className="ds-chat-top-brand-name">
        Deep<span>Seek</span>
      </span>
    </div>
  )
}

/** Mobile-first DeepSeek-style general chat (`#/chat`) — Family/Business. */
export function ChatPage() {
  useAppViewportLock(true)
  useDocumentMeta({
    title: 'DeepSeek Chat — JyutTranslate',
    description: 'General AI chat powered by DeepSeek. Family and Business.',
    path: '/#/chat',
  })

  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      const height = window.visualViewport?.height ?? window.innerHeight
      root.style.setProperty('--ds-chat-vh', `${Math.round(height)}px`)
    }
    apply()
    window.visualViewport?.addEventListener('resize', apply)
    window.visualViewport?.addEventListener('scroll', apply)
    window.addEventListener('resize', apply)
    return () => {
      root.style.removeProperty('--ds-chat-vh')
      window.visualViewport?.removeEventListener('resize', apply)
      window.visualViewport?.removeEventListener('scroll', apply)
      window.removeEventListener('resize', apply)
    }
  }, [])

  const entitlement = useYueStore((s) => s.entitlement)
  const titleId = useId()
  const [threads, setThreads] = useState<ChatThread[]>(() => readChatThreads())
  const [activeId, setActiveId] = useState<string>(() => {
    const existing = readChatThreads()
    return existing[0]?.id || emptyThread().id
  })
  const [draft, setDraft] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [thinking, setThinking] = useState(false)
  const [searching, setSearching] = useState(false)
  const [deepThink, setDeepThink] = useState(() => readFlag(THINK_KEY, true))
  const [searchOn, setSearchOn] = useState(() => readFlag(SEARCH_KEY, false))
  const [thinkClock, setThinkClock] = useState<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const bootstrapped = useRef(false)
  const thinkStartedAt = useRef<number | null>(null)

  const active =
    threads.find((t) => t.id === activeId) ||
    (() => {
      const created = { ...emptyThread(), id: activeId }
      return created
    })()

  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true
    const existing = readChatThreads()
    if (existing.length) {
      setThreads(existing)
      setActiveId(existing[0]!.id)
      return
    }
    const created = emptyThread()
    setThreads([created])
    setActiveId(created.id)
    upsertChatThread(created)
  }, [])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [active.messages, streamingId, busy, thinking, searching])

  const unlocked = canChat(entitlement)
  const loggedIn = Boolean(entitlement?.loggedIn)

  const persist = (thread: ChatThread) => {
    setThreads(upsertChatThread(thread))
  }

  const startNewChat = () => {
    if (busy) return
    const created = emptyThread()
    setThreads(upsertChatThread(created))
    setActiveId(created.id)
    setDraft('')
    setError(null)
    setSidebarOpen(false)
  }

  const selectThread = (id: string) => {
    if (busy) return
    setActiveId(id)
    setError(null)
    setSidebarOpen(false)
  }

  const removeThread = (id: string) => {
    if (busy) return
    const next = deleteChatThread(id)
    if (!next.length) {
      const created = emptyThread()
      setThreads(upsertChatThread(created))
      setActiveId(created.id)
      return
    }
    setThreads(next)
    if (activeId === id) setActiveId(next[0]!.id)
  }

  const stopGeneration = () => {
    abortRef.current?.abort()
  }

  const runAssistant = async (baseThread: ChatThread) => {
    let thread = baseThread
    const assistantStep = appendChatMessage(thread, 'assistant', '')
    thread = assistantStep.thread
    const assistantId = assistantStep.message.id
    persist(thread)
    setStreamingId(assistantId)
    setThinking(false)
    setSearching(false)
    thinkStartedAt.current = null
    setThinkClock(null)

    const controller = new AbortController()
    abortRef.current = controller

    let assembled = ''
    let reasoning = ''
    let sources: ChatSource[] | undefined

    try {
      await streamDeepseekChat(apiMessagesFromThread(thread).filter((m) => m.content.trim()), {
        thinking: deepThink,
        search: searchOn,
        signal: controller.signal,
        onStatus: (status) => {
          if (status === 'searching') {
            setSearching(true)
            return
          }
          if (!thinkStartedAt.current) {
            thinkStartedAt.current = Date.now()
            setThinkClock(thinkStartedAt.current)
          }
          setThinking(true)
        },
        onReasoning: (delta) => {
          if (!thinkStartedAt.current) {
            thinkStartedAt.current = Date.now()
            setThinkClock(thinkStartedAt.current)
          }
          setThinking(true)
          reasoning += delta
          thread = patchAssistantContent(thread, assistantId, assembled, { reasoning })
          persist(thread)
        },
        onSources: (next) => {
          sources = next
          thread = patchAssistantContent(thread, assistantId, assembled, {
            reasoning: reasoning || undefined,
            sources,
          })
          persist(thread)
        },
        onDelta: (delta) => {
          if (assembled.length === 0) {
            setThinking(false)
            setSearching(false)
            const thoughtMs = thinkStartedAt.current ? Date.now() - thinkStartedAt.current : undefined
            assembled += delta
            thread = patchAssistantContent(thread, assistantId, assembled, {
              reasoning: reasoning || undefined,
              thoughtMs,
              sources,
            })
          } else {
            assembled += delta
            thread = patchAssistantContent(thread, assistantId, assembled)
          }
          persist(thread)
        },
      })
      if (!assembled.trim()) {
        thread = {
          ...thread,
          messages: thread.messages.filter((m) => m.id !== assistantId),
        }
        persist(thread)
        setError('No reply — try again.')
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        /* user stopped — keep partial reply if any */
        if (!assembled.trim()) {
          thread = {
            ...thread,
            messages: thread.messages.filter((m) => m.id !== assistantId),
          }
          persist(thread)
        }
      } else {
        const message = err instanceof Error ? err.message : 'Chat failed'
        setError(message)
        thread = {
          ...thread,
          messages: thread.messages.filter((m) => m.id !== assistantId || m.content.trim()),
        }
        persist(thread)
      }
    } finally {
      setStreamingId(null)
      setThinking(false)
      setSearching(false)
      setBusy(false)
      setThinkClock(null)
      abortRef.current = null
    }
  }

  const send = async (text: string) => {
    const content = text.trim()
    if (!content || busy) return
    if (!unlocked) {
      if (!loggedIn) openAuthScreen()
      else openPricing()
      return
    }

    setError(null)
    setDraft('')
    setBusy(true)

    let thread = active
    if (!threads.some((t) => t.id === thread.id)) {
      thread = { ...thread, id: activeId }
    }

    const userStep = appendChatMessage(thread, 'user', content)
    thread = userStep.thread
    persist(thread)
    setActiveId(thread.id)

    await runAssistant(thread)
  }

  const regenerate = async (assistantId: string) => {
    if (busy || !unlocked) return
    const idx = active.messages.findIndex((m) => m.id === assistantId)
    if (idx < 1) return
    const prev = active.messages[idx - 1]
    if (!prev || prev.role !== 'user') return

    setError(null)
    setBusy(true)
    const truncated: ChatThread = {
      ...active,
      messages: active.messages.slice(0, idx),
      updatedAt: Date.now(),
    }
    persist(truncated)
    setActiveId(truncated.id)
    await runAssistant(truncated)
  }

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const shellChrome = (
    <>
      {sidebarOpen ? (
        <button
          type="button"
          className="ds-chat-sidebar-backdrop"
          aria-label="Close history"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <aside className={`ds-chat-sidebar${sidebarOpen ? ' is-open' : ''}`} aria-label="Chat history">
        <div className="ds-chat-sidebar-brand">
          <DeepSeekMark className="ds-chat-sidebar-brand-mark" />
          <span className="ds-chat-sidebar-brand-name">
            Deep<span>Seek</span>
          </span>
        </div>
        <button type="button" className="ds-chat-new" onClick={startNewChat} disabled={busy}>
          <span aria-hidden="true">+</span> New chat
        </button>
        <ul className="ds-chat-thread-list">
          {threads.map((t) => (
            <li key={t.id} className="ds-chat-thread-item">
              <button
                type="button"
                className={`ds-chat-thread-btn${t.id === active.id ? ' is-active' : ''}`}
                onClick={() => selectThread(t.id)}
              >
                {t.title}
              </button>
              <button
                type="button"
                className="ds-chat-thread-del"
                aria-label={`Delete ${t.title}`}
                onClick={() => removeThread(t.id)}
                disabled={busy}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <div className="ds-chat-sidebar-foot">
          <button type="button" className="ds-chat-sidebar-link" onClick={() => openApp()}>
            Back to JyutTranslate
          </button>
        </div>
      </aside>
    </>
  )

  const topBar = (opts?: { showNew?: boolean }) => (
    <header className="ds-chat-top">
      <button
        type="button"
        className="ds-chat-icon-btn ds-chat-menu-btn"
        aria-label="Chat history"
        aria-expanded={sidebarOpen}
        onClick={() => setSidebarOpen((v) => !v)}
      >
        {MENU_ICON}
      </button>
      <button type="button" className="ds-chat-icon-btn" aria-label="Back to app" onClick={() => openApp()}>
        {BACK_ICON}
      </button>
      <TopBrand />
      <span className="ds-chat-top-spacer" />
      {opts?.showNew ? (
        <button
          type="button"
          className="ds-chat-icon-btn"
          aria-label="New chat"
          disabled={busy}
          onClick={startNewChat}
        >
          {PLUS_ICON}
        </button>
      ) : null}
      <PwaInstallButton />
    </header>
  )

  if (entitlement && !loggedIn) {
    return (
      <div className="ds-chat">
        {shellChrome}
        <div className="ds-chat-main">
          {topBar()}
          <div className="ds-chat-gate">
            <DeepSeekMark className="ds-chat-empty-mark" />
            <h1>Sign in to chat</h1>
            <p>DeepSeek Chat is available on Family and Business plans.</p>
            <button type="button" className="ds-chat-gate-cta" onClick={() => openAuthScreen()}>
              Sign in
            </button>
            <button type="button" className="ds-chat-gate-secondary" onClick={() => openApp()}>
              Back to app
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (entitlement && loggedIn && !unlocked) {
    return (
      <div className="ds-chat">
        {shellChrome}
        <div className="ds-chat-main">
          {topBar()}
          <div className="ds-chat-gate">
            <DeepSeekMark className="ds-chat-empty-mark" />
            <h1>Family or Business</h1>
            <p>Upgrade to unlock DeepSeek chat on the go.</p>
            <button type="button" className="ds-chat-gate-cta" onClick={() => openPricing()}>
              View plans
            </button>
            <button type="button" className="ds-chat-gate-secondary" onClick={() => openApp()}>
              Back to app
            </button>
          </div>
          <IosHomescreenTip />
        </div>
      </div>
    )
  }

  return (
    <div className="ds-chat">
      {shellChrome}

      <div className="ds-chat-main" aria-labelledby={titleId}>
        {topBar({ showNew: true })}

        <div className="ds-chat-messages" ref={listRef}>
          {!active.messages.length ? (
            <div className="ds-chat-empty">
              <DeepSeekMark className="ds-chat-empty-mark" />
              <h1 id={titleId}>
                Hi, I&apos;m <strong>DeepSeek</strong>.
              </h1>
              <p>How can I help you today?</p>
              <div className="ds-chat-suggestions">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    className="ds-chat-suggestion"
                    style={{ animationDelay: `${i * 40}ms` }}
                    disabled={busy}
                    onClick={() => void send(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="ds-chat-feed">
              {active.messages.map((m) =>
                m.role === 'user' ? (
                  <article key={m.id} className="ds-chat-msg is-user is-enter">
                    <div className="ds-chat-user-bubble">{m.content}</div>
                  </article>
                ) : (
                  <article key={m.id} className="ds-chat-msg is-assistant is-enter">
                    <div className="ds-chat-assistant-head">
                      <DeepSeekMark className="ds-chat-assistant-head-mark" />
                      <span>DeepSeek</span>
                    </div>
                    <AssistantBody
                      message={m}
                      streaming={streamingId === m.id}
                      thinking={streamingId === m.id && thinking}
                      searching={streamingId === m.id && searching}
                      thinkStartedAt={streamingId === m.id ? thinkClock : null}
                    />
                    {streamingId !== m.id && m.content.trim() ? (
                      <MessageActions
                        content={m.content}
                        disabled={busy}
                        onRegenerate={() => void regenerate(m.id)}
                      />
                    ) : null}
                  </article>
                ),
              )}
            </div>
          )}
        </div>

        <div className="ds-chat-composer-wrap">
          <form
            className="ds-chat-composer"
            onSubmit={(e) => {
              e.preventDefault()
              if (busy) return
              void send(draft)
            }}
          >
            <div className="ds-chat-toggles">
              <button
                type="button"
                className={`ds-chat-toggle${deepThink ? ' is-on' : ''}`}
                aria-pressed={deepThink}
                onClick={() => {
                  setDeepThink((v) => {
                    const next = !v
                    writeFlag(THINK_KEY, next)
                    return next
                  })
                }}
              >
                {BRAIN_ICON}
                DeepThink
              </button>
              <button
                type="button"
                className={`ds-chat-toggle${searchOn ? ' is-on' : ''}`}
                aria-pressed={searchOn}
                onClick={() => {
                  setSearchOn((v) => {
                    const next = !v
                    writeFlag(SEARCH_KEY, next)
                    return next
                  })
                }}
              >
                {SEARCH_ICON}
                Search
              </button>
            </div>
            <div className="ds-chat-composer-card">
              <textarea
                className="ds-chat-input"
                rows={1}
                value={draft}
                placeholder="Message DeepSeek"
                disabled={busy}
                onChange={(e) => {
                  setDraft(e.target.value)
                  const el = e.target
                  el.style.height = 'auto'
                  el.style.height = `${Math.min(el.scrollHeight, 136)}px`
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (!busy) void send(draft)
                  }
                }}
              />
              {busy ? (
                <button
                  type="button"
                  className="ds-chat-send is-stop"
                  aria-label="Stop generating"
                  onClick={stopGeneration}
                >
                  {STOP_ICON}
                </button>
              ) : (
                <button
                  type="submit"
                  className="ds-chat-send"
                  aria-label="Send"
                  disabled={!draft.trim()}
                >
                  {SEND_ICON}
                </button>
              )}
            </div>
            {error ? (
              <p className="ds-chat-error" role="alert">
                {error}
              </p>
            ) : null}
          </form>
        </div>
      </div>

      <IosHomescreenTip />
    </div>
  )
}
