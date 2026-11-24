import type { ThreadMessageLike } from '@assistant-ui/react'
import type { ChatMessage } from '../../../lib/chatHistory'
import { LIVE_REASONING_KEEP, LIVE_REASONING_PAINT } from '../../../lib/chatHistory'

/**
 * Map device-local ChatMessage → assistant-ui ThreadMessageLike.
 * Reasoning + sources become first-class parts; search steps ride in metadata.custom.
 */
export function convertChatMessage(
  message: ChatMessage,
  opts?: { streamingId?: string | null },
): ThreadMessageLike {
  const streaming = Boolean(opts?.streamingId && opts.streamingId === message.id)

  if (message.role === 'user') {
    const content: ThreadMessageLike['content'] = [{ type: 'text', text: message.content || '' }]
    return {
      id: message.id,
      role: 'user',
      createdAt: new Date(message.createdAt),
      content,
      attachments: message.files?.length
        ? message.files.map((f) => ({
            id: f.fileId,
            type: 'file' as const,
            name: f.filename,
            contentType: f.mime || 'application/octet-stream',
            content: [],
            status: { type: 'complete' as const },
          }))
        : undefined,
      metadata: {
        custom: {
          fileIds: message.fileIds,
          files: message.files,
        },
      },
    }
  }

  const parts: Array<
    | { type: 'reasoning'; text: string }
    | { type: 'text'; text: string }
    | { type: 'source'; sourceType: 'url'; id: string; url: string; title?: string }
  > = []

  if (message.reasoning?.trim()) {
    parts.push({
      type: 'reasoning',
      // Streaming: feed only the paint tail into assistant-ui (96k parts freeze React).
      // Settled: keep the larger live buffer for expand/collapse.
      text: message.reasoning.slice(-(streaming ? LIVE_REASONING_PAINT : LIVE_REASONING_KEEP)),
    })
  }

  parts.push({ type: 'text', text: message.content || '' })

  if (message.sources?.length) {
    for (let i = 0; i < message.sources.length; i++) {
      const s = message.sources[i]!
      parts.push({
        type: 'source',
        sourceType: 'url',
        id: `src-${message.id}-${i}`,
        url: s.url,
        title: s.title || s.url,
      })
    }
  }

  return {
    id: message.id,
    role: 'assistant',
    createdAt: new Date(message.createdAt),
    content: parts,
    status: streaming
      ? { type: 'running' }
      : message.content.trim()
        ? { type: 'complete', reason: 'stop' }
        : // Empty settled rows must not stay `running` — that leaves Stop/caret stuck after Ask hangs.
          { type: 'incomplete', reason: 'cancelled' },
    metadata: {
      custom: {
        thoughtMs: message.thoughtMs,
        searchSteps: message.searchSteps,
        alternates: message.alternates,
        activeAlternate: message.activeAlternate,
      },
      timing: message.thoughtMs
        ? {
            streamStartTime: message.createdAt,
            totalStreamTime: message.thoughtMs,
            totalChunks: 0,
            toolCallCount: 0,
          }
        : undefined,
    },
  }
}
