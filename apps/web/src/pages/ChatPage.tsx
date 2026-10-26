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

function canChat(entitlement: ReturnType<typeof useYueStore.getState>['entitlement']): boolean {
  if (!entitlement) return false
  if (entitlement.allowed?.chat) return true
  if (entitlement.isAdmin) return true
  return entitlement.plan === 'family' || entitlement.plan === 'business'
}

function readDeepThink(): boolean {
  try {
    const v = localStorage.getItem(THINK_KEY)
    if (v === '0') return false
    if (v === '1') return true
  } catch {
    /* ignore */
  }
  return true
}

function writeDeepThink(on: boolean) {
  try {
    localStorage.setItem(THINK_KEY, on ? '1' : '0')
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
  defaultOpen = true,
}: {
  reasoning: string
  thoughtMs?: number
  streaming?: boolean
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (!reasoning.trim() && !streaming) return null
  return (
    <div className="ds-chat-reasoning">
      <button
        type="button"
        className="ds-chat-reasoning-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span aria-hidden="true">{BRAIN_ICON}</span>
        <span>
          {streaming && !thoughtMs
            ? 'Thinking…'
            : `${formatThoughtSeconds(thoughtMs)}${open ? '' : ' · tap to expand'}`}
        </span>
      </button>
      {open ? <pre className="ds-chat-reasoning-body">{reasoning || (streaming ? '…' : '')}</pre> : null}
    </div>
  )
}

function AssistantBody({
  message,
  streaming,
  thinking,
}: {
  message: ChatMessage
  streaming?: boolean
  thinking?: boolean
}) {
  const showMd = Boolean(message.content) && !streaming
  return (
    <>
      {(message.reasoning || (streaming && thinking)) && (
        <ReasoningPanel
          reasoning={message.reasoning || ''}
          thoughtMs={message.thoughtMs}
          streaming={streaming && thinking && !message.content}
          defaultOpen
        />
      )}
      <div className={`ds-chat-assistant-body${streaming && message.content ? ' is-streaming' : ''}`}>
        {showMd ? (
          renderChatMarkdown(message.content)
        ) : message.content ? (
          message.content
        ) : streaming && thinking ? (
          <span className="ds-chat-thinking-line">Thinking…</span>
        ) : streaming ? (
          ''
        ) : (
          '…'
        )}
      </div>
    </>
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
  const [deepThink, setDeepThink] = useState(readDeepThink)
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
  }, [active.messages, streamingId, busy, thinking])

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

    const assistantStep = appendChatMessage(thread, 'assistant', '')
    thread = assistantStep.thread
    const assistantId = assistantStep.message.id
    persist(thread)
    setStreamingId(assistantId)
    setThinking(false)
    thinkStartedAt.current = null

    const controller = new AbortController()
    abortRef.current = controller

    let assembled = ''
    let reasoning = ''
    try {
      await streamDeepseekChat(apiMessagesFromThread(thread).filter((m) => m.content.trim()), {
        thinking: deepThink,
        signal: controller.signal,
        onStatus: () => {
          if (!thinkStartedAt.current) thinkStartedAt.current = Date.now()
          setThinking(true)
        },
        onReasoning: (delta) => {
          if (!thinkStartedAt.current) thinkStartedAt.current = Date.now()
          setThinking(true)
          reasoning += delta
          thread = patchAssistantContent(thread, assistantId, assembled, { reasoning })
          persist(thread)
        },
        onDelta: (delta) => {
          if (assembled.length === 0) {
            setThinking(false)
            const thoughtMs = thinkStartedAt.current ? Date.now() - thinkStartedAt.current : undefined
            assembled += delta
            thread = patchAssistantContent(thread, assistantId, assembled, {
              reasoning: reasoning || undefined,
              thoughtMs,
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
        /* ignore */
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
      setBusy(false)
      abortRef.current = null
    }
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
          <span className="ds-chat-sidebar-brand-name">DeepSeek</span>
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

  if (entitlement && !loggedIn) {
    return (
      <div className="ds-chat">
        {shellChrome}
        <div className="ds-chat-main">
          <header className="ds-chat-top">
            <button type="button" className="ds-chat-icon-btn ds-chat-menu-btn" aria-label="Menu" onClick={() => setSidebarOpen(true)}>
              {MENU_ICON}
            </button>
            <button type="button" className="ds-chat-icon-btn" aria-label="Back" onClick={() => openApp()}>
              {BACK_ICON}
            </button>
          </header>
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
          <header className="ds-chat-top">
            <button type="button" className="ds-chat-icon-btn ds-chat-menu-btn" aria-label="Menu" onClick={() => setSidebarOpen(true)}>
              {MENU_ICON}
            </button>
            <button type="button" className="ds-chat-icon-btn" aria-label="Back" onClick={() => openApp()}>
              {BACK_ICON}
            </button>
          </header>
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
          <span className="ds-chat-top-spacer" />
          <PwaInstallButton />
        </header>

        <div className="ds-chat-messages" ref={listRef}>
          {!active.messages.length ? (
            <div className="ds-chat-empty">
              <DeepSeekMark className="ds-chat-empty-mark" />
              <h1 id={titleId}>
                Hi, I&apos;m <strong>DeepSeek</strong>.
              </h1>
              <p>How can I help you today?</p>
              <div className="ds-chat-suggestions">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="ds-chat-suggestion"
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
                  <article key={m.id} className="ds-chat-msg is-user">
                    <div className="ds-chat-user-bubble">{m.content}</div>
                  </article>
                ) : (
                  <article key={m.id} className="ds-chat-msg is-assistant">
                    <div className="ds-chat-assistant-head">
                      <DeepSeekMark className="ds-chat-assistant-head-mark" />
                      <span>DeepSeek</span>
                    </div>
                    <AssistantBody
                      message={m}
                      streaming={streamingId === m.id}
                      thinking={streamingId === m.id && thinking}
                    />
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
                    writeDeepThink(next)
                    return next
                  })
                }}
              >
                {BRAIN_ICON}
                DeepThink
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
                    void send(draft)
                  }
                }}
              />
              <button
                type="submit"
                className="ds-chat-send"
                aria-label="Send"
                disabled={busy || !draft.trim()}
              >
                {SEND_ICON}
              </button>
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
