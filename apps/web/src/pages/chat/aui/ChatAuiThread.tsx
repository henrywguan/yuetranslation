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
  ChatDeepAvatarBubble,
  ChatDeepAvatarCharacterPicker,
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
import {
  CHAT_COMPOSER_MODE_LABEL,
  CHAT_COMPOSER_MODES,
  CHAT_EMPTY_SUGGESTIONS,
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

function UserMessage() {
  return (
    <MessagePrimitive.Root className="aui-msg is-user">
      <div className="aui-bubble is-user">
        <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
      </div>
      <ActionBarPrimitive.Root hideWhenRunning className="aui-actions">
        <ActionBarPrimitive.Copy className="aui-action-btn">Copy</ActionBarPrimitive.Copy>
        <ActionBarPrimitive.Edit className="aui-action-btn">Edit</ActionBarPrimitive.Edit>
      </ActionBarPrimitive.Root>
    </MessagePrimitive.Root>
  )
}

function HarnessSearchTrace() {
  const { harnessOn } = useChatAuiSession()
  const steps = useAuiState((s) => {
    const custom = s.message.metadata?.custom as { searchSteps?: ChatSearchStep[] } | undefined
    return custom?.searchSteps
  })
  if (!harnessOn || !steps?.length) return null
  return (
    <details className="aui-harness-trace" open>
      <summary>Tool / search timeline · {steps.length}</summary>
      <ol className="aui-harness-trace-list">
        {steps.map((step, i) => (
          <li key={`${step.kind}-${i}`}>
            <span className="aui-harness-trace-kind">{step.kind}</span>
            {step.queries?.length ? <span>{step.queries.join(' · ')}</span> : null}
            {step.title || step.url ? (
              <span>{step.title || step.url}</span>
            ) : null}
            {step.snippet ? <span className="aui-harness-trace-snip">{step.snippet}</span> : null}
          </li>
        ))}
      </ol>
    </details>
  )
}

function AssistantMessage() {
  const streaming = useAuiState((s) => s.message.status?.type === 'running')
  const sources = useMessageSources()

  return (
    <MessagePrimitive.Root className="aui-msg is-assistant">
      <div className="aui-bubble is-assistant">
        <HarnessSearchTrace />
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
          <ActionBarPrimitive.Copy className="aui-action-btn">Copy</ActionBarPrimitive.Copy>
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

function ComposerChrome() {
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
  } = useChatAuiSession()

  // Solo / Conversation handoff — classic ChatPage already consumed this; AUI is default.
  useEffect(() => {
    const prefill = consumeChatPrefill()
    if (prefill) aui.composer.setText(prefill)
  }, [aui.composer])

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
      <ProjectAgentStrip />
      <div className="aui-composer-modes" role="group" aria-label="Composer mode">
        {CHAT_COMPOSER_MODES.map((mode: ChatComposerMode) => {
          const Icon = MODE_ICONS[mode]
          return (
            <button
              key={mode}
              type="button"
              className={`aui-mode is-${mode}${composerMode === mode ? ' is-on' : ''}`}
              aria-pressed={composerMode === mode}
              disabled={busy}
              title={
                mode === 'ask'
                  ? 'Ask — read-only, no sandbox writes'
                  : mode === 'plan'
                    ? 'Plan — research then Build with Overseer'
                    : 'Agent — tools on'
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
      </div>

      <div className={`aui-tools${toolsExpanded ? ' is-expanded' : ''}`}>
        <button
          type="button"
          className="aui-tools-toggle"
          aria-expanded={toolsExpanded}
          aria-controls="aui-tools-panel"
          disabled={busy}
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
      </div>

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
            composerMode === 'ask'
              ? 'Ask DeepSeek (read-only)…'
              : composerMode === 'plan'
                ? 'Plan with DeepSeek…'
                : 'Message DeepSeek…'
          }
          rows={1}
          submitMode="enter"
          unstable_insertNewlineOnTouchEnter
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
              <ComposerPrimitive.Cancel className="aui-send is-stop" onClick={() => stopGeneration()}>
                Stop
              </ComposerPrimitive.Cancel>
            </AuiIf>
            <AuiIf condition={(s) => !s.thread.isRunning}>
              <ComposerPrimitive.Send className="aui-send">Send</ComposerPrimitive.Send>
            </AuiIf>
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

function ChatDeepAvatarStage({
  error,
  character,
  onCharacterChange,
}: {
  error?: string | null
  character: ReturnType<typeof useChatDeepAvatarCharacter>[0]
  onCharacterChange: ReturnType<typeof useChatDeepAvatarCharacter>[1]
}) {
  const mood = useChatDeepAvatarMood({ error })
  const lipLevel = useChatDeepAvatarLipLevel(mood)
  const isEmpty = useAuiState((s) => s.thread.isEmpty)
  if (isEmpty) return null
  return (
    <div className="aui-deep-avatar-stage">
      <ChatDeepAvatarBubble mood={mood} lipLevel={lipLevel} character={character} />
      <ChatDeepAvatarCharacterPicker
        character={character}
        onChange={onCharacterChange}
        compact
      />
    </div>
  )
}

export function ChatAuiThread() {
  const { historyReady, error, clearError, busy } = useChatAuiSession()
  const emptyMood = useChatDeepAvatarMood({ error })
  const emptyLips = useChatDeepAvatarLipLevel(emptyMood)
  const [avatarCharacter, setAvatarCharacter] = useChatDeepAvatarCharacter()

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
                  <ChatDeepAvatar
                    mood={emptyMood}
                    size="hero"
                    lipLevel={emptyLips}
                    character={avatarCharacter}
                    label="DeepSeek companion"
                    className="aui-empty-avatar"
                  />
                  <ChatDeepAvatarCharacterPicker
                    character={avatarCharacter}
                    onChange={setAvatarCharacter}
                  />
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
            <ComposerChrome />
          </ThreadPrimitive.ViewportFooter>
        </ThreadPrimitive.Viewport>

        {historyReady ? (
          <ChatDeepAvatarStage
            error={error}
            character={avatarCharacter}
            onCharacterChange={setAvatarCharacter}
          />
        ) : null}

        <ThreadPrimitive.ScrollToBottom className="aui-scroll-bottom">↓</ThreadPrimitive.ScrollToBottom>
      </ThreadPrimitive.Root>
    </div>
  )
}
