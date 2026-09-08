/**
 * Shared mic graph for visuals + Azure PCM.
 *
 * Azure’s own MediaStream AudioContext is closed on every session.stop(),
 * which leaves the next recognizer “listening” with no audio. We keep one
 * AudioContext for the page and push float samples ourselves.
 *
 * Do not connect the processor to ctx.destination — that plays (silent)
 * audio through the speakers and wrecks echo cancellation / STT accuracy.
 */

let ctx: AudioContext | null = null
let analyser: AnalyserNode | null = null
let source: MediaStreamAudioSourceNode | null = null
let processor: ScriptProcessorNode | null = null
let sink: MediaStreamAudioDestinationNode | null = null
let data: Uint8Array<ArrayBuffer> | null = null
let sourceStream: MediaStream | null = null

const pcmListeners = new Set<(samples: Float32Array) => void>()

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
    sink?.disconnect()
  } catch {
    /* ignore */
  }
  try {
    source?.disconnect()
  } catch {
    /* ignore */
  }
  processor = null
  sink = null
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
      // inputBuffer is reused — copy before the next process tick.
      const input = Float32Array.from(event.inputBuffer.getChannelData(0))
      for (const fn of pcmListeners) fn(input)
    }
    sink = ctx.createMediaStreamDestination()
    source.connect(processor)
    processor.connect(sink)
  } catch {
    try {
      processor?.disconnect()
    } catch {
      /* ignore */
    }
    processor = null
    sink = null
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

export function addMicPcmListener(fn: (samples: Float32Array) => void): () => void {
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
