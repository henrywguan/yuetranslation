import {
  ActionBarPrimitive,
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  ThreadPrimitive,
  useAui,
  useAuiState,
  useMessagePartReasoning,
  useMessagePartText,
} from '@assistant-ui/react'
import { useEffect, useRef, useState } from 'react'
import { ChatDictateButton } from '../../../components/ChatDictateButton'
import { ChatPluginKeysModal } from '../../../components/ChatPluginKeysModal'
import { ChatSourcesList } from '../../../components/ChatShellExtras'
import { DeepSeekMark } from '../../../components/DeepSeekMark'
import { SpeakButton } from '../../../components/SpeakButton'
import type { DeepseekChatPluginKeyId } from '../../../lib/api'
import { consumeChatPrefill } from '../../../lib/chatExport'
import {
  LIVE_REASONING_PAINT,
  type ChatSearchStep,
  type ChatSource,
} from '../../../lib/chatHistory'
import { CHAT_EMPTY_SUGGESTIONS } from '../../../lib/chatUiPrefs'
import { chatSpeakLang, mergeDictateText } from '../../../lib/chatVoice'
import { renderChatMarkdown } from '../../../lib/renderChatMarkdown'
import { useChatAuiSession } from './ChatAuiRuntime'

const SUGGESTIONS = CHAT_EMPTY_SUGGESTIONS

/** URL source parts on the current assistant message (1-indexed `[n]` chips). */
function useMessageSources(): ChatSource[] {
  return useAuiState((s) => {
    const content = s.message.content
    if (!Array.isArray(content)) return []
    const out: ChatSource[] = []
    for (const part of content) {
      if (part.type !== 'source') continue
      if (part.sourceType !== 'url') continue
      const url = typeof part.url === 'string' ? part.url : ''
      if (!url) continue
      out.push({ url, title: (part.title || url).trim() || url })
    }
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

/** History list for the shell sidebar (sibling of main under `.ds-chat`). */
export function ChatAuiSidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <ThreadListPrimitive.Root className="aui-thread-list">
      <ThreadListPrimitive.New
        className="aui-new-thread"
        onClick={() => {
          onNavigate?.()
        }}
      >
        + New chat
      </ThreadListPrimitive.New>
      <ThreadListPrimitive.Items>
        {() => (
          <ThreadListItemPrimitive.Root className="aui-thread-item">
            <ThreadListItemPrimitive.Trigger
              className="aui-thread-trigger"
              onClick={() => {
                onNavigate?.()
              }}
            >
              <ThreadListItemPrimitive.Title />
            </ThreadListItemPrimitive.Trigger>
            <ThreadListItemPrimitive.Archive className="aui-thread-archive" title="Archive" />
            <ThreadListItemPrimitive.Delete className="aui-thread-delete" title="Delete" />
          </ThreadListItemPrimitive.Root>
        )}
      </ThreadListPrimitive.Items>
    </ThreadListPrimitive.Root>
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
  const {
    deepThink,
    setDeepThink,
    searchOn,
    setSearchOn,
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
  } = useChatAuiSession()

  // Solo / Conversation handoff — classic ChatPage already consumed this; AUI is default.
  useEffect(() => {
    const prefill = consumeChatPrefill()
    if (prefill) aui.composer.setText(prefill)
  }, [aui.composer])

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
    <ComposerPrimitive.Root className={`aui-composer${harnessOn ? ' is-harness' : ''}`}>
      <div className="aui-composer-toggles">
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
          disabled={busy}
          onClick={() => setPluginsOpen((v) => !v)}
        >
          Plugins{enabledPlugins.length ? ` · ${enabledPlugins.length}` : ''}
        </button>
        {thinking ? <span className="aui-status">Thinking…</span> : null}
        {searching ? <span className="aui-status">Searching…</span> : null}
      </div>

      {/* Plugins strip is Plugins-toggle only — Harness must not force it open. */}
      {pluginsOpen ? (
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

      <div className="aui-composer-row">
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
        <ComposerPrimitive.Input
          className="aui-composer-input"
          placeholder="Message DeepSeek…"
          rows={1}
          submitMode="enter"
          unstable_insertNewlineOnTouchEnter
        />
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
                  <DeepSeekMark className="aui-empty-mark" />
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

        <ThreadPrimitive.ScrollToBottom className="aui-scroll-bottom">↓</ThreadPrimitive.ScrollToBottom>
      </ThreadPrimitive.Root>
    </div>
  )
}
