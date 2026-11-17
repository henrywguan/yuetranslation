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
import { ChatDictateButton } from '../../../components/ChatDictateButton'
import { DeepSeekMark } from '../../../components/DeepSeekMark'
import { SpeakButton } from '../../../components/SpeakButton'
import { chatSpeakLang } from '../../../lib/chatVoice'
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
  const {
    deepThink,
    setDeepThink,
    searchOn,
    setSearchOn,
    busy,
    thinking,
    searching,
    stopGeneration,
  } = useChatAuiSession()

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
        {thinking ? <span className="aui-status">Thinking…</span> : null}
        {searching ? <span className="aui-status">Searching…</span> : null}
      </div>
      <div className="aui-composer-row">
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
