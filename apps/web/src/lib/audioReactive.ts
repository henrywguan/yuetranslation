/**
 * Shared mic graph for visuals + Azure PCM.
 *
 * Azure’s own MediaStream AudioContext is closed on every session.stop(),
 * which leaves the next recognizer “listening” with no audio. We keep one
 * AudioContext for the page and push 16-bit PCM ourselves.
 */

let ctx: AudioContext | null = null
let analyser: AnalyserNode | null = null
let source: MediaStreamAudioSourceNode | null = null
let processor: ScriptProcessorNode | null = null
let silentGain: GainNode | null = null
let data: Uint8Array<ArrayBuffer> | null = null
let sourceStream: MediaStream | null = null

const pcmListeners = new Set<(buf: ArrayBuffer) => void>()

function floatTo16BitPcm(input: Float32Array): ArrayBuffer {
  const out = new ArrayBuffer(input.length * 2)
  const view = new DataView(out)
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i] ?? 0))
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return out
}

function isUsableContext(c: AudioContext | null): c is AudioContext {
  return Boolean(c && c.state !== 'closed')
}

/** Create or reuse the page-lifetime AudioContext. Safe to call in a gesture. */
export function ensureSharedAudioContext(): AudioContext {
  if (!isUsableContext(ctx)) {
    ctx = new AudioContext()
  }
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }
  return ctx
}

/** Gesture-time resume so the next STT turn is not stuck in a suspended context. */
export function resumeSharedAudioContext(): void {
  if (!isUsableContext(ctx)) return
  if (ctx.state === 'suspended') void ctx.resume()
}

export function getSharedAudioSampleRate(): number {
  return isUsableContext(ctx) ? ctx.sampleRate : 16000
}

function teardownGraphNodes() {
  try {
    processor?.disconnect()
  } catch {
    /* ignore */
  }
  try {
    silentGain?.disconnect()
  } catch {
    /* ignore */
  }
  try {
    source?.disconnect()
  } catch {
    /* ignore */
  }
  processor = null
  silentGain = null
  source = null
  analyser = null
  data = null
  sourceStream = null
}

function ensureProcessor() {
  if (processor || !ctx || !source) return
  try {
    processor = ctx.createScriptProcessor(4096, 1, 1)
    processor.onaudioprocess = (event) => {
      if (!pcmListeners.size) return
      const input = event.inputBuffer.getChannelData(0)
      const pcm = floatTo16BitPcm(input)
      for (const fn of pcmListeners) fn(pcm)
    }
    silentGain = ctx.createGain()
    silentGain.gain.value = 0
    source.connect(processor)
    processor.connect(silentGain)
    silentGain.connect(ctx.destination)
  } catch {
    try {
      processor?.disconnect()
    } catch {
      /* ignore */
    }
    processor = null
    silentGain = null
  }
}

/**
 * Attach the live mic to the shared graph.
 * Does not clone tracks — Azure reads PCM from this same graph.
 */
export function connectMicAnalyser(stream: MediaStream) {
  const liveTracks = stream.getAudioTracks().filter((t) => t.readyState === 'live')
  if (!liveTracks.length) return

  if (source && sourceStream === stream && isUsableContext(ctx)) {
    void ctx.resume()
    ensureProcessor()
    return
  }

  teardownGraphNodes()
  try {
    const context = ensureSharedAudioContext()
    analyser = context.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.82
    sourceStream = stream
    source = context.createMediaStreamSource(stream)
    source.connect(analyser)
    data = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>
    ensureProcessor()
  } catch {
    teardownGraphNodes()
  }
}

/** Disconnect nodes and cloned helpers — never close the shared AudioContext. */
export function disconnectMicAnalyser() {
  teardownGraphNodes()
}

export function addMicPcmListener(fn: (buf: ArrayBuffer) => void): () => void {
  pcmListeners.add(fn)
  ensureProcessor()
  return () => {
    pcmListeners.delete(fn)
  }
}

/** Returns 0–1 normalised RMS energy from mic frequency data. */
export function getMicLevel(): number {
  if (!analyser || !data) return 0
  analyser.getByteFrequencyData(data)
  let sum = 0
  for (let i = 0; i < data.length; i++) sum += data[i]
  const avg = sum / data.length / 255
  return Math.min(avg * 2.2, 1)
}

export function __resetSharedAudioForTests() {
  teardownGraphNodes()
  pcmListeners.clear()
  if (ctx && ctx.state !== 'closed') {
    try {
      void ctx.close()
    } catch {
      /* ignore */
    }
  }
  ctx = null
}
