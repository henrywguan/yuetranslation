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
  /** Sticky kill switch — survives controller rotation so queued chunks stay dead. */
  private stopped = false
  private gen = 0

  constructor(opts?: { voiceId?: ChatTtsVoiceId }) {
    this.voiceId = opts?.voiceId || 'stella'
  }

  get signal() {
    return this.controller.signal
  }

  stop() {
    this.stopped = true
    this.gen += 1
    this.controller.abort()
    this.buffer = ''
    // Do not replace the controller here — in-flight speakDeepseekChatText
    // still holds the aborted signal. A fresh controller is created on next feed.
  }

  feed(delta: string) {
    if (!delta || this.stopped) return
    if (this.controller.signal.aborted) {
      this.controller = new AbortController()
    }
    this.buffer += delta
    const { ready, rest } = splitSpeakableChunks(this.buffer)
    this.buffer = rest
    for (const chunk of ready) this.enqueue(chunk)
  }

  async finish() {
    if (this.stopped) return
    const leftover = this.buffer.trim()
    this.buffer = ''
    if (leftover) this.enqueue(leftover)
    await this.queue
  }

  /** Re-arm after a prior stop (new assistant turn). */
  reset() {
    this.stopped = false
    this.buffer = ''
    this.controller = new AbortController()
    this.queue = Promise.resolve()
    this.gen += 1
  }

  private enqueue(text: string) {
    const chunk = text.trim()
    if (!chunk || this.stopped) return
    const gen = this.gen
    const signal = this.controller.signal
    this.queue = this.queue.then(async () => {
      if (this.stopped || this.gen !== gen || signal.aborted) return
      try {
        await speakDeepseekChatText(chunk, {
          voiceId: this.voiceId,
          signal,
        })
      } catch {
        /* swallow per-chunk TTS errors so the stream continues */
      }
    })
  }
}

/** Encode Float32 PCM → 16-bit mono WAV (DeepSeek ASR input). */
export function encodeWavFromAudioBuffer(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels
  const rate = buffer.sampleRate
  const length = buffer.length
  const mono = new Float32Array(length)
  for (let c = 0; c < channels; c += 1) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < length; i += 1) mono[i]! += data[i]! / channels
  }
  const pcm = new Int16Array(length)
  for (let i = 0; i < length; i += 1) {
    const s = Math.max(-1, Math.min(1, mono[i]!))
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  const dataSize = pcm.length * 2
  const out = new ArrayBuffer(44 + dataSize)
  const view = new DataView(out)
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i += 1) view.setUint8(offset + i, str.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, rate, true)
  view.setUint32(28, rate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, dataSize, true)
  let offset = 44
  for (let i = 0; i < pcm.length; i += 1) {
    view.setInt16(offset, pcm[i]!, true)
    offset += 2
  }
  return new Blob([out], { type: 'audio/wav' })
}

/** Convert a MediaRecorder blob (webm/ogg) into 16-bit WAV for DeepSeek ASR. */
export async function mediaBlobToWav(blob: Blob): Promise<Blob> {
  if (/audio\/wav|audio\/wave|audio\/x-wav/i.test(blob.type)) return blob
  const ctx = new AudioContext()
  try {
    const raw = await blob.arrayBuffer()
    const decoded = await ctx.decodeAudioData(raw.slice(0))
    return encodeWavFromAudioBuffer(decoded)
  } finally {
    void ctx.close()
  }
}
