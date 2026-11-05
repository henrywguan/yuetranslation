/**
 * Dev helper: seed a heavy-but-under-256KB DeepSeek Chat history to reproduce
 * `#/chat` open hangs without calling paid APIs.
 *
 * Usage (Vite DEV console after page load):
 *   window.__seedHeavyChatHistory()
 * then navigate to `/#/chat` (or reload on that route).
 */

import { CHAT_HYDRATE_MAX_RAW_BYTES } from './chatHistory'

const STORAGE_KEY = 'yue-deepseek-chat-v1'

/** Markdown-ish assistant body — exercises renderChatMarkdown on promote. */
function fatMarkdown(seed: number, targetChars: number): string {
  const block = [
    `## Answer ${seed}`,
    '',
    'Here is a structured reply with **bold**, *italic*, and a list:',
    '',
    '- Point one with `inline code`',
    '- Point two with a [link](https://example.com/docs)',
    '- Point three',
    '',
    '```ts',
    `function demo${seed}(x: number) { return x * ${seed} }`,
    '```',
    '',
    '| Col A | Col B |',
    '| --- | --- |',
    `| ${seed} | ${seed * 2} |`,
    '',
    'Paragraph padding: ',
  ].join('\n')
  let out = block
  while (out.length < targetChars) out += `pad-${seed}-${'詞'.repeat(20)} `
  return out.slice(0, targetChars)
}

export type HeavyChatSeedResult = {
  rawBytes: number
  threadCount: number
  messagesPerThread: number
  underCap: boolean
}

/** Build + write localStorage fixture. Safe to call repeatedly. */
export function seedHeavyChatHistory(opts?: {
  /** Target raw JSON size (default ~220KB, under 256KB clear-cap). */
  targetRawBytes?: number
  threadCount?: number
  messagesPerThread?: number
}): HeavyChatSeedResult {
  const targetRawBytes = opts?.targetRawBytes ?? 220_000
  const threadCount = opts?.threadCount ?? 3
  const messagesPerThread = opts?.messagesPerThread ?? 24
  // Content sized so stringify lands near targetRawBytes without exceeding cap.
  const perContent = Math.max(
    800,
    Math.floor((targetRawBytes * 0.85) / (threadCount * messagesPerThread)),
  )

  const now = Date.now()
  const threads = Array.from({ length: threadCount }, (_, ti) => {
    const messages = Array.from({ length: messagesPerThread }, (_, mi) => {
      const isUser = mi % 2 === 0
      const id = `fixture-t${ti}-m${mi}`
      if (isUser) {
        return {
          id,
          role: 'user' as const,
          content: `User turn ${ti}.${mi}: please explain topic ${mi} in detail with examples.`,
          createdAt: now - (threadCount - ti) * 100_000 - (messagesPerThread - mi) * 1000,
        }
      }
      const keepReasoning = mi >= messagesPerThread - 8
      return {
        id,
        role: 'assistant' as const,
        content: fatMarkdown(ti * 100 + mi, perContent),
        createdAt: now - (threadCount - ti) * 100_000 - (messagesPerThread - mi) * 1000 + 1,
        ...(keepReasoning
          ? {
              reasoning: `DeepThink trace ${ti}.${mi}: ${'思考'.repeat(400)}`,
              thoughtMs: 1200 + mi * 10,
            }
          : null),
        sources:
          mi % 6 === 1
            ? [{ url: 'https://example.com/a', title: 'Example source A' }]
            : undefined,
      }
    })
    return {
      id: `fixture-thread-${ti}`,
      title: `Heavy fixture thread ${ti + 1}`,
      updatedAt: now - ti * 1000,
      messages,
    }
  })

  let raw = JSON.stringify(threads)
  // Trim content if somehow over cap; grow pad thread if under.
  if (raw.length > CHAT_HYDRATE_MAX_RAW_BYTES - 1024) {
    const scale = (CHAT_HYDRATE_MAX_RAW_BYTES - 2048) / raw.length
    for (const t of threads) {
      for (const m of t.messages) {
        if (m.role === 'assistant' && m.content.length > 200) {
          m.content = m.content.slice(0, Math.max(200, Math.floor(m.content.length * scale)))
        }
        if (m.reasoning && m.reasoning.length > 200) {
          m.reasoning = m.reasoning.slice(0, Math.max(200, Math.floor(m.reasoning.length * scale)))
        }
      }
    }
    raw = JSON.stringify(threads)
  }

  localStorage.setItem(STORAGE_KEY, raw)
  return {
    rawBytes: raw.length,
    threadCount,
    messagesPerThread,
    underCap: raw.length <= CHAT_HYDRATE_MAX_RAW_BYTES,
  }
}

declare global {
  interface Window {
    __seedHeavyChatHistory?: typeof seedHeavyChatHistory
  }
}

/** Attach console helper in DEV. */
export function installHeavyChatSeedHelper(): void {
  if (typeof window === 'undefined') return
  window.__seedHeavyChatHistory = seedHeavyChatHistory
}
