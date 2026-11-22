import {
  ActionBarPrimitive,
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAui,
  useAuiState,
  useMessagePartReasoning,
  useMessagePartText,
} from '@assistant-ui/react'
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { ChatDictateButton } from '../../../components/ChatDictateButton'
import { ChatPluginKeysModal } from '../../../components/ChatPluginKeysModal'
import { ChatSourcesList } from '../../../components/ChatShellExtras'
import { DeepSeekMark } from '../../../components/DeepSeekMark'
import { SpeakButton } from '../../../components/SpeakButton'
import {
  ChatDeepAvatar,
  ChatDeepAvatarCelebrateFx,
  ChatDeepAvatarNameplate,
  useChatDeepAvatarCelebrateFx,
  useChatDeepAvatarCelebrateMode,
  useChatDeepAvatarCharacter,
  useChatDeepAvatarDock,
  useChatDeepAvatarLipLevel,
  useChatDeepAvatarMood,
  type ChatDeepAvatarCharacterId,
  type ChatDeepAvatarDockMode,
  type ChatDeepAvatarMood,
} from './ChatDeepAvatar'
import type { DeepseekChatPluginKeyId } from '../../../lib/api'
import {
  applyMentionInsert,
  buildChatMentionItems,
  detectAtQuery,
  type ChatMentionItem,
} from '../../../lib/chatComposerContext'
import { consumeChatPrefill } from '../../../lib/chatExport'
import {
  LIVE_REASONING_PAINT,
  type ChatSearchStep,
  type ChatSource,
} from '../../../lib/chatHistory'
import {
  agentForThread,
  projectNestedViews,
  buildAgentViews,
  resolveProjectGithubWorkspace,
} from '../../../lib/chatInbox'
import { buildToolCards } from '../../../lib/chatToolCards'
import {
  CHAT_COMPOSER_MODE_LABEL,
  CHAT_COMPOSER_MODES,
  CHAT_EMPTY_SUGGESTIONS,
  cycleChatComposerMode,
  readChatToolsExpanded,
  writeChatToolsExpanded,
  type ChatComposerMode,
} from '../../../lib/chatUiPrefs'
import { chatSpeakLang, mergeDictateText } from '../../../lib/chatVoice'
import { renderChatMarkdown } from '../../../lib/renderChatMarkdown'
import { useChatInboxContextOptional } from '../inbox/ChatInboxContext'
import { StatusChip } from '../inbox/StatusChip'
import {
  AgentModeIcon,
  AskModeIcon,
  CopiedCheckIcon,
  CopyIcon,
  PlanModeIcon,
  ToolsChevronIcon,
} from './ChatComposerIcons'
import { useChatAuiSession } from './ChatAuiRuntime'

const MODE_ICONS = {
  agent: AgentModeIcon,
  ask: AskModeIcon,
  plan: PlanModeIcon,
} as const

const SUGGESTIONS = CHAT_EMPTY_SUGGESTIONS
const EMPTY_SOURCES: ChatSource[] = []
/** Stable empty sentinel — avoid stream-paint churn while `@` menu is closed. */
const EMPTY_THREADS_FOR_MENTIONS: Array<{ id: string; title: string; archived?: boolean }> = []

const FALLBACK_PLUGINS = [
  {
    id: 'image',
    name: 'Image generation',
    description: 'Gemini images',
    kind: 'builtin' as const,
    configured: false,
    category: 'generation' as const,
    status: 'needs_token' as const,
  },
  {
    id: 'mcp:higgsfield',
    name: 'Higgsfield',
    description: 'Image / video MCP',
    kind: 'mcp' as const,
    configured: false,
    category: 'generation' as const,
    status: 'needs_token' as const,
  },
]

/**
 * URL source parts on the current assistant message (1-indexed `[n]` chips).
 *
 * `useAuiState` compares with `Object.is` — returning a fresh `[]` / mapped array
 * every call re-renders forever (max update depth → blank `#root`) whenever an
 * assistant message is on screen. Keep a stable empty sentinel + memoize by key.
 */
function useMessageSources(): ChatSource[] {
  const cacheRef = useRef<{ key: string; value: ChatSource[] }>({ key: '', value: EMPTY_SOURCES })
  return useAuiState((s) => {
    const content = s.message.content
    if (!Array.isArray(content)) return EMPTY_SOURCES
    const out: ChatSource[] = []
    for (const part of content) {
      if (part.type !== 'source') continue
      if (part.sourceType !== 'url') continue
      const url = typeof part.url === 'string' ? part.url : ''
      if (!url) continue
      out.push({ url, title: (part.title || url).trim() || url })
    }
    if (!out.length) return EMPTY_SOURCES
    const key = out.map((x) => `${x.url}\0${x.title || ''}`).join('\n')
    if (cacheRef.current.key === key) return cacheRef.current.value
    cacheRef.current = { key, value: out }
    return out
  })
}

/**
 * Live markdown while the assistant token-stream is open — intentional premium
 * feel (Henry OK'd mid-stream markdown over the classic plain-text settle path).
 */
function MarkdownText() {
  const { text } = useMessagePartText()
  const streaming = useAuiState((s) => s.message.status?.type === 'running')
  const sources = useMessageSources()
  if (!text.trim()) {
    return streaming ? (
      <div className="aui-md is-streaming" aria-busy="true">
        <span className="aui-md-placeholder"> </span>
      </div>
    ) : (
      <span className="aui-msg-empty" aria-hidden />
    )
  }
  return (
    <div className={`aui-md${streaming ? ' is-streaming' : ''}`} aria-busy={streaming || undefined}>
      {renderChatMarkdown(text, { sources })}
    </div>
  )
}

function ReasoningText() {
  const { text } = useMessagePartReasoning()
  const streaming = useAuiState((s) => s.message.status?.type === 'running')
  const [open, setOpen] = useState(true)
  const didAutoCollapse = useRef(false)

  useEffect(() => {
    if (streaming) {
      didAutoCollapse.current = false
      setOpen(true)
      return
    }
    // Long research traces: collapse after settle so the answer stays usable.
    if (!didAutoCollapse.current && (text?.length || 0) > 420) {
      didAutoCollapse.current = true
      setOpen(false)
    }
  }, [streaming, text?.length])

  if (!text?.trim() && !streaming) return null

  // Paint only the live tail while streaming — full `<pre>` rewrites freeze iPhone.
  const shown =
    streaming && text.length > LIVE_REASONING_PAINT
      ? `…\n${text.slice(-LIVE_REASONING_PAINT)}`
      : text

  return (
    <details
      className={`aui-reasoning${streaming ? ' is-streaming' : ''}`}
      open={open}
      onToggle={(e) => {
        setOpen((e.target as HTMLDetailsElement).open)
      }}
    >
      <summary>DeepThink{streaming ? ' · live' : ''}</summary>
      {open || streaming ? <pre>{shown || (streaming ? '…' : '')}</pre> : null}
    </details>
  )
}

/** Source parts are listed via ChatSourcesList — skip inline chip spam. */
function SourcePartSilent() {
  return null
}

function AssistantSpeakSlot() {
  return (
    <MessagePrimitive.Parts>
      {({ part }) => {
        if (part.type !== 'text') return null
        const text = part.text || ''
        if (!text.trim()) return null
        return <SpeakButton text={text} lang={chatSpeakLang(text)} className="aui-speak" />
      }}
    </MessagePrimitive.Parts>
  )
}

/** Icon-only Copy — same circular weight as SpeakButton; `data-copied` + check glyph for feedback. */
function AuiCopyButton() {
  const isCopied = useAuiState((s) => s.message.isCopied)
  return (
    <ActionBarPrimitive.Copy
      className={`copy-btn aui-copy-btn${isCopied ? ' is-copied' : ''}`}
      aria-label={isCopied ? 'Copied' : 'Copy'}
      title={isCopied ? 'Copied' : 'Copy'}
    >
      {isCopied ? <CopiedCheckIcon size={15} /> : <CopyIcon size={15} />}
    </ActionBarPrimitive.Copy>
  )
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="aui-msg is-user">
      <div className="aui-bubble is-user">
        <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
      </div>
      <ActionBarPrimitive.Root hideWhenRunning className="aui-actions">
        <AuiCopyButton />
        <ActionBarPrimitive.Edit className="aui-action-btn">Edit</ActionBarPrimitive.Edit>
      </ActionBarPrimitive.Root>
    </MessagePrimitive.Root>
  )
}

/**
 * Cursor-like expandable tool chips in the assistant stream.
 * Fed by searchSteps (Search SSE + sandbox mirrored into steps). Always on —
 * not gated on Harness (Harness keeps the denser timeline below when enabled).
 */
function ToolActivityCards() {
  const { harnessOn } = useChatAuiSession()
  const streaming = useAuiState((s) => s.message.status?.type === 'running')
  const steps = useAuiState((s) => {
    const custom = s.message.metadata?.custom as { searchSteps?: ChatSearchStep[] } | undefined
    return custom?.searchSteps
  })
  const cards = useMemo(
    () => buildToolCards({ searchSteps: steps, streaming }),
    [steps, streaming],
  )
  if (!cards.length) return null
  return (
    <div className="aui-tool-cards" aria-label="Tool activity">
      {cards.map((card) => (
        <details
          key={card.id}
          className={`aui-tool-card is-${card.kind}${card.live ? ' is-live' : ''}`}
          open={card.live || Boolean(card.body && card.body.length < 280)}
        >
          <summary>
            <span className="aui-tool-card-kind" data-kind={card.kind}>
              {card.kind}
            </span>
            <span className="aui-tool-card-label">{card.label}</span>
            {card.detail ? <span className="aui-tool-card-detail">{card.detail}</span> : null}
            {card.live ? (
              <span className="aui-tool-card-live" aria-label="In progress">
                ·
              </span>
            ) : null}
          </summary>
          {card.body ? <pre className="aui-tool-card-body">{card.body}</pre> : null}
        </details>
      ))}
      {harnessOn && steps && steps.length > 0 ? (
        <details className="aui-harness-trace">
          <summary>Harness timeline · {steps.length}</summary>
          <ol className="aui-harness-trace-list">
            {steps.map((step, i) => (
              <li key={`${step.kind}-${i}`}>
                <span className="aui-harness-trace-kind">{step.kind}</span>
                {step.queries?.length ? <span>{step.queries.join(' · ')}</span> : null}
                {step.title || step.url ? <span>{step.title || step.url}</span> : null}
                {step.snippet ? <span className="aui-harness-trace-snip">{step.snippet}</span> : null}
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </div>
  )
}

function AssistantMessage() {
  const streaming = useAuiState((s) => s.message.status?.type === 'running')
  const sources = useMessageSources()

  return (
    <MessagePrimitive.Root className="aui-msg is-assistant">
      <div className="aui-bubble is-assistant">
        <ToolActivityCards />
        <MessagePrimitive.Parts
          components={{
            Text: MarkdownText,
            Reasoning: ReasoningText,
            Source: SourcePartSilent,
          }}
        />
      </div>
      {!streaming && sources.length ? (
        <ChatSourcesList sources={sources} defaultOpen={sources.length <= 4} />
      ) : null}
      <div className="aui-actions">
        <ActionBarPrimitive.Root hideWhenRunning autohide="not-last" className="aui-actions-row">
          <AuiCopyButton />
        </ActionBarPrimitive.Root>
        <AssistantSpeakSlot />
      </div>
    </MessagePrimitive.Root>
  )
}

function EditComposer() {
  return (
    <ComposerPrimitive.Root className="aui-edit-composer">
      <ComposerPrimitive.Input className="aui-edit-input" />
      <div className="aui-edit-actions">
        <ComposerPrimitive.Send className="aui-action-btn">Save</ComposerPrimitive.Send>
        <ComposerPrimitive.Cancel className="aui-action-btn">Cancel</ComposerPrimitive.Cancel>
      </div>
    </ComposerPrimitive.Root>
  )
}

/** In-thread Project agents (Overseer + workers) — jump without leaving the composer. */
function ProjectAgentStrip() {
  const inbox = useChatInboxContextOptional()
  const { activeId, busy, selectThread, threads } = useChatAuiSession()
  const projectAgents = useMemo(() => {
    if (!inbox?.ready) return []
    const linked = agentForThread(inbox.state, activeId)
    let projectId = linked?.projectId || null
    if (!projectId) {
      const hit = inbox.state.projects.find((p) => p.threadIds.includes(activeId))
      projectId = hit?.id || null
    }
    if (!projectId) return []
    const views = buildAgentViews({
      agents: inbox.state.agents,
      projects: inbox.state.projects,
      threads: threads.map((t) => ({ id: t.id, title: t.title, archived: t.archived })),
      busy,
      activeId,
    })
    return projectNestedViews(views, projectId).filter(
      (v) => v.role === 'overseer' || v.role === 'worker',
    )
  }, [activeId, busy, inbox, threads])

  if (!projectAgents.length) return null

  return (
    <div className="aui-agent-strip" role="toolbar" aria-label="Project agents">
      {projectAgents.map((a) => {
        const active = a.threadId === activeId
        const roleLabel = a.role === 'overseer' ? 'Overseer' : 'Worker'
        return (
          <button
            key={a.id}
            type="button"
            className={`aui-agent-chip${active ? ' is-active' : ''}${a.role === 'overseer' ? ' is-overseer' : ''}`}
            aria-current={active ? 'true' : undefined}
            title={`${roleLabel}: ${a.title}`}
            onClick={() => {
              if (a.threadId && a.threadId !== activeId) selectThread(a.threadId)
            }}
          >
            <span className="aui-agent-chip-role">{roleLabel}</span>
            <span className="aui-agent-chip-title">{a.title}</span>
            <StatusChip status={a.status} />
          </button>
        )
      })}
    </div>
  )
}

function AtMentionMenu({
  items,
  onPick,
  onClose,
}: {
  items: ChatMentionItem[]
  onPick: (item: ChatMentionItem) => void
  onClose: () => void
}) {
  if (!items.length) return null
  return (
    <div className="aui-at-menu" role="listbox" aria-label="Insert context">
      <div className="aui-at-menu-head">
        <span>Context</span>
        <button type="button" className="aui-at-menu-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <ul className="aui-at-menu-list">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              role="option"
              className="aui-at-item"
              onClick={() => onPick(item)}
            >
              <span className={`aui-at-kind is-${item.kind}`}>{item.kind}</span>
              <span className="aui-at-label">{item.label}</span>
              {item.hint ? <small>{item.hint}</small> : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

type ComposerChromeProps = {
  dock: ChatDeepAvatarDockMode
  onToggleDock: () => void
  /** Celebrate FLIP origin — avatar bounds, not the full-height stage button. */
  dockRef: RefObject<HTMLElement | null>
  portraitMood: ChatDeepAvatarMood
  portraitLips: number
  avatarCharacter: ChatDeepAvatarCharacterId
  dimPortrait: boolean
}

/** Live mode / busy chips — placement follows companion dock (bar above composer, stage above portrait). */
function ComposerStatusCluster({ placement }: { placement: 'bar' | 'stage' }) {
  const { thinking, searching, thinkingAuto, searchingAuto, composerMode, busy } =
    useChatAuiSession()
  const chips: ReactNode[] = []
  if (thinking) {
    chips.push(
      <span key="thinking" className="aui-status">
        {thinkingAuto ? 'Auto · Thinking…' : 'Thinking…'}
      </span>,
    )
  }
  if (searching) {
    chips.push(
      <span key="searching" className="aui-status">
        {searchingAuto ? 'Auto · Searching…' : 'Searching…'}
      </span>,
    )
  }
  if (composerMode === 'ask') {
    chips.push(
      <span key="ask" className="aui-status">
        Ask · read-only
      </span>,
    )
  }
  if (composerMode === 'plan' && busy) {
    chips.push(
      <span key="plan-busy" className="aui-status" role="status">
        Wait for reply…
      </span>,
    )
  } else if (composerMode === 'plan') {
    chips.push(
      <span key="plan" className="aui-status">
        Plan · then Build
      </span>,
    )
  }
  if (!chips.length) return null
  return (
    <div className={`aui-status-cluster is-${placement}`} aria-live="polite">
      {chips}
    </div>
  )
}

function ComposerChrome({
  dock,
  onToggleDock,
  dockRef,
  portraitMood,
  portraitLips,
  avatarCharacter,
  dimPortrait,
}: ComposerChromeProps) {
  const aui = useAui()
  const draft = useAuiState((s) => s.composer.text)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const ocrInputRef = useRef<HTMLInputElement>(null)
  const [pluginsOpen, setPluginsOpen] = useState(false)
  const [keysOpen, setKeysOpen] = useState(false)
  const [keysFocusId, setKeysFocusId] = useState<DeepseekChatPluginKeyId | null>(null)
  const [atOpen, setAtOpen] = useState(false)
  const [toolsExpanded, setToolsExpanded] = useState(() => readChatToolsExpanded())
  const inbox = useChatInboxContextOptional()
  const {
    autoOn,
    setAutoOn,
    deepThink,
    setDeepThink,
    searchOn,
    setSearchOn,
    composerMode,
    setComposerMode,
    buildFromPlan,
    planDraft,
    savePlanToWorkspace,
    requestWorkspaceTab,
    richLayout,
    setRichLayout,
    harnessOn,
    setHarnessOn,
    busy,
    stopGeneration,
    pendingFiles,
    uploadingFile,
    ocrBusy,
    pickFile,
    pickOcr,
    removePendingFile,
    pluginCatalog,
    enabledPlugins,
    togglePlugin,
    pluginKeyHints,
    refreshPlugins,
    setError,
    activeWorkspace,
    threads,
    activeId,
    followUpQueue,
    queueFollowUp,
    dismissFollowUp,
    clearFollowUpQueue,
    reviewActivity,
  } = useChatAuiSession()
  const [composerDragOver, setComposerDragOver] = useState(false)
  const [planSaveNote, setPlanSaveNote] = useState<string | null>(null)

  // Solo / Conversation handoff — classic ChatPage already consumed this; AUI is default.
  useEffect(() => {
    const prefill = consumeChatPrefill()
    if (prefill) aui.composer.setText(prefill)
  }, [aui.composer])

  // Shift+Tab cycles Agent → Ask → Plan from the draft/modes only.
  // Keep focus where it is (preventDefault); never intercept mic/dictate or dialogs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !e.shiftKey) return
      if (e.altKey || e.metaKey || e.ctrlKey) return
      const t = e.target as HTMLElement | null
      if (!t) return
      if (t.closest?.('.ds-plugin-keys, [role="dialog"]')) return
      // Mic / dictate owns its own keys — do not cycle modes or swallow Tab.
      if (t.closest?.('.ds-chat-dictate, .aui-composer-running-actions')) return
      const inDraft =
        t.classList?.contains('aui-composer-input') ||
        t.closest?.('.aui-composer-input') ||
        (t.tagName === 'TEXTAREA' && Boolean(t.closest?.('.aui-composer')))
      const inModes = Boolean(t.closest?.('.aui-composer-modes'))
      if (!inDraft && !inModes) return
      e.preventDefault()
      e.stopPropagation()
      setComposerMode(cycleChatComposerMode(composerMode))
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [composerMode, setComposerMode])

  const atMatch = detectAtQuery(draft)
  // While `@` is closed, use a stable empty dep so 100ms stream paints do not
  // invalidate this memo (Composer still re-renders for Thinking/Searching UI).
  const threadsDepForMentions = atMatch ? threads : EMPTY_THREADS_FOR_MENTIONS
  const mentionItems = useMemo(() => {
    if (!atMatch) return []
    const linked = inbox?.ready ? agentForThread(inbox.state, activeId) : undefined
    let projectId = linked?.projectId || null
    if (!projectId && inbox?.ready) {
      projectId = inbox.state.projects.find((p) => p.threadIds.includes(activeId))?.id || null
    }
    const project = projectId
      ? inbox?.state.projects.find((p) => p.id === projectId)
      : undefined
    // Only offer `@diff:…` when *this* Project has a bound GitHub workspace.
    const githubWs =
      projectId && inbox?.ready
        ? resolveProjectGithubWorkspace(inbox.state, projectId)
        : undefined
    const lastRun = reviewActivity.runs[0] || null
    return buildChatMentionItems({
      workspace: activeWorkspace,
      workspaces: inbox?.state.workspaces,
      threads: threadsDepForMentions.map((t) => ({
        id: t.id,
        title: t.title,
        archived: t.archived,
      })),
      agents: inbox?.state.agents,
      activeThreadId: activeId,
      projectId,
      projectThreadIds: project?.threadIds,
      githubBound: Boolean(githubWs),
      defaultBranch: 'main',
      lastRun,
      query: atMatch.query,
      limit: 20,
    })
  }, [
    activeId,
    activeWorkspace,
    atMatch,
    inbox,
    reviewActivity.runs,
    threadsDepForMentions,
  ])

  useEffect(() => {
    // Typed `@` only — no dedicated composer @ button.
    setAtOpen(Boolean(atMatch && mentionItems.length))
  }, [atMatch, mentionItems.length])

  useEffect(() => {
    if (composerMode !== 'agent') setPluginsOpen(false)
    if (composerMode !== 'plan') setPlanSaveNote(null)
  }, [composerMode])

  const toggleToolsExpanded = () => {
    setToolsExpanded((prev) => {
      const next = !prev
      writeChatToolsExpanded(next)
      return next
    })
  }

  const pickMention = (item: ChatMentionItem) => {
    if (!atMatch) return
    aui.composer.setText(applyMentionInsert(draft, atMatch.start, item.insert))
    setAtOpen(false)
  }

  const toolsOnCount =
    (autoOn ? 1 : Number(deepThink) + Number(searchOn)) +
    Number(harnessOn) +
    Number(richLayout) +
    enabledPlugins.length

  const catalog = pluginCatalog.length ? pluginCatalog : FALLBACK_PLUGINS
  const official = catalog.filter((p) => p.kind === 'builtin' || p.id === 'image')
  const installed = catalog.filter((p) => !official.includes(p))

  const takeImageFromDataTransfer = (dt: DataTransfer | null): File | null => {
    if (!dt) return null
    const files = dt.files
    if (files?.length) {
      for (const f of Array.from(files)) {
        if (f.type.startsWith('image/')) return f
      }
    }
    const items = dt.items
    if (items?.length) {
      for (const item of Array.from(items)) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          return item.getAsFile()
        }
      }
    }
    return null
  }

  return (
    <ComposerPrimitive.Root
      className={`aui-composer${harnessOn ? ' is-harness' : ''} is-mode-${composerMode}${composerDragOver ? ' is-drag-over' : ''}`}
      onDragEnter={(e) => {
        if (busy || uploadingFile) return
        if (![...e.dataTransfer.types].some((t) => t === 'Files')) return
        e.preventDefault()
        setComposerDragOver(true)
      }}
      onDragOver={(e) => {
        if (busy || uploadingFile) return
        // Only claim file/image drags — never block text drops into the draft.
        if (![...e.dataTransfer.types].some((t) => t === 'Files')) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
        setComposerDragOver(true)
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setComposerDragOver(false)
      }}
      onDrop={(e) => {
        setComposerDragOver(false)
        if (busy || uploadingFile) return
        const file = takeImageFromDataTransfer(e.dataTransfer)
        if (!file) return
        e.preventDefault()
        void pickFile(file)
      }}
      onPaste={(e) => {
        if (busy || uploadingFile) return
        const items = e.clipboardData?.items
        if (!items) return
        for (const item of Array.from(items)) {
          if (item.kind === 'file' && item.type.startsWith('image/')) {
            const file = item.getAsFile()
            if (file) {
              e.preventDefault()
              void pickFile(file)
            }
            break
          }
        }
      }}
    >
      {/* Modes span full dialogue bar width — above portrait + draft (Henry). */}
      <ProjectAgentStrip />
      <div
        className={`aui-composer-modes${toolsExpanded ? ' is-tools-expanded' : ''}`}
        role="group"
        aria-label="Composer mode"
      >
        {CHAT_COMPOSER_MODES.map((mode: ChatComposerMode) => {
          const Icon = MODE_ICONS[mode]
          return (
            <button
              key={mode}
              type="button"
              className={`aui-mode is-${mode}${composerMode === mode ? ' is-on' : ''}`}
              aria-pressed={composerMode === mode}
              title={
                mode === 'ask'
                  ? 'Ask — read-only, no sandbox writes (Shift+Tab cycles modes)'
                  : mode === 'plan'
                    ? 'Plan — research then Build with Overseer (Shift+Tab cycles modes)'
                    : 'Agent — tools on (Shift+Tab cycles modes)'
              }
              onClick={() => setComposerMode(mode)}
            >
              <Icon size={14} />
              <span>{CHAT_COMPOSER_MODE_LABEL[mode]}</span>
            </button>
          )
        })}
        {composerMode === 'plan' ? (
          <>
            <button
              type="button"
              className="aui-mode-build aui-mode-build--save"
              disabled={busy || !planDraft.trim()}
              title="Save plan markdown to workspace (plans/latest.md)"
              onClick={() => {
                requestWorkspaceTab('plan')
                const res = savePlanToWorkspace()
                if (res.ok) {
                  setPlanSaveNote(`Saved · ${res.path}`)
                  setError(null)
                } else {
                  setPlanSaveNote(null)
                  setError(res.error || 'Save failed')
                }
              }}
            >
              Save
            </button>
            <button
              type="button"
              className="aui-mode-build"
              disabled={busy || !planDraft.trim()}
              aria-disabled={busy || !planDraft.trim()}
              title={
                busy
                  ? 'Wait for the current reply to finish, then Build'
                  : !planDraft.trim()
                    ? 'Plan is empty — write a plan before Build'
                    : 'Switch to Agent and hand the plan to Overseer / workers'
              }
              onClick={() => {
                requestWorkspaceTab('plan')
                void buildFromPlan()
              }}
            >
              Build
            </button>
          </>
        ) : null}
        <button
          type="button"
          className={`aui-tools-toggle${toolsExpanded ? ' is-expanded' : ''}`}
          aria-expanded={toolsExpanded}
          aria-controls="aui-tools-panel"
          onClick={toggleToolsExpanded}
        >
          <span className="aui-tools-label">Tools</span>
          {toolsOnCount > 0 ? (
            <span className="aui-tools-count" aria-label={`${toolsOnCount} tools on`}>
              {toolsOnCount}
            </span>
          ) : null}
          <ToolsChevronIcon size={12} />
        </button>
      </div>

      {toolsExpanded ? (
        <div className="aui-composer-toggles" id="aui-tools-panel" aria-label="Tools">
          <button
            type="button"
            className={`aui-toggle${autoOn ? ' is-on' : ''}`}
            aria-pressed={autoOn}
            disabled={busy}
            title="Auto — pick DeepThink / Search per turn (saves tokens)"
            onClick={() => setAutoOn(!autoOn)}
          >
            Auto
          </button>
          <button
            type="button"
            className={`aui-toggle${autoOn ? ' is-managed' : ''}${!autoOn && deepThink ? ' is-on' : ''}`}
            aria-pressed={autoOn ? false : deepThink}
            aria-disabled={autoOn || busy}
            disabled={busy}
            title={
              autoOn
                ? 'Managed by Auto — click to force DeepThink and exit Auto'
                : 'DeepThink'
            }
            onClick={() => setDeepThink(autoOn ? true : !deepThink)}
          >
            DeepThink
          </button>
          <button
            type="button"
            className={`aui-toggle${autoOn ? ' is-managed' : ''}${!autoOn && searchOn ? ' is-on' : ''}`}
            aria-pressed={autoOn ? false : searchOn}
            aria-disabled={autoOn || busy}
            disabled={busy}
            title={
              autoOn
                ? 'Managed by Auto — click to force Search and exit Auto'
                : 'Search'
            }
            onClick={() => setSearchOn(autoOn ? true : !searchOn)}
          >
            Search
          </button>
          <button
            type="button"
            className={`aui-toggle${harnessOn ? ' is-on' : ''}`}
            aria-pressed={harnessOn}
            disabled={busy}
            title="Harness — Workspace panel + durable file tools"
            onClick={() => setHarnessOn(!harnessOn)}
          >
            Harness
          </button>
          <button
            type="button"
            className={`aui-toggle${richLayout ? ' is-on' : ''}`}
            aria-pressed={richLayout}
            disabled={busy}
            title="Rich layout for PDF / Office uploads"
            onClick={() => setRichLayout(!richLayout)}
          >
            Rich layout
          </button>
          <button
            type="button"
            className={`aui-toggle${pluginsOpen || enabledPlugins.length ? ' is-on' : ''}`}
            aria-pressed={pluginsOpen}
            disabled={busy || composerMode !== 'agent'}
            title={
              composerMode !== 'agent'
                ? 'Plugins available in Agent mode'
                : 'Plugins'
            }
            onClick={() => setPluginsOpen((v) => !v)}
          >
            Plugins{enabledPlugins.length ? ` · ${enabledPlugins.length}` : ''}
          </button>
        </div>
      ) : null}

      {/* Plugins strip is Plugins-toggle only — Harness must not force it open. */}
      {pluginsOpen && toolsExpanded ? (
        <div className={`aui-plugins${harnessOn ? ' is-harness-strip' : ''}`}>
          <button
            type="button"
            className="aui-keys-open"
            onClick={() => {
              setKeysFocusId(null)
              setKeysOpen(true)
            }}
          >
            API keys
          </button>
          {harnessOn ? (
            <>
              <div className="aui-plugins-section-label">Official</div>
              <ul className="aui-plugin-list">
                {official.map((p) => {
                  const on = enabledPlugins.includes(p.id)
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        className={`aui-plugin${on ? ' is-on' : ''}`}
                        disabled={p.status === 'coming_soon'}
                        onClick={() => togglePlugin(p.id)}
                      >
                        <span>{p.name}</span>
                        <small>{p.status === 'ready' ? 'ready' : p.status}</small>
                      </button>
                    </li>
                  )
                })}
              </ul>
              <div className="aui-plugins-section-label">Installed</div>
              <ul className="aui-plugin-list">
                {(installed.length ? installed : catalog.filter((p) => p.kind === 'mcp')).map((p) => {
                  const on = enabledPlugins.includes(p.id)
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        className={`aui-plugin${on ? ' is-on' : ''}`}
                        disabled={p.status === 'coming_soon'}
                        onClick={() => togglePlugin(p.id)}
                      >
                        <span>{p.name}</span>
                        <small>{p.status === 'ready' ? 'ready' : p.status}</small>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          ) : (
            <ul className="aui-plugin-list">
              {catalog.map((p) => {
                const on = enabledPlugins.includes(p.id)
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      className={`aui-plugin${on ? ' is-on' : ''}`}
                      disabled={p.status === 'coming_soon'}
                      onClick={() => togglePlugin(p.id)}
                    >
                      <strong>{p.name}</strong>
                      <span>{on ? 'on' : 'off'}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : null}

      {composerMode === 'plan' && planSaveNote ? (
        <p className="aui-plan-artifact-saved" role="status">
          {planSaveNote} · edit in Workspace → Plan
        </p>
      ) : null}

      {pendingFiles.length ? (
        <ul className="aui-pending-files">
          {pendingFiles.map((f) => (
            <li key={f.fileId}>
              {f.previewUrl ? (
                <img src={f.previewUrl} alt="" className="aui-pending-thumb" draggable={false} />
              ) : null}
              <span>{f.filename}</span>
              <button type="button" onClick={() => removePendingFile(f.fileId)} aria-label="Remove file">
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {followUpQueue.length ? (
        <div className="aui-followups" aria-label="Queued follow-ups">
          <div className="aui-followups-head">
            <span>
              Queued · {followUpQueue.length}
              {busy ? ' · sends after this reply' : ''}
            </span>
            <button type="button" className="aui-followups-clear" onClick={clearFollowUpQueue}>
              Clear
            </button>
          </div>
          <ul className="aui-followups-list">
            {followUpQueue.map((item, i) => (
              <li key={item.id}>
                <span className="aui-followups-idx">{i + 1}</span>
                <span className="aui-followups-text">{item.text}</span>
                <button
                  type="button"
                  className="aui-followups-dismiss"
                  aria-label="Remove follow-up"
                  onClick={() => dismissFollowUp(item.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className={`aui-composer-body${dock === 'stage' ? ' is-avatar-staged' : ''}`}>
        {dock === 'bar' ? (
          <button
            type="button"
            className="aui-composer-portrait"
            onClick={onToggleDock}
            aria-label="Show large companion"
          >
            <span className={`aui-avatar-dock-frame${dimPortrait ? ' is-fx-dimmed' : ''}`}>
              <span className="aui-avatar-dock-origin" ref={dockRef}>
                <ChatDeepAvatar
                  mood={portraitMood}
                  size="portrait"
                  lipLevel={portraitLips}
                  character={avatarCharacter}
                  label="DeepSeek companion"
                  dimmed={dimPortrait}
                />
              </span>
              <ChatDeepAvatarNameplate character={avatarCharacter} size="portrait" />
            </span>
          </button>
        ) : null}
        <div className="aui-composer-main">
          <div className="aui-composer-row-wrap">
            {atOpen ? (
              <AtMentionMenu
                items={mentionItems}
                onPick={pickMention}
                onClose={() => setAtOpen(false)}
              />
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={(e) => void pickFile(e.target.files?.[0] || null)}
            />
            <input
              ref={ocrInputRef}
              type="file"
              accept="image/*,.pdf"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0] || null
                void pickOcr(file, (text) => aui.composer.setText(mergeDictateText(draft, text)))
                if (ocrInputRef.current) ocrInputRef.current.value = ''
              }}
            />
            {/* Full-width input row — never share horizontal space with attach/mic/send on mobile. */}
            <ComposerPrimitive.Input
              className="aui-composer-input"
              placeholder={
                busy
                  ? 'Queue a follow-up (Enter)…'
                  : composerMode === 'ask'
                    ? 'Ask DeepSeek (read-only)…'
                    : composerMode === 'plan'
                      ? 'Plan with DeepSeek…'
                      : 'Message DeepSeek…'
              }
              rows={1}
              // While running, assistant-ui blocks Submit — capture Enter here to queue.
              submitMode={busy ? 'none' : 'enter'}
              unstable_insertNewlineOnTouchEnter
              onKeyDown={(e) => {
                if (!busy) return
                if (e.key !== 'Enter' || e.shiftKey) return
                if (e.nativeEvent.isComposing) return
                e.preventDefault()
                e.stopPropagation()
                const text = draft.trim()
                if (!text) return
                queueFollowUp(text)
                aui.composer.setText('')
              }}
            />
            <div className="aui-composer-toolbar">
              <div className="aui-composer-toolbar-start">
                <button
                  type="button"
                  className="aui-attach"
                  disabled={busy || uploadingFile}
                  title="Attach file"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingFile ? '…' : '+'}
                </button>
                <button
                  type="button"
                  className="aui-attach"
                  disabled={busy || ocrBusy}
                  title="OCR into draft"
                  onClick={() => ocrInputRef.current?.click()}
                >
                  {ocrBusy ? '…' : 'OCR'}
                </button>
              </div>
              <div className="aui-composer-toolbar-end">
                <ChatDictateButton
                  disabled={busy}
                  draft={draft}
                  onDraft={(next) => aui.composer.setText(next)}
                  onBargeIn={() => stopGeneration()}
                  onError={(message) => setError(message)}
                />
                <AuiIf condition={(s) => s.thread.isRunning}>
                  <span className="aui-composer-running-actions">
                    <ComposerPrimitive.Cancel
                      className="aui-send is-stop"
                      onClick={() => stopGeneration()}
                      aria-label="Stop working"
                      title="Stop working — cancel the in-flight reply"
                    >
                      Stop working
                    </ComposerPrimitive.Cancel>
                    <button
                      type="button"
                      className="aui-send is-queue"
                      disabled={!draft.trim()}
                      title="Queue follow-up — sends after the current reply (Stop keeps the queue)"
                      onClick={() => {
                        const text = draft.trim()
                        if (!text) return
                        queueFollowUp(text)
                        aui.composer.setText('')
                      }}
                    >
                      Queue
                    </button>
                  </span>
                </AuiIf>
                <AuiIf condition={(s) => !s.thread.isRunning}>
                  <ComposerPrimitive.Send className="aui-send">Send</ComposerPrimitive.Send>
                </AuiIf>
              </div>
            </div>
          </div>
        </div>
      </div>

      {keysOpen ? (
        <ChatPluginKeysModal
          open={keysOpen}
          focusId={keysFocusId}
          initialHints={pluginKeyHints}
          onClose={() => setKeysOpen(false)}
          onSaved={() => {
            void refreshPlugins()
          }}
        />
      ) : null}
    </ComposerPrimitive.Root>
  )
}

export function ChatAuiThread() {
  const { historyReady, error, clearError, busy, composerMode, searchOn } = useChatAuiSession()
  const [dock, setDock] = useChatDeepAvatarDock()
  const [avatarCharacter] = useChatDeepAvatarCharacter()
  const [celebrateMode] = useChatDeepAvatarCelebrateMode()
  const dockRef = useRef<HTMLElement | null>(null)
  const {
    mood: portraitMood,
    outroMood: portraitOutroMood,
    outroActive: portraitOutro,
    deepFinish: portraitDeep,
  } = useChatDeepAvatarMood({ error, composerMode, searchOn })
  const portraitLips = useChatDeepAvatarLipLevel(portraitMood)
  const {
    showFx: celebrateFx,
    fxMood: celebrateFxMood,
    fxSessionKey: celebrateFxKey,
    dismissFx: dismissCelebrateFx,
    dimPortrait,
  } = useChatDeepAvatarCelebrateFx({
    outroMood: portraitOutroMood,
    outroActive: portraitOutro,
    deepFinish: portraitDeep,
    celebrateMode,
  })

  const onToggleDock = () => {
    // Prefer ignore while fullscreen celebrate owns the screen.
    if (celebrateFx) return
    setDock(dock === 'bar' ? 'stage' : 'bar')
  }

  return (
    <div className={`aui-layout${dock === 'stage' ? ' is-avatar-stage' : ''}`}>
      {dock === 'stage' ? (
        <aside className="aui-avatar-stage" aria-label="Companion stage">
          <button
            type="button"
            className="aui-avatar-stage-toggle"
            onClick={onToggleDock}
            aria-label="Dock companion to composer"
          >
            <ComposerStatusCluster placement="stage" />
            <span
              className={`aui-avatar-dock-frame is-stage${dimPortrait ? ' is-fx-dimmed' : ''}`}
            >
              <span className="aui-avatar-dock-origin" ref={dockRef}>
                <ChatDeepAvatar
                  mood={portraitMood}
                  size="stage"
                  lipLevel={portraitLips}
                  character={avatarCharacter}
                  label="DeepSeek companion"
                  dimmed={dimPortrait}
                />
              </span>
              <ChatDeepAvatarNameplate character={avatarCharacter} size="stage" />
            </span>
          </button>
        </aside>
      ) : null}
      <ThreadPrimitive.Root className="aui-thread">
        <ThreadPrimitive.Viewport className="aui-viewport" autoScroll>
          {!historyReady ? (
            <div className="aui-empty" aria-busy="true">
              <DeepSeekMark className="aui-empty-mark" />
              <h1>DeepSeek</h1>
              <p>Loading conversation…</p>
            </div>
          ) : (
            <>
              <AuiIf condition={(s) => s.thread.isEmpty}>
                <div className="aui-empty">
                  <h1>
                    Hi, I&apos;m <strong>DeepSeek</strong>.
                  </h1>
                  <p>How can I help you today?</p>
                  <div className="aui-suggestions">
                    {SUGGESTIONS.map((s, i) => (
                      <ThreadPrimitive.Suggestion
                        key={s}
                        prompt={s}
                        send
                        className="aui-suggestion"
                        style={{ animationDelay: `${i * 40}ms` }}
                        disabled={busy}
                      >
                        {s}
                      </ThreadPrimitive.Suggestion>
                    ))}
                  </div>
                </div>
              </AuiIf>

              <ThreadPrimitive.Messages
                components={{
                  UserMessage,
                  EditComposer,
                  AssistantMessage,
                }}
              />
            </>
          )}

          <ThreadPrimitive.ViewportFooter className="aui-footer">
            {error ? (
              <div className="aui-error" role="alert">
                <span>{error}</span>
                <button type="button" onClick={clearError}>
                  Dismiss
                </button>
              </div>
            ) : null}
            {dock === 'bar' ? <ComposerStatusCluster placement="bar" /> : null}
            <ComposerChrome
              dock={dock}
              onToggleDock={onToggleDock}
              dockRef={dockRef}
              portraitMood={portraitMood}
              portraitLips={portraitLips}
              avatarCharacter={avatarCharacter}
              dimPortrait={dimPortrait}
            />
          </ThreadPrimitive.ViewportFooter>
        </ThreadPrimitive.Viewport>

        <ThreadPrimitive.ScrollToBottom className="aui-scroll-bottom">↓</ThreadPrimitive.ScrollToBottom>
      </ThreadPrimitive.Root>
      <ChatDeepAvatarCelebrateFx
        open={celebrateFx}
        sessionKey={celebrateFxKey}
        mood={celebrateFxMood}
        character={avatarCharacter}
        originRef={dockRef}
        onDismiss={dismissCelebrateFx}
      />
    </div>
  )
}
