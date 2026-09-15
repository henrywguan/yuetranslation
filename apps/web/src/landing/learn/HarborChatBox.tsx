import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { HARBOR_CHAT_MAX_LEN, sanitizeChatText } from './harborPresence'

export type HarborChatLine = {
  id: string
  userId: string
  username: string
  text: string
  t: number
  self?: boolean
}

type Props = {
  lines: HarborChatLine[]
  /** Hide while NPC dialogue strip owns the bottom (Talk mode). */
  hidden?: boolean
  disabled?: boolean
  placeholder?: string
  onSend: (text: string) => void
}

/**
 * RuneScape-style public chat: translucent log + input docked low-left.
 * Enter focuses / sends; Esc blurs so WASD / click-to-move stay free.
 */
export function HarborChatBox({
  lines,
  hidden,
  disabled,
  placeholder = 'Press Enter to chat…',
  onSend,
}: Props) {
  const [draft, setDraft] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = logRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [lines])

  useEffect(() => {
    if (hidden || disabled) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement | null)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
          return
        }
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hidden, disabled])

  if (hidden) return null

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const cleaned = sanitizeChatText(draft)
    if (!cleaned || disabled) return
    onSend(cleaned)
    setDraft('')
  }

  const onInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setDraft('')
      inputRef.current?.blur()
    }
  }

  return (
    <div className={`hq-chat${focused ? ' is-focused' : ''}`} aria-label="Public chat">
      <div className="hq-chat-log" ref={logRef} role="log" aria-live="polite">
        {lines.length === 0 ? (
          <p className="hq-chat-empty">Say hello to sailors on the river…</p>
        ) : (
          lines.map((line) => (
            <p key={line.id} className={`hq-chat-line${line.self ? ' is-self' : ''}`}>
              <span className="hq-chat-user">{line.username}</span>
              <span className="hq-chat-sep">: </span>
              <span className="hq-chat-text">{line.text}</span>
            </p>
          ))
        )}
      </div>
      <form className="hq-chat-form" onSubmit={submit}>
        <input
          ref={inputRef}
          className="hq-chat-input"
          type="text"
          value={draft}
          maxLength={HARBOR_CHAT_MAX_LEN}
          disabled={disabled}
          placeholder={disabled ? 'Sign in to chat with other sailors' : placeholder}
          aria-label="Chat message"
          autoComplete="off"
          spellCheck
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={onInputKey}
        />
        <button type="submit" className="hq-chat-send" disabled={disabled || !draft.trim()}>
          Say
        </button>
      </form>
    </div>
  )
}
