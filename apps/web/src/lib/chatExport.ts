/** Export / import / share helpers for DeepSeek Chat threads. */
import type { ChatMessage, ChatThread } from './chatHistory'

export function threadToMarkdown(thread: ChatThread): string {
  const lines = [`# ${thread.title.trim() || 'Chat'}`, '']
  for (const m of thread.messages) {
    const who = m.role === 'user' ? 'You' : 'DeepSeek'
    lines.push(`## ${who}`, '', m.content.trim() || '…', '')
    if (m.files?.length) {
      lines.push(`_Attachments: ${m.files.map((f) => f.filename).join(', ')}_`, '')
    } else if (m.fileIds?.length) {
      lines.push(`_Attachments: ${m.fileIds.length}_`, '')
    }
    if (m.sources?.length) {
      lines.push('### Sources')
      for (const s of m.sources) lines.push(`- [${s.title}](${s.url})`)
      lines.push('')
    }
  }
  return `${lines.join('\n').trim()}\n`
}

export function threadToJson(thread: ChatThread): string {
  return `${JSON.stringify(thread, null, 2)}\n`
}

export function downloadTextFile(filename: string, body: string, mime: string) {
  const blob = new Blob([body], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function safeExportBasename(title: string): string {
  const base = title.trim().replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').slice(0, 48)
  return base || 'chat'
}

/** Parse a pasted/exported thread JSON blob. */
export function parseImportedThread(raw: string): ChatThread | null {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const t = parsed as ChatThread
    if (typeof t.id !== 'string' || !Array.isArray(t.messages)) return null
    return {
      ...t,
      id: crypto.randomUUID?.() || `c_${Date.now().toString(36)}`,
      title: typeof t.title === 'string' && t.title.trim() ? t.title : 'Imported chat',
      updatedAt: Date.now(),
      pinned: Boolean(t.pinned),
      archived: Boolean(t.archived),
      messages: t.messages.filter(
        (m): m is ChatMessage =>
          Boolean(m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'),
      ),
    }
  } catch {
    return null
  }
}

const SHARE_KEY = 'yue-deepseek-chat-share-v1'

/** Stash a thread for same-origin “share link” handoff (`#/chat?share=1`). */
export function stashSharedThread(thread: ChatThread): string {
  const payload = JSON.stringify(thread)
  try {
    sessionStorage.setItem(SHARE_KEY, payload)
  } catch {
    /* ignore quota */
  }
  // Always hash-only on the site root — never `/chat?share=1#/chat`.
  return `${window.location.origin}/?share=1#/chat`
}

export function consumeSharedThread(): ChatThread | null {
  try {
    const raw = sessionStorage.getItem(SHARE_KEY)
    if (!raw) return null
    sessionStorage.removeItem(SHARE_KEY)
    return parseImportedThread(raw)
  } catch {
    return null
  }
}

const PREFILL_KEY = 'yue-deepseek-chat-prefill-v1'

export function stashChatPrefill(text: string) {
  const t = text.trim().slice(0, 12_000)
  if (!t) return
  try {
    sessionStorage.setItem(PREFILL_KEY, t)
  } catch {
    /* ignore */
  }
}

export function consumeChatPrefill(): string | null {
  try {
    const raw = sessionStorage.getItem(PREFILL_KEY)
    if (!raw) return null
    sessionStorage.removeItem(PREFILL_KEY)
    return raw
  } catch {
    return null
  }
}
