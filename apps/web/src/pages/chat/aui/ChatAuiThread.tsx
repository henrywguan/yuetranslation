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
  useMessagePartSource,
  useMessagePartText,
} from '@assistant-ui/react'
import { useRef, useState } from 'react'
import { ChatDictateButton } from '../../../components/ChatDictateButton'
import { ChatPluginKeysModal } from '../../../components/ChatPluginKeysModal'
import { DeepSeekMark } from '../../../components/DeepSeekMark'
import { SpeakButton } from '../../../components/SpeakButton'
import type { DeepseekChatPluginKeyId } from '../../../lib/api'
import { chatSpeakLang, mergeDictateText } from '../../../lib/chatVoice'
import { renderChatMarkdown } from '../../../lib/renderChatMarkdown'
import { useChatAuiSession } from './ChatAuiRuntime'

const SUGGESTIONS = [
  'Explain quantum computing simply',
  'Draft a polite follow-up email',
  'Give me a 3-day city trip outline',
  'Help me debug this error message',
]

function MarkdownText() {
  const { text } = useMessagePartText()
  if (!text.trim()) return <span className="aui-msg-empty" aria-hidden />
  return <div className="aui-md">{renderChatMarkdown(text)}</div>
}

function ReasoningText() {
  const { text } = useMessagePartReasoning()
  if (!text?.trim()) return null
  return (
    <details className="aui-reasoning" open>
      <summary>DeepThink</summary>
      <pre>{text}</pre>
    </details>
  )
}

function SourceChip() {
  const part = useMessagePartSource()
  if (part.sourceType !== 'url') return null
  return (
    <a className="aui-source" href={part.url} target="_blank" rel="noreferrer">
      {part.title || part.url}
    </a>
  )
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

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="aui-msg is-assistant">
      <div className="aui-bubble is-assistant">
        <MessagePrimitive.Parts
          components={{
            Text: MarkdownText,
            Reasoning: ReasoningText,
            Source: SourceChip,
          }}
        />
      </div>
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

function ThreadSidebar() {
  return (
    <ThreadListPrimitive.Root className="aui-thread-list">
      <ThreadListPrimitive.New className="aui-new-thread">New chat</ThreadListPrimitive.New>
      <ThreadListPrimitive.Items>
        {() => (
          <ThreadListItemPrimitive.Root className="aui-thread-item">
            <ThreadListItemPrimitive.Trigger className="aui-thread-trigger">
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

  return (
    <ComposerPrimitive.Root className="aui-composer">
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

      {pluginsOpen ? (
        <div className="aui-plugins">
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
          <ul className="aui-plugin-list">
            {(pluginCatalog.length ? pluginCatalog : fallbackPlugins).map((p) => {
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
          <ComposerPrimitive.Cancel
            className="aui-send is-stop"
            onClick={() => stopGeneration()}
          >
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

export function ChatAuiThread({ sidebarOpen }: { sidebarOpen: boolean }) {
  const { historyReady, error, clearError, busy } = useChatAuiSession()

  return (
    <div className={`aui-layout${sidebarOpen ? ' is-sidebar-open' : ''}`}>
      <aside className="aui-sidebar" aria-label="Chat history">
        <div className="aui-sidebar-brand">
          <DeepSeekMark className="aui-sidebar-mark" />
          <span>History</span>
        </div>
        <ThreadSidebar />
      </aside>

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
