/**
 * DeepSeek Chat voice client — TTS (incl. yue) + ASR + streaming sentence speak.
 * Does not touch Solo live-mic / Azure STT paths.
 */
import {
  fetchDeepseekChatTtsAudio,
  transcribeDeepseekChatAudio as apiTranscribeDeepseekChatAudio,
  type ChatTtsVoiceId,
} from './api'
import { unlockTtsPlayback } from './tts'

export type { ChatTtsVoiceId }

/** Split buffered stream text into speakable sentences (mirrors API helper). */
export function splitSpeakableChunks(buffer: string): { ready: string[]; rest: string } {
  const ready: string[] = []
  let rest = buffer
  // Latin sentences need a trailing space (stream mid-word safe).
  // CJK 。！？ end the clause immediately — no space required.
  const re = /[\s\S]*?(?:[.!?…]["')\]]*\s+|[。！？]["')\]]*|\n{2,})/g
  let match: RegExpExecArray | null
  let lastIndex = 0
  while ((match = re.exec(rest)) != null) {
    const chunk = match[0].trim()
    if (!chunk) break
    if (chunk.length >= 8 || /[.!?。！？…]/.test(chunk)) {
      ready.push(chunk)
      lastIndex = match.index + match[0].length
    } else {
      break
    }
  }
  rest = rest.slice(lastIndex)
  return { ready, rest }
}

/** POST /api/chat/tts → playable Audio blob. */
export async function fetchDeepseekChatTts(
  text: string,
  opts?: { voiceId?: ChatTtsVoiceId; signal?: AbortSignal },
): Promise<Blob> {
  return fetchDeepseekChatTtsAudio(text, opts)
}

/** Play a DeepSeek TTS blob; returns when playback ends or is stopped. */
export async function playDeepseekChatTtsBlob(
  blob: Blob,
  opts?: { signal?: AbortSignal },
): Promise<void> {
  unlockTtsPlayback()
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  audio.preload = 'auto'
  const stop = () => {
    try {
      audio.pause()
    } catch {
      /* ignore */
    }
    URL.revokeObjectURL(url)
  }
  if (opts?.signal) {
    if (opts.signal.aborted) {
      stop()
      return
    }
    opts.signal.addEventListener('abort', stop, { once: true })
  }
  try {
    await new Promise<void>((resolve, reject) => {
      audio.onended = () => resolve()
      audio.onerror = () => reject(new Error('TTS playback failed'))
      void audio.play().catch(reject)
    })
  } finally {
    stop()
  }
}

export async function speakDeepseekChatText(
  text: string,
  opts?: { voiceId?: ChatTtsVoiceId; signal?: AbortSignal },
): Promise<void> {
  const blob = await fetchDeepseekChatTts(text, opts)
  await playDeepseekChatTtsBlob(blob, { signal: opts?.signal })
}

/** Upload recorded audio for DeepSeek ASR. */
export async function transcribeDeepseekChatAudio(
  blob: Blob,
  opts?: { filename?: string; signal?: AbortSignal },
): Promise<string> {
  return apiTranscribeDeepseekChatAudio(blob, opts)
}

/**
 * Stream-friendly speaker: feed answer deltas; speaks completed sentences via
 * DeepSeek TTS as they arrive, then flushes the remainder on `finish()`.
 */
export class StreamingDeepseekChatTts {
  private buffer = ''
  private queue: Promise<void> = Promise.resolve()
  private controller = new AbortController()
  private voiceId: ChatTtsVoiceId

  constructor(opts?: { voiceId?: ChatTtsVoiceId }) {
    this.voiceId = opts?.voiceId || 'stella'
  }

  get signal() {
    return this.controller.signal
  }

  stop() {
    this.controller.abort()
    this.controller = new AbortController()
    this.buffer = ''
    this.queue = Promise.resolve()
  }

  feed(delta: string) {
    if (!delta || this.controller.signal.aborted) return
    this.buffer += delta
    const { ready, rest } = splitSpeakableChunks(this.buffer)
    this.buffer = rest
    for (const chunk of ready) this.enqueue(chunk)
  }

  async finish() {
    const leftover = this.buffer.trim()
    this.buffer = ''
    if (leftover) this.enqueue(leftover)
    await this.queue
  }

  private enqueue(text: string) {
    const chunk = text.trim()
    if (!chunk) return
    this.queue = this.queue.then(async () => {
      if (this.controller.signal.aborted) return
      try {
        await speakDeepseekChatText(chunk, {
          voiceId: this.voiceId,
          signal: this.controller.signal,
        })
      } catch {
        /* swallow per-chunk TTS errors so the stream continues */
      }
    })
  }
}
