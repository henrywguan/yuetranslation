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
  type ChatThread,
} from '../lib/chatHistory'
import { openAuthScreen } from '../lib/auth'
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

const BACK_ARROW = (
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

const SEND_ICON = (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path d="M4.5 19.5 20 12 4.5 4.5 4.5 11l9 1-9 1z" fill="currentColor" />
  </svg>
)

function canChat(entitlement: ReturnType<typeof useYueStore.getState>['entitlement']): boolean {
  if (!entitlement) return false
  if (entitlement.allowed?.chat) return true
  if (entitlement.isAdmin) return true
  return entitlement.plan === 'family' || entitlement.plan === 'business'
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
  const listRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const bootstrapped = useRef(false)

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
  }, [active.messages, streamingId, busy])

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

    let thread = active.messages.length || threads.some((t) => t.id === active.id)
      ? active
      : emptyThread()
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

    const controller = new AbortController()
    abortRef.current = controller

    let assembled = ''
    try {
      await streamDeepseekChat(
        apiMessagesFromThread(thread).filter((m) => m.content.trim()),
        (delta) => {
          if (assembled.length === 0) setThinking(false)
          assembled += delta
          thread = patchAssistantContent(thread, assistantId, assembled)
          persist(thread)
        },
        controller.signal,
        () => setThinking(true),
      )
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

  if (entitlement && !loggedIn) {
    return (
      <div className="ds-chat">
        <header className="ds-chat-bar">
          <button type="button" className="ds-chat-icon-btn" aria-label="Back" onClick={() => openApp()}>
            {BACK_ARROW}
          </button>
          <div className="ds-chat-brand">
            <DeepSeekMark className="ds-chat-brand-mark" />
            <div className="ds-chat-brand-text">
              <span className="ds-chat-brand-name">DeepSeek Chat</span>
            </div>
          </div>
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
    )
  }

  if (entitlement && loggedIn && !unlocked) {
    return (
      <div className="ds-chat">
        <header className="ds-chat-bar">
          <button type="button" className="ds-chat-icon-btn" aria-label="Back" onClick={() => openApp()}>
            {BACK_ARROW}
          </button>
          <div className="ds-chat-brand">
            <DeepSeekMark className="ds-chat-brand-mark" />
            <div className="ds-chat-brand-text">
              <span className="ds-chat-brand-name">DeepSeek Chat</span>
              <span className="ds-chat-brand-sub">Family+</span>
            </div>
          </div>
        </header>
        <div className="ds-chat-gate">
          <DeepSeekMark className="ds-chat-empty-mark" />
          <h1>Family or Business</h1>
          <p>Upgrade to unlock general DeepSeek chat on the go — separate from translation.</p>
          <button type="button" className="ds-chat-gate-cta" onClick={() => openPricing()}>
            View plans
          </button>
          <button type="button" className="ds-chat-gate-secondary" onClick={() => openApp()}>
            Back to app
          </button>
        </div>
        <IosHomescreenTip />
      </div>
    )
  }

  return (
    <div className="ds-chat">
      <header className="ds-chat-bar">
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
          {BACK_ARROW}
        </button>
        <div className="ds-chat-brand">
          <DeepSeekMark className="ds-chat-brand-mark" />
          <div className="ds-chat-brand-text">
            <span className="ds-chat-brand-name" id={titleId}>
              DeepSeek Chat
            </span>
            <span className="ds-chat-brand-sub">{active.title}</span>
          </div>
        </div>
        <div className="ds-chat-bar-actions">
          <PwaInstallButton />
          <button
            type="button"
            className="ds-chat-icon-btn"
            aria-label="New chat"
            disabled={busy}
            onClick={startNewChat}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path
                d="M12 5v14M5 12h14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </header>

      <div className="ds-chat-shell">
        {sidebarOpen ? (
          <button
            type="button"
            className="ds-chat-sidebar-backdrop"
            aria-label="Close history"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}
        <aside className={`ds-chat-sidebar${sidebarOpen ? ' is-open' : ''}`} aria-label="Chat history">
          <button type="button" className="ds-chat-new" onClick={startNewChat} disabled={busy}>
            + New chat
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
        </aside>

        <main className="ds-chat-main" aria-labelledby={titleId}>
          <div className="ds-chat-messages" ref={listRef}>
            {!active.messages.length ? (
              <div className="ds-chat-empty">
                <DeepSeekMark className="ds-chat-empty-mark" />
                <h2>How can I help?</h2>
                <p>General AI chat powered by DeepSeek. Ask anything — history stays on this device.</p>
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
              active.messages.map((m) => (
                <article
                  key={m.id}
                  className={`ds-chat-bubble is-${m.role}${streamingId === m.id ? ' is-streaming' : ''}`}
                >
                  <span className="ds-chat-bubble-role">{m.role === 'user' ? 'You' : 'DeepSeek'}</span>
                  <div className="ds-chat-bubble-body">
                    {m.content ||
                      (streamingId === m.id && thinking
                        ? 'Thinking…'
                        : streamingId === m.id
                          ? ''
                          : '…')}
                  </div>
                </article>
              ))
            )}
          </div>

          <form
            className="ds-chat-composer"
            onSubmit={(e) => {
              e.preventDefault()
              void send(draft)
            }}
          >
            <div className="ds-chat-composer-inner">
              <textarea
                className="ds-chat-input"
                rows={1}
                value={draft}
                placeholder="Message DeepSeek…"
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
        </main>
      </div>

      <IosHomescreenTip />
    </div>
  )
}
