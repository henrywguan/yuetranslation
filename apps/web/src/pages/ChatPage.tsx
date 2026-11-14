import { useEffect, useId, useRef, useState } from 'react'
import { ChatDictateButton } from '../components/ChatDictateButton'
import {
  ChatArtifactPanel,
  ChatRelatedQuestions,
  ChatSkillMenu,
  ChatSourcesList,
  ChatThreadRow,
  ChatUserFiles,
} from '../components/ChatShellExtras'
import { DeepSeekMark } from '../components/DeepSeekMark'
import { IosHomescreenTip } from '../components/IosHomescreenGuide'
import { PwaInstallButton } from '../components/PwaInstallButton'
import { SpeakButton } from '../components/SpeakButton'
import {
  fetchDeepseekChatPlugins,
  streamDeepseekChat,
  uploadDeepseekChatFile,
  type DeepseekChatPlugin,
} from '../lib/api'
import { extractChatArtifacts, relatedQuestionsFromReply, type ChatArtifact } from '../lib/chatArtifacts'
import {
  consumeChatPrefill,
  consumeSharedThread,
  downloadTextFile,
  parseImportedThread,
  safeExportBasename,
  stashSharedThread,
  threadToJson,
  threadToMarkdown,
} from '../lib/chatExport'
import { chatSpeakLang } from '../lib/chatVoice'
import {
  apiMessagesFromThread,
  appendChatMessage,
  deleteChatThread,
  emptyThread,
  hydrateChatThreadsAsync,
  MAX_CONTENT_CHARS,
  patchAssistantContent,
  renameChatThread,
  searchChatThreads,
  setChatThreadArchived,
  setChatThreadPinned,
  upsertChatThread,
  type ChatFileMeta,
  type ChatMessage,
  type ChatSearchStep,
  type ChatSource,
  type ChatThread,
} from '../lib/chatHistory'
import {
  applyChatSkill,
  filterChatSkills,
  type ChatSkill,
} from '../lib/chatSkills'
import { openAuthScreen } from '../lib/auth'
import { canUseDeepseekChat } from '../lib/chatAccess'
import { renderChatMarkdown } from '../lib/renderChatMarkdown'
import { openApp, openPricing } from '../lib/siteLinks'
import { useYueStore } from '../lib/store'
import { useAppViewportLock } from '../lib/useAppViewportLock'
import { useDocumentMeta } from '../lib/useDocumentMeta'
import { safeShellViewportHeight } from '../lib/visualViewportHeight'
import './ChatPage.css'

type PendingChatFile = ChatFileMeta & { previewUrl?: string }

const SUGGESTIONS = [
  'Explain quantum computing simply',
  'Draft a polite follow-up email',
  'Give me a 3-day city trip outline',
  'Help me debug this error message',
]

const THINK_KEY = 'yue-deepseek-chat-deepthink-v1'
const SEARCH_KEY = 'yue-deepseek-chat-search-v1'
const PLUGINS_KEY = 'yue-deepseek-chat-plugins-v1'

function readPluginIds(): string[] | null {
  try {
    const raw = localStorage.getItem(PLUGINS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    return parsed.map(String).filter(Boolean).slice(0, 16)
  } catch {
    return null
  }
}

function writePluginIds(ids: string[]) {
  try {
    localStorage.setItem(PLUGINS_KEY, JSON.stringify(ids.slice(0, 16)))
  } catch {
    /* ignore */
  }
}

/** Stable empty list for the orphan-activeId fallback — a fresh `[]` each render
 *  would retrigger the messages scroll effect forever while entitlement hydrates. */
const EMPTY_MESSAGES: ChatMessage[] = []

/** First-paint placeholder so Suspense can drop "Loading chat…" before localStorage
 *  DeepThink history is parsed/rendered (large threads were freezing desktop Chrome). */
const BOOT_THREAD: ChatThread = {
  id: '__boot__',
  title: 'New chat',
  updatedAt: 0,
  messages: EMPTY_MESSAGES,
}

/** Cap DOM work on open — storage may keep more; older turns stay in localStorage. */
const MAX_RENDER_MESSAGES = 12
/** Paint this many messages per idle slice while leaving "Loading conversation…". */
const HYDRATE_BATCH = 2
const HYDRATE_GAP_MS = 48
/** Bound live DeepThink buffer mid-stream (full prune still runs on disk write). */
const LIVE_REASONING_KEEP = 24_000

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

  // While streaming, only paint the tail of the trace — a 50k+ <pre> rewrite every
  // paint still freezes the tab even with coalesced React updates.
  const liveReasoning =
    streaming && reasoning.length > 8_000 ? `…\n${reasoning.slice(-8_000)}` : reasoning

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
        {/* Keep collapsed traces out of the DOM — 40× long DeepThink <pre>s on open
         * blocked the main thread so Chrome only showed "Loading chat…" then killed the tab. */}
        {open || streaming ? (
          <pre className="ds-chat-reasoning-body">{liveReasoning || (streaming ? '…' : '')}</pre>
        ) : null}
      </div>
    </div>
  )
}

function SearchStepsList({ steps }: { steps: ChatSearchStep[] }) {
  if (!steps.length) return null
  return (
    <ul className="ds-chat-search-steps">
      {steps.map((step, i) => {
        const label =
          step.title ||
          step.queries?.join(' · ') ||
          step.url ||
          step.kind ||
          'Search'
        return (
          <li key={`${step.kind}-${i}`} className="ds-chat-search-step">
            <span className="ds-chat-search-step-kind">{step.kind}</span>
            {step.url ? (
              <a href={step.url} target="_blank" rel="noopener noreferrer">
                {label}
              </a>
            ) : (
              <span>{label}</span>
            )}
            {step.siteName ? <span className="ds-chat-search-step-site">{step.siteName}</span> : null}
          </li>
        )
      })}
    </ul>
  )
}

function MessageActions({
  content,
  disabled,
  onRegenerate,
  onEdit,
  onSearchReply,
  onOpenArtifacts,
}: {
  content: string
  disabled?: boolean
  onRegenerate?: () => void
  onEdit?: () => void
  onSearchReply?: () => void
  onOpenArtifacts?: () => void
}) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<number | null>(null)
  const speakLang = chatSpeakLang(content)

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
      <SpeakButton text={content} lang={speakLang} className="ds-chat-speak" warm={false} />
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
      {onRegenerate ? (
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
      ) : null}
      {onSearchReply ? (
        <button
          type="button"
          className="ds-chat-action"
          aria-label="Search this reply"
          title="Search this reply"
          disabled={disabled}
          onClick={onSearchReply}
        >
          {SEARCH_ICON}
          <span className="ds-chat-action-label">Search</span>
        </button>
      ) : null}
      {onOpenArtifacts ? (
        <button
          type="button"
          className="ds-chat-action"
          aria-label="Open artifacts"
          title="Open artifacts"
          onClick={onOpenArtifacts}
        >
          <span className="ds-chat-action-label">Artifacts</span>
        </button>
      ) : null}
      {onEdit ? (
        <button
          type="button"
          className="ds-chat-action"
          aria-label="Edit"
          title="Edit"
          disabled={disabled}
          onClick={onEdit}
        >
          <span className="ds-chat-action-label">Edit</span>
        </button>
      ) : null}
    </div>
  )
}

function AssistantBody({
  message,
  streaming,
  thinking,
  searching,
  thinkStartedAt,
  onOpenArtifact,
}: {
  message: ChatMessage
  streaming?: boolean
  thinking?: boolean
  searching?: boolean
  thinkStartedAt?: number | null
  onOpenArtifact?: (lang: string, source: string) => void
}) {
  const hasContent = Boolean(message.content)
  // Plain while streaming (per-token markdown remounts freeze DeepThink). After
  // settle, always promote — visible DOM is already capped (MAX_RENDER_MESSAGES),
  // so historical markdown on open stays cheap. Avoid startTransition+cancel
  // races that could leave settled replies stuck showing raw ## / **.
  const [rich, setRich] = useState(() => Boolean(hasContent && !streaming))
  useEffect(() => {
    if (streaming || !hasContent) {
      setRich(false)
      return
    }
    setRich(true)
  }, [streaming, hasContent, message.id])

  return (
    <>
      {(message.reasoning || (streaming && thinking) || message.searchSteps?.length) && (
        <ReasoningPanel
          reasoning={message.reasoning || ''}
          thoughtMs={message.thoughtMs}
          streaming={streaming && thinking && !hasContent}
          thinkStartedAt={thinkStartedAt}
          /* Historical traces stay collapsed; only the live thinking panel opens. */
          defaultOpen={Boolean(streaming && thinking && !hasContent)}
          /* Collapse the live panel once the answer arrives — never on historical rows. */
          autoCollapse={Boolean(streaming && hasContent)}
        />
      )}
      {message.searchSteps?.length ? <SearchStepsList steps={message.searchSteps} /> : null}
      <div className={`ds-chat-assistant-body${streaming && hasContent ? ' is-streaming' : ''}`}>
        {hasContent ? (
          streaming || !rich ? (
            <div className="ds-chat-plain">{message.content}</div>
          ) : (
            renderChatMarkdown(message.content, {
              sources: message.sources,
              onOpenArtifact,
            })
          )
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
      {!streaming && message.sources?.length ? <ChatSourcesList sources={message.sources} /> : null}
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
    // Account Hub is a createPortal → document.body layer (z-index 110–111).
    // Leaving #/app mid-AnimatePresence can leave orphan backdrop/shell nodes
    // that keep scrolling on top of chat; strip any leftovers on mount.
    window.scrollTo({ top: 0, left: 0 })
    document
      .querySelectorAll('.account-hub-backdrop, .account-hub-shell')
      .forEach((el) => el.remove())
  }, [])

  useEffect(() => {
    const root = document.documentElement
    let lastPx = ''
    const apply = () => {
      // Never write 0px — visualViewport can briefly report 0 after Account Hub.
      const height = safeShellViewportHeight()
      if (height == null) return
      const next = `${height}px`
      if (next === lastPx) return
      lastPx = next
      root.style.setProperty('--ds-chat-vh', next)
    }
    apply()
    const raf = window.requestAnimationFrame(apply)
    const t = window.setTimeout(apply, 120)
    // resize only — do not listen to visualViewport scroll (desktop hang risk).
    window.visualViewport?.addEventListener('resize', apply)
    window.addEventListener('resize', apply)
    return () => {
      window.cancelAnimationFrame(raf)
      window.clearTimeout(t)
      root.style.removeProperty('--ds-chat-vh')
      window.visualViewport?.removeEventListener('resize', apply)
      window.removeEventListener('resize', apply)
    }
  }, [])

  const entitlement = useYueStore((s) => s.entitlement)
  const titleId = useId()
  // Cheap first paint (replaces Suspense boot) — hydrate threads after mount.
  const [threads, setThreads] = useState<ChatThread[]>(() => [BOOT_THREAD])
  const [activeId, setActiveId] = useState<string>(BOOT_THREAD.id)
  const [historyReady, setHistoryReady] = useState(false)
  /** How many tail messages to mount — grown in batches so hydrate cannot lock the tab. */
  const [revealCount, setRevealCount] = useState(0)
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
  const [pendingFiles, setPendingFiles] = useState<PendingChatFile[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [sidebarQuery, setSidebarQuery] = useState('')
  const [artifact, setArtifact] = useState<ChatArtifact | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [shareNote, setShareNote] = useState<string | null>(null)
  const [pluginCatalog, setPluginCatalog] = useState<DeepseekChatPlugin[]>([])
  const [enabledPlugins, setEnabledPlugins] = useState<string[]>(() => readPluginIds() || ['image'])
  const [pluginsOpen, setPluginsOpen] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const thinkStartedAt = useRef<number | null>(null)
  const autoSpeak = useYueStore((s) => s.autoSpeak)
  const speakManual = useYueStore((s) => s.speakManual)

  const setDraftAndResize = (next: string) => {
    setDraft(next)
    requestAnimationFrame(() => {
      const el = inputRef.current
      if (!el) return
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 136)}px`
    })
  }
  /** Cancel pending HYDRATE_BATCH timers when switching threads / unmounting. */
  const revealTimersRef = useRef<number[]>([])
  const revealGenRef = useRef(0)

  const active =
    threads.find((t) => t.id === activeId) ||
    ({
      id: activeId,
      title: 'New chat',
      updatedAt: 0,
      messages: EMPTY_MESSAGES,
    } satisfies ChatThread)

  const revealCap = Math.min(MAX_RENDER_MESSAGES, Math.max(revealCount, 0))
  const visibleMessages = revealCap > 0 ? active.messages.slice(-revealCap) : EMPTY_MESSAGES

  const clearRevealTimers = () => {
    for (const id of revealTimersRef.current) window.clearTimeout(id)
    revealTimersRef.current = []
  }

  /** Same HYDRATE_BATCH / HYDRATE_GAP_MS cadence as open — avoid an instant 12-message mount. */
  const beginBatchedReveal = (messageCount: number) => {
    clearRevealTimers()
    const gen = ++revealGenRef.current
    const maxShow = Math.min(MAX_RENDER_MESSAGES, Math.max(0, messageCount))
    if (!maxShow) {
      setRevealCount(0)
      return
    }
    let shown = Math.min(HYDRATE_BATCH, maxShow)
    setRevealCount(shown)
    const grow = () => {
      if (gen !== revealGenRef.current || shown >= maxShow) return
      shown = Math.min(shown + HYDRATE_BATCH, maxShow)
      setRevealCount(shown)
      if (shown < maxShow) {
        revealTimersRef.current.push(window.setTimeout(grow, HYDRATE_GAP_MS))
      }
    }
    if (shown < maxShow) {
      revealTimersRef.current.push(window.setTimeout(grow, HYDRATE_GAP_MS))
    }
  }

  const stickMessagesToBottom = () => {
    const el = listRef.current
    if (!el) return
    // Instant jump — CSS `scroll-behavior: smooth` on this scroller made every
    // stream/hydration scrollTop write animate and compete with layout.
    const prev = el.style.scrollBehavior
    el.style.scrollBehavior = 'auto'
    el.scrollTop = el.scrollHeight
    el.style.scrollBehavior = prev
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const plugins = await fetchDeepseekChatPlugins()
        if (cancelled) return
        setPluginCatalog(plugins)
        const stored = readPluginIds()
        if (!stored) {
          const defaults = plugins.filter((p) => p.defaultEnabled && p.configured).map((p) => p.id)
          setEnabledPlugins(defaults.length ? defaults : ['image'])
          writePluginIds(defaults.length ? defaults : ['image'])
        }
      } catch {
        /* catalog optional — image still attempted server-side when configured */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      // Yielding hydrate — do not gate on a bootstrapped ref (Strict Mode would skip).
      const { threads: existing, clearedHeavy } = await hydrateChatThreadsAsync()
      if (cancelled) return

      if (clearedHeavy) {
        setError(
          'Previous chat history was too large and was cleared so DeepSeek Chat can open. Start a new chat.',
        )
      }

      const shared = consumeSharedThread()
      let list = existing
      if (shared) {
        list = upsertChatThread(shared, existing)
      }

      if (!list.length) {
        const created = emptyThread()
        setThreads([created])
        setActiveId(created.id)
        upsertChatThread(created, [created])
        setHistoryReady(true)
        beginBatchedReveal(0)
      } else {
        const head = shared || list[0]!
        setThreads(list)
        setActiveId(head.id)
        setHistoryReady(true)
        beginBatchedReveal(head.messages.length)
      }

      const prefill = consumeChatPrefill()
      if (prefill) setDraftAndResize(prefill)

      // Clear ?share=1 from the address bar after consuming.
      try {
        const url = new URL(window.location.href)
        if (url.searchParams.has('share')) {
          url.searchParams.delete('share')
          window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
        }
      } catch {
        /* ignore */
      }
    })()

    return () => {
      cancelled = true
      clearRevealTimers()
    }
  }, [])

  const lastMessageId = active.messages.at(-1)?.id
  useEffect(() => {
    stickMessagesToBottom()
  }, [activeId, active.messages.length, lastMessageId, streamingId, busy, thinking, searching])

  const unlocked = canUseDeepseekChat(entitlement)
  const loggedIn = Boolean(entitlement?.loggedIn)
  const canAutoSpeak = Boolean(entitlement?.allowed.autoSpeak)
  const skillSuggestions = filterChatSkills(draft)
  const visibleThreads = searchChatThreads(
    threads.filter((t) => t.id !== BOOT_THREAD.id),
    sidebarQuery,
  )

  /** Update React state only — no localStorage. Used for throttled stream paints. */
  const paintThread = (thread: ChatThread) => {
    setThreads((prev) => [thread, ...prev.filter((t) => t.id !== thread.id)])
  }

  /** Persist to disk + React (send start/end, errors — not every token). */
  const persist = (thread: ChatThread) => {
    setThreads((prev) => upsertChatThread(thread, prev))
  }

  const startNewChat = () => {
    if (busy) return
    clearRevealTimers()
    revealGenRef.current += 1
    const created = emptyThread()
    setThreads((prev) => upsertChatThread(created, prev))
    setActiveId(created.id)
    setRevealCount(0)
    setDraft('')
    setError(null)
    setSidebarOpen(false)
  }

  const selectThread = (id: string) => {
    if (busy) return
    setActiveId(id)
    const full = threads.find((t) => t.id === id)
    beginBatchedReveal(full?.messages.length || 0)
    setError(null)
    setSidebarOpen(false)
  }

  const removeThread = (id: string) => {
    if (busy) return
    // Pass in-memory threads — default readChatThreads() can race idle disk coalesce.
    const next = deleteChatThread(id, threads)
    if (!next.length) {
      const created = emptyThread()
      setThreads(upsertChatThread(created, [created]))
      setActiveId(created.id)
      beginBatchedReveal(0)
      return
    }
    setThreads(next)
    if (activeId === id) {
      setActiveId(next[0]!.id)
      beginBatchedReveal(next[0]!.messages.length)
    }
  }

  const stopGeneration = () => {
    abortRef.current?.abort()
  }

  const runAssistant = async (baseThread: ChatThread, fileIds?: string[]) => {
    let thread = baseThread
    const assistantStep = appendChatMessage(thread, 'assistant', '')
    thread = assistantStep.thread
    const assistantId = assistantStep.message.id
    persist(thread)
    setRevealCount((n) => Math.min(MAX_RENDER_MESSAGES, Math.max(n + 2, thread.messages.length)))
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
    let searchSteps: ChatSearchStep[] = []

    // Coalesce stream paints — never persist per token (idle disk write at end).
    let paintTimer: number | null = null
    let needsPaint = false
    const STREAM_PAINT_MS = 80
    const scrollAfterPaint = () => {
      window.requestAnimationFrame(stickMessagesToBottom)
    }
    const schedulePaint = () => {
      needsPaint = true
      if (paintTimer != null) return
      paintTimer = window.setTimeout(() => {
        paintTimer = null
        if (!needsPaint) return
        needsPaint = false
        paintThread(thread)
        scrollAfterPaint()
      }, STREAM_PAINT_MS)
    }
    const flushPaint = () => {
      if (paintTimer != null) {
        window.clearTimeout(paintTimer)
        paintTimer = null
      }
      needsPaint = false
      paintThread(thread)
      scrollAfterPaint()
    }
    const markThinking = () => {
      if (!thinkStartedAt.current) {
        thinkStartedAt.current = Date.now()
        setThinkClock(thinkStartedAt.current)
      }
      setThinking(true)
    }
    const dropEmptyAssistant = (t: ChatThread) => ({
      ...t,
      messages: t.messages.filter((m) => m.id !== assistantId),
    })

    try {
      await streamDeepseekChat(apiMessagesFromThread(thread).filter((m) => m.content.trim()), {
        thinking: deepThink,
        search: searchOn,
        fileIds,
        plugins: enabledPlugins,
        signal: controller.signal,
        onStatus: (status) => {
          if (status === 'searching') {
            setSearching(true)
            return
          }
          markThinking()
        },
        onReasoning: (delta) => {
          markThinking()
          reasoning += delta
          if (reasoning.length > LIVE_REASONING_KEEP) {
            reasoning = reasoning.slice(-LIVE_REASONING_KEEP)
          }
          thread = patchAssistantContent(thread, assistantId, assembled, { reasoning })
          schedulePaint()
        },
        onSources: (next) => {
          sources = next
          thread = patchAssistantContent(thread, assistantId, assembled, {
            reasoning: reasoning || undefined,
            sources,
            searchSteps: searchSteps.length ? searchSteps : undefined,
          })
          schedulePaint()
        },
        onSearchStep: (step) => {
          setSearching(true)
          searchSteps = [...searchSteps, step].slice(-24)
          thread = patchAssistantContent(thread, assistantId, assembled, {
            reasoning: reasoning || undefined,
            sources,
            searchSteps,
          })
          schedulePaint()
        },
        onTitle: (title) => {
          thread = renameChatThread(thread, title)
          schedulePaint()
        },
        onImage: (image) => {
          const md = `\n\n![${image.prompt.slice(0, 80)}](${image.url})`
          if (!assembled.includes(image.url)) {
            assembled = `${assembled}${md}`.slice(0, MAX_CONTENT_CHARS)
            thread = patchAssistantContent(thread, assistantId, assembled, {
              reasoning: reasoning || undefined,
              sources,
              searchSteps: searchSteps.length ? searchSteps : undefined,
            })
            schedulePaint()
          }
        },
        onDelta: (delta) => {
          const firstToken = assembled.length === 0
          if (firstToken) {
            setThinking(false)
            setSearching(false)
          }
          assembled += delta
          if (assembled.length > MAX_CONTENT_CHARS) {
            assembled = assembled.slice(0, MAX_CONTENT_CHARS)
          }
          thread = firstToken
            ? patchAssistantContent(thread, assistantId, assembled, {
                reasoning: reasoning || undefined,
                thoughtMs: thinkStartedAt.current ? Date.now() - thinkStartedAt.current : undefined,
                sources,
                searchSteps: searchSteps.length ? searchSteps : undefined,
              })
            : patchAssistantContent(thread, assistantId, assembled)
          schedulePaint()
        },
      })
      flushPaint()
      if (!assembled.trim()) {
        thread = dropEmptyAssistant(thread)
        persist(thread)
        setError('No reply — try again.')
      } else {
        persist(thread)
        if (canAutoSpeak && autoSpeak && assembled.trim()) {
          void speakManual(assembled.trim(), chatSpeakLang(assembled))
        }
      }
    } catch (err) {
      flushPaint()
      if ((err as Error)?.name === 'AbortError') {
        if (!assembled.trim()) thread = dropEmptyAssistant(thread)
        persist(thread)
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
      if (paintTimer != null) window.clearTimeout(paintTimer)
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
    if ((!content && !pendingFiles.length) || busy) return
    if (content.length > MAX_CONTENT_CHARS) {
      setError(`Message is too long (max ${MAX_CONTENT_CHARS.toLocaleString()} characters).`)
      return
    }
    if (!unlocked) {
      if (!loggedIn) openAuthScreen()
      else openPricing()
      return
    }

    const fileIds = pendingFiles.map((f) => f.fileId)
    const filesMeta: ChatFileMeta[] = pendingFiles.map(({ fileId, filename, mime }) => ({
      fileId,
      filename,
      mime,
    }))
    setError(null)
    setDraft('')
    setPendingFiles((prev) => {
      for (const f of prev) {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
      }
      return []
    })
    setBusy(true)

    let thread = active
    if (!threads.some((t) => t.id === thread.id)) {
      thread = { ...thread, id: activeId }
    }

    const userStep = appendChatMessage(thread, 'user', content || '(attached file)')
    thread = userStep.thread
    if (fileIds.length) {
      thread = {
        ...thread,
        messages: thread.messages.map((m) =>
          m.id === userStep.message.id ? { ...m, fileIds, files: filesMeta } : m,
        ),
      }
    }
    persist(thread)
    setActiveId(thread.id)
    setRevealCount((n) => Math.min(MAX_RENDER_MESSAGES, Math.max(n + 1, thread.messages.length)))

    await runAssistant(thread, fileIds)
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
    await runAssistant(truncated, prev.fileIds)
  }

  const editUserMessage = (userId: string) => {
    if (busy || !unlocked) return
    const idx = active.messages.findIndex((m) => m.id === userId)
    if (idx < 0) return
    const msg = active.messages[idx]
    if (!msg || msg.role !== 'user') return
    setDraftAndResize(msg.content)
    const restored =
      msg.files?.length
        ? msg.files.map((f) => ({ ...f }))
        : (msg.fileIds || []).map((fileId) => ({ fileId, filename: 'attachment' }))
    setPendingFiles(restored)
    const truncated: ChatThread = {
      ...active,
      messages: active.messages.slice(0, idx),
      updatedAt: Date.now(),
    }
    persist(truncated)
    setActiveId(truncated.id)
    inputRef.current?.focus()
  }

  const onPickFile = async (file: File | null) => {
    if (!file || busy || !unlocked) return
    if (pendingFiles.length >= 5) {
      setError('You can attach up to 5 files per message.')
      return
    }
    if (file.size > 6_000_000) {
      setError('File too large (max 6 MB).')
      return
    }
    setUploadingFile(true)
    setError(null)
    try {
      const uploaded = await uploadDeepseekChatFile(file)
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      setPendingFiles((prev) =>
        [
          ...prev,
          {
            fileId: uploaded.fileId,
            filename: uploaded.filename || file.name,
            mime: file.type || undefined,
            previewUrl,
          },
        ].slice(0, 5),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'File upload failed')
    } finally {
      setUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const openArtifactFromFence = (lang: string, source: string) => {
    const lower = lang.trim().toLowerCase()
    const kind =
      lower === 'mermaid'
        ? 'mermaid'
        : lower === 'html' || lower === 'htm'
          ? 'html'
          : lower === 'svg'
            ? 'svg'
            : 'code'
    setArtifact({
      id: `live-${Date.now()}`,
      kind,
      lang: lower || 'code',
      title: kind === 'mermaid' ? 'Diagram' : kind === 'code' ? lower || 'Code' : 'Preview',
      source,
    })
  }

  const searchThisReply = (content: string) => {
    const snippet = content.replace(/\s+/g, ' ').trim().slice(0, 220)
    writeFlag(SEARCH_KEY, true)
    setSearchOn(true)
    setDraftAndResize(`Search the web to verify and expand on this:\n\n${snippet}`)
    inputRef.current?.focus()
  }

  const patchThread = (next: ChatThread) => {
    setThreads((prev) => upsertChatThread(next, prev))
  }

  const copyConversation = async () => {
    try {
      await navigator.clipboard.writeText(threadToMarkdown(active))
      setShareNote('Conversation copied')
      window.setTimeout(() => setShareNote(null), 1600)
    } catch {
      setError('Could not copy conversation')
    }
  }

  const shareConversation = async () => {
    const url = stashSharedThread(active)
    try {
      await navigator.clipboard.writeText(url)
      setShareNote('Share link copied (this browser session)')
      window.setTimeout(() => setShareNote(null), 2200)
    } catch {
      setShareNote(url)
    }
  }

  const pickSkill = (skill: ChatSkill) => {
    setDraftAndResize(applyChatSkill(skill))
    inputRef.current?.focus()
  }

  const chatTurnsUsed = entitlement?.chatTurnsUsed
  const chatTurnsLimit = entitlement?.chatTurnsLimit
  const chatQuotaLabel =
    unlocked && typeof chatTurnsLimit === 'number' && chatTurnsLimit > 0
      ? `${Math.max(0, chatTurnsLimit - (chatTurnsUsed || 0)).toLocaleString()} chat turns left`
      : unlocked && chatTurnsLimit === 0
        ? 'Unlimited chat'
        : null

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
        <label className="ds-chat-sidebar-search">
          <input
            type="search"
            placeholder="Search chats"
            aria-label="Search chats"
            value={sidebarQuery}
            onChange={(e) => setSidebarQuery(e.target.value)}
          />
        </label>
        <ul className="ds-chat-thread-list">
          {visibleThreads.map((t) => (
            <ChatThreadRow
              key={t.id}
              thread={t}
              active={t.id === active.id}
              busy={busy}
              onSelect={() => selectThread(t.id)}
              onDelete={() => removeThread(t.id)}
              onRename={(title) => patchThread(renameChatThread(t, title))}
              onTogglePin={() => patchThread(setChatThreadPinned(t, !t.pinned))}
              onToggleArchive={() => patchThread(setChatThreadArchived(t, !t.archived))}
              onExportMd={() =>
                downloadTextFile(
                  `${safeExportBasename(t.title)}.md`,
                  threadToMarkdown(t),
                  'text/markdown;charset=utf-8',
                )
              }
              onExportJson={() =>
                downloadTextFile(
                  `${safeExportBasename(t.title)}.json`,
                  threadToJson(t),
                  'application/json;charset=utf-8',
                )
              }
            />
          ))}
        </ul>
        <div className="ds-chat-sidebar-foot">
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="ds-chat-file-input"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              try {
                const raw = await file.text()
                const imported = parseImportedThread(raw)
                if (!imported) {
                  setError('Could not import that chat JSON.')
                  return
                }
                setThreads((prev) => upsertChatThread(imported, prev))
                setActiveId(imported.id)
                beginBatchedReveal(imported.messages.length)
                setSidebarOpen(false)
              } catch {
                setError('Could not import that chat JSON.')
              } finally {
                e.target.value = ''
              }
            }}
          />
          <button
            type="button"
            className="ds-chat-sidebar-link"
            onClick={() => importInputRef.current?.click()}
          >
            Import JSON
          </button>
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
    <div
      className={`ds-chat${artifact ? ' has-artifact' : ''}${dragOver ? ' is-dragover' : ''}`}
      onDragEnter={(e) => {
        if (!unlocked || busy) return
        if ([...e.dataTransfer.types].includes('Files')) setDragOver(true)
      }}
      onDragOver={(e) => {
        if (![...e.dataTransfer.types].includes('Files')) return
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragOver(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files?.[0]
        if (file) void onPickFile(file)
      }}
      onPaste={(e) => {
        if (busy || !unlocked) return
        const items = e.clipboardData?.items
        if (!items) return
        for (const item of items) {
          if (item.kind === 'file' && item.type.startsWith('image/')) {
            const file = item.getAsFile()
            if (file) {
              e.preventDefault()
              void onPickFile(file)
            }
            break
          }
        }
      }}
    >
      {shellChrome}

      <div className="ds-chat-main" aria-labelledby={titleId}>
        {topBar({ showNew: true })}
        {active.messages.length ? (
          <div className="ds-chat-thread-bar">
            <button type="button" className="ds-chat-thread-bar-btn" disabled={busy} onClick={() => void copyConversation()}>
              Copy chat
            </button>
            <button type="button" className="ds-chat-thread-bar-btn" disabled={busy} onClick={() => void shareConversation()}>
              Share
            </button>
            {shareNote ? <span className="ds-chat-share-note">{shareNote}</span> : null}
          </div>
        ) : null}

        <div className="ds-chat-messages" ref={listRef}>
          {!historyReady ? (
            <div className="ds-chat-empty" aria-busy="true">
              <DeepSeekMark className="ds-chat-empty-mark" />
              <h1 id={titleId}>DeepSeek</h1>
              <p>Loading conversation…</p>
            </div>
          ) : !active.messages.length ? (
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
              {active.messages.length > visibleMessages.length ? (
                <p className="ds-chat-history-trim" role="note">
                  Showing last {visibleMessages.length} of {active.messages.length} messages
                </p>
              ) : null}
              {visibleMessages.map((m) => {
                const isLive = streamingId === m.id
                // Enter motion only for the in-flight turn — replaying is-enter on
                // every historical row fought layout when opening a long thread.
                const enter = isLive || (!streamingId && m.id === lastMessageId) ? ' is-enter' : ''
                const arts = m.role === 'assistant' ? extractChatArtifacts(m.content) : []
                return m.role === 'user' ? (
                  <article key={m.id} className={`ds-chat-msg is-user${enter}`}>
                    <div className="ds-chat-user-bubble">{m.content}</div>
                    {m.files?.length ? (
                      <ChatUserFiles files={m.files} />
                    ) : m.fileIds?.length ? (
                      <ChatUserFiles
                        files={m.fileIds.map((fileId) => ({ fileId, filename: 'attachment' }))}
                      />
                    ) : null}
                    {!busy ? (
                      <MessageActions
                        content={m.content}
                        disabled={busy}
                        onEdit={() => editUserMessage(m.id)}
                      />
                    ) : null}
                  </article>
                ) : (
                  <article key={m.id} className={`ds-chat-msg is-assistant${enter}`}>
                    <div className="ds-chat-assistant-head">
                      <DeepSeekMark className="ds-chat-assistant-head-mark" />
                      <span>DeepSeek</span>
                    </div>
                    <AssistantBody
                      message={m}
                      streaming={isLive}
                      thinking={isLive && thinking}
                      searching={isLive && searching}
                      thinkStartedAt={isLive ? thinkClock : null}
                      onOpenArtifact={openArtifactFromFence}
                    />
                    {!isLive && m.content.trim() ? (
                      <>
                        <MessageActions
                          content={m.content}
                          disabled={busy}
                          onRegenerate={() => void regenerate(m.id)}
                          onSearchReply={() => searchThisReply(m.content)}
                          onOpenArtifacts={
                            arts.length
                              ? () => setArtifact(arts[0]!)
                              : undefined
                          }
                        />
                        <ChatRelatedQuestions
                          questions={relatedQuestionsFromReply(m.content)}
                          disabled={busy}
                          onPick={(q) => void send(q)}
                        />
                      </>
                    ) : null}
                  </article>
                )
              })}
            </div>
          )}
        </div>

        <div className="ds-chat-composer-wrap">
          {dragOver ? <div className="ds-chat-drop-hint">Drop file to attach</div> : null}
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
                title="Search + DeepThink = deep thinking search"
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
              <button
                type="button"
                className={`ds-chat-toggle${pluginsOpen || enabledPlugins.length ? ' is-on' : ''}`}
                aria-pressed={pluginsOpen}
                title="Plugins — image generation & MCP"
                onClick={() => setPluginsOpen((v) => !v)}
              >
                Plugins
                {enabledPlugins.length ? ` · ${enabledPlugins.length}` : ''}
              </button>
              {chatQuotaLabel ? <span className="ds-chat-quota">{chatQuotaLabel}</span> : null}
            </div>
            {pluginsOpen ? (
              <ul className="ds-chat-plugins" aria-label="Chat plugins">
                {(pluginCatalog.length
                  ? pluginCatalog
                  : [
                      {
                        id: 'image',
                        name: 'Image generation',
                        description: 'OpenAI Images (set OPENAI_IMAGE_API_KEY on the API).',
                        kind: 'builtin' as const,
                        configured: true,
                        category: 'generation' as const,
                        status: 'ready' as const,
                      },
                      {
                        id: 'mcp:higgsfield',
                        name: 'Higgsfield',
                        description: 'Image, video, characters & audio (needs MCP token).',
                        kind: 'mcp' as const,
                        configured: false,
                        category: 'generation' as const,
                        status: 'needs_token' as const,
                      },
                      {
                        id: 'mcp:adobe',
                        name: 'Adobe for creativity',
                        description: 'Firefly / Photoshop MCP (needs MCP token).',
                        kind: 'mcp' as const,
                        configured: false,
                        category: 'generation' as const,
                        status: 'needs_token' as const,
                      },
                      {
                        id: 'mcp:cursor',
                        name: 'Cursor',
                        description: 'Cursor remote generation MCP — coming soon.',
                        kind: 'mcp' as const,
                        configured: false,
                        category: 'generation' as const,
                        status: 'coming_soon' as const,
                      },
                    ]
                ).map((p) => {
                  const on = enabledPlugins.includes(p.id)
                  const status =
                    p.status ||
                    (p.configured ? 'ready' : p.id === 'mcp:cursor' ? 'coming_soon' : 'needs_token')
                  const statusLabel =
                    status === 'coming_soon'
                      ? 'coming soon'
                      : status === 'needs_token'
                        ? 'needs token'
                        : on
                          ? 'on'
                          : 'off'
                  return (
                    <li
                      key={p.id}
                      className={`ds-chat-plugin${on ? ' is-on' : ''}${p.configured ? '' : ' is-off'}${
                        p.category === 'generation' ? ' is-gen' : ''
                      }`}
                    >
                      <button
                        type="button"
                        disabled={!p.configured}
                        title={p.error || p.description}
                        onClick={() => {
                          setEnabledPlugins((prev) => {
                            const next = on ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                            writePluginIds(next)
                            return next
                          })
                        }}
                      >
                        <span className="ds-chat-plugin-name">{p.name}</span>
                        <span className="ds-chat-plugin-meta">
                          {p.kind === 'mcp' ? 'MCP' : 'Built-in'}
                          {p.category === 'generation' ? ' · Gen' : ''}
                          {` · ${statusLabel}`}
                        </span>
                        <span className="ds-chat-plugin-desc">{p.description}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : null}
            {skillSuggestions.length ? (
              <ChatSkillMenu skills={skillSuggestions} onPick={pickSkill} />
            ) : null}
            {pendingFiles.length ? (
              <ul className="ds-chat-attach-list">
                {pendingFiles.map((f) => (
                  <li key={f.fileId}>
                    {f.previewUrl ? (
                      <img src={f.previewUrl} alt="" className="ds-chat-attach-thumb" />
                    ) : (
                      <span className="ds-chat-attach-kind">
                        {f.mime === 'application/pdf' || /\.pdf$/i.test(f.filename) ? 'PDF' : 'FILE'}
                      </span>
                    )}
                    <span>{f.filename}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${f.filename}`}
                      onClick={() =>
                        setPendingFiles((prev) => {
                          const next = prev.filter((x) => x.fileId !== f.fileId)
                          if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
                          return next
                        })
                      }
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="ds-chat-composer-card">
              <input
                ref={fileInputRef}
                type="file"
                className="ds-chat-file-input"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.gif,.txt,.md"
                disabled={busy || !unlocked || uploadingFile}
                onChange={(e) => void onPickFile(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                className="ds-chat-attach"
                aria-label="Attach file"
                title="Attach PDF, Office, or image"
                disabled={busy || !unlocked || uploadingFile}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadingFile ? '…' : '+'}
              </button>
              <ChatDictateButton
                disabled={busy || !unlocked}
                draft={draft}
                onDraft={setDraftAndResize}
                onError={(message) => setError(message)}
              />
              <textarea
                ref={inputRef}
                className="ds-chat-input"
                rows={1}
                value={draft}
                placeholder="Message DeepSeek"
                disabled={busy}
                onChange={(e) => {
                  setDraftAndResize(e.target.value)
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
                  disabled={!draft.trim() && !pendingFiles.length}
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

      <ChatArtifactPanel artifact={artifact} onClose={() => setArtifact(null)} />
      <IosHomescreenTip />
    </div>
  )
}
