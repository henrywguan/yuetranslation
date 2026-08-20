/**
 * Tiny reactive audio bridge: connects a mic MediaStream to an
 * AnalyserNode so the app background can read frequency data.
 *
 * Call `connectMicAnalyser(stream)` when the mic opens and
 * `disconnectMicAnalyser()` when it closes.
 * The background reads `getMicLevel()` every frame (0–1 float).
 */

let ctx: AudioContext | null = null
let analyser: AnalyserNode | null = null
let source: MediaStreamAudioSourceNode | null = null
let data: Uint8Array<ArrayBuffer> | null = null

export function connectMicAnalyser(stream: MediaStream) {
  disconnectMicAnalyser()
  try {
    ctx = new AudioContext()
    analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.82
    source = ctx.createMediaStreamSource(stream)
    source.connect(analyser)
    data = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>
  } catch {
    disconnectMicAnalyser()
  }
}

export function disconnectMicAnalyser() {
  try {
    source?.disconnect()
  } catch { /* ignore */ }
  try {
    ctx?.close()
  } catch { /* ignore */ }
  source = null
  analyser = null
  ctx = null
  data = null
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
