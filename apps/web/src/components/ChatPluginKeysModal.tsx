import { useEffect, useId, useState } from 'react'
import {
  saveDeepseekChatPluginKeys,
  type DeepseekChatPluginKeyHint,
  type DeepseekChatPluginKeyId,
} from '../lib/api'

const FIELDS: Array<{
  id: DeepseekChatPluginKeyId
  label: string
  placeholder: string
  help: string
}> = [
  {
    id: 'image',
    label: 'OpenAI Images',
    placeholder: 'sk-…',
    help: 'For the built-in generate_image tool (DALL·E / gpt-image).',
  },
  {
    id: 'higgsfield',
    label: 'Higgsfield MCP',
    placeholder: 'Bearer token from Higgsfield MCP OAuth',
    help: 'Paste a Bearer from your Higgsfield MCP session — bills your Higgsfield credits.',
  },
  {
    id: 'adobe',
    label: 'Adobe for creativity',
    placeholder: 'Bearer token from Adobe MCP OAuth',
    help: 'Paste a Bearer from Adobe’s creativity MCP session.',
  },
  {
    id: 'cursor',
    label: 'Cursor MCP',
    placeholder: 'Bearer token (when Cursor publishes a remote MCP)',
    help: 'Optional until Cursor ships a hosted generation endpoint.',
  },
]

type Props = {
  open: boolean
  initialHints: Record<DeepseekChatPluginKeyId, DeepseekChatPluginKeyHint>
  focusId?: DeepseekChatPluginKeyId | null
  onClose: () => void
  onSaved: (hints: Record<DeepseekChatPluginKeyId, DeepseekChatPluginKeyHint>) => void
}

export function ChatPluginKeysModal({ open, initialHints, focusId, onClose, onSaved }: Props) {
  const titleId = useId()
  const [drafts, setDrafts] = useState<Record<DeepseekChatPluginKeyId, string>>({
    image: '',
    higgsfield: '',
    adobe: '',
    cursor: '',
  })
  const [hints, setHints] = useState(initialHints)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setHints(initialHints)
    setDrafts({ image: '', higgsfield: '', adobe: '', cursor: '' })
    setError(null)
    setNote(null)
  }, [open, initialHints])

  useEffect(() => {
    if (!open || !focusId) return
    const el = document.getElementById(`ds-plugin-key-${focusId}`)
    el?.focus()
  }, [open, focusId])

  if (!open) return null

  const save = async () => {
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      const keys: Partial<Record<DeepseekChatPluginKeyId, string>> = {}
      for (const f of FIELDS) {
        const v = drafts[f.id].trim()
        if (v) keys[f.id] = v
      }
      if (!Object.keys(keys).length) {
        setError('Enter at least one key to save, or use Clear on a row.')
        return
      }
      const next = await saveDeepseekChatPluginKeys({ keys })
      setHints(next)
      setDrafts({ image: '', higgsfield: '', adobe: '', cursor: '' })
      setNote('Keys saved. They stay on your account — not in Vercel env.')
      onSaved(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  const clearOne = async (id: DeepseekChatPluginKeyId) => {
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      const next = await saveDeepseekChatPluginKeys({ clear: [id] })
      setHints(next)
      setDrafts((d) => ({ ...d, [id]: '' }))
      setNote(`Cleared ${id}.`)
      onSaved(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clear failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ds-chat-keys-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ds-chat-keys-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ds-chat-keys-head">
          <h2 id={titleId}>Plugin API keys</h2>
          <button type="button" className="ds-chat-keys-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <p className="ds-chat-keys-lead">
          Bring your own keys for image generation and MCP connectors. Stored encrypted for your
          signed-in account — not shared Vercel env vars.
        </p>
        <ul className="ds-chat-keys-list">
          {FIELDS.map((f) => {
            const hint = hints[f.id]
            return (
              <li key={f.id}>
                <label htmlFor={`ds-plugin-key-${f.id}`}>
                  <span className="ds-chat-keys-label">{f.label}</span>
                  <span className="ds-chat-keys-help">{f.help}</span>
                </label>
                <div className="ds-chat-keys-row">
                  <input
                    id={`ds-plugin-key-${f.id}`}
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={
                      hint.set ? `Saved ········${hint.hint || ''}` : f.placeholder
                    }
                    value={drafts[f.id]}
                    disabled={busy}
                    onChange={(e) => setDrafts((d) => ({ ...d, [f.id]: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="ds-chat-keys-clear"
                    disabled={busy || !hint.set}
                    onClick={() => void clearOne(f.id)}
                  >
                    Clear
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
        {error ? <p className="ds-chat-keys-error">{error}</p> : null}
        {note ? <p className="ds-chat-keys-note">{note}</p> : null}
        <footer className="ds-chat-keys-foot">
          <button type="button" className="ds-chat-keys-cancel" disabled={busy} onClick={onClose}>
            Close
          </button>
          <button type="button" className="ds-chat-keys-save" disabled={busy} onClick={() => void save()}>
            {busy ? 'Saving…' : 'Save keys'}
          </button>
        </footer>
      </div>
    </div>
  )
}
