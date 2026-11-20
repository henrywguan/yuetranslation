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
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChatDictateButton } from '../../../components/ChatDictateButton'
import { ChatPluginKeysModal } from '../../../components/ChatPluginKeysModal'
import { ChatSourcesList } from '../../../components/ChatShellExtras'
import { DeepSeekMark } from '../../../components/DeepSeekMark'
import { SpeakButton } from '../../../components/SpeakButton'
import {
  ChatDeepAvatar,
  useChatDeepAvatarCharacter,
  useChatDeepAvatarLipLevel,
  useChatDeepAvatarMood,
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

/** @deprecated Phase A Inbox — use `InboxShell` from `pages/chat/inbox/InboxShell`. */
export { InboxShell as ChatAuiSidebar } from '../inbox/InboxShell'

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

function ComposerChrome({ error }: { error?: string | null }) {
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
  const [avatarCharacter] = useChatDeepAvatarCharacter()
  const portraitMood = useChatDeepAvatarMood({ error })
  const portraitLips = useChatDeepAvatarLipLevel(portraitMood)
  const {
    deepThink,
    setDeepThink,
    searchOn,
    setSearchOn,
    composerMode,
    setComposerMode,
    buildFromPlan,
    richLayout,
    setRichLayout,
    harnessOn,
    setHarnessOn,
    busy,
    thinking,
    searching,
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
  } = useChatAuiSession()

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
  const mentionItems = useMemo(() => {
    if (!atMatch) return []
    return buildChatMentionItems({
      workspace: activeWorkspace,
      workspaces: inbox?.state.workspaces,
      threads: threads.map((t) => ({ id: t.id, title: t.title, archived: t.archived })),
      agents: inbox?.state.agents,
      activeThreadId: activeId,
      query: atMatch.query,
      limit: 20,
    })
  }, [activeId, activeWorkspace, atMatch, inbox?.state.agents, inbox?.state.workspaces, threads])

  useEffect(() => {
    // Typed `@` only — no dedicated composer @ button.
    setAtOpen(Boolean(atMatch && mentionItems.length))
  }, [atMatch, mentionItems.length])

  useEffect(() => {
    if (composerMode !== 'agent') setPluginsOpen(false)
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
    Number(deepThink) +
    Number(searchOn) +
    Number(harnessOn) +
    Number(richLayout) +
    enabledPlugins.length

  const fallbackPlugins = [
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

  const catalog = pluginCatalog.length ? pluginCatalog : fallbackPlugins
  const official = catalog.filter((p) => p.kind === 'builtin' || p.id === 'image')
  const installed = catalog.filter((p) => !official.includes(p))

  return (
    <ComposerPrimitive.Root
      className={`aui-composer${harnessOn ? ' is-harness' : ''} is-mode-${composerMode}`}
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
          <button
            type="button"
            className="aui-mode-build"
            disabled={busy}
            aria-disabled={busy}
            title={
              busy
                ? 'Wait for the current reply to finish, then Build'
                : 'Switch to Agent and hand the plan to Overseer / workers'
            }
            onClick={() => void buildFromPlan()}
          >
            Build
          </button>
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
        {thinking ? <span className="aui-status">Thinking…</span> : null}
        {searching ? <span className="aui-status">Searching…</span> : null}
        {composerMode === 'ask' ? <span className="aui-status">Ask · read-only</span> : null}
        {composerMode === 'plan' && busy ? (
          <span className="aui-status" role="status">
            Wait for reply…
          </span>
        ) : null}
        {composerMode === 'plan' && !busy ? (
          <span className="aui-status">Plan · then Build</span>
        ) : null}
      </div>

      {toolsExpanded ? (
        <div className="aui-composer-toggles" id="aui-tools-panel" aria-label="Tools">
          <button
            type="button"
            className={`aui-toggle${deepThink ? ' is-on' : ''}`}
            aria-pressed={deepThink}
            disabled={busy}
            onClick={() => setDeepThink(!deepThink)}
          >
            DeepThink
          </button>
          <button
            type="button"
            className={`aui-toggle${searchOn ? ' is-on' : ''}`}
            aria-pressed={searchOn}
            disabled={busy}
            onClick={() => setSearchOn(!searchOn)}
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

      {pendingFiles.length ? (
        <ul className="aui-pending-files">
          {pendingFiles.map((f) => (
            <li key={f.fileId}>
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

      <div className="aui-composer-body">
        <div className="aui-composer-portrait" aria-hidden={false}>
          <ChatDeepAvatar
            mood={portraitMood}
            size="portrait"
            lipLevel={portraitLips}
            character={avatarCharacter}
            label="DeepSeek companion"
          />
        </div>
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
                    >
                      Stop
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
  const { historyReady, error, clearError, busy } = useChatAuiSession()

  return (
    <div className="aui-layout">
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
            <ComposerChrome error={error} />
          </ThreadPrimitive.ViewportFooter>
        </ThreadPrimitive.Viewport>

        <ThreadPrimitive.ScrollToBottom className="aui-scroll-bottom">↓</ThreadPrimitive.ScrollToBottom>
      </ThreadPrimitive.Root>
    </div>
  )
}
