import assert from 'node:assert/strict'

let closeCount = 0
let resumeCount = 0
const hooked = {
  onaudioprocess: null as ((ev: { inputBuffer: { getChannelData: () => Float32Array } }) => void) | null,
}

const speakers = { id: 'speakers' }
let connectedToSpeakers = false

class FakeAudioContext {
  state = 'running' as AudioContext['state']
  sampleRate = 48000
  destination = speakers
  createAnalyser() {
    return {
      fftSize: 0,
      smoothingTimeConstant: 0,
      frequencyBinCount: 8,
      connect() {},
      disconnect() {},
      getByteFrequencyData(out: Uint8Array) {
        out.fill(32)
      },
    }
  }
  createMediaStreamSource(_stream: unknown) {
    return { connect() {}, disconnect() {} }
  }
  createScriptProcessor() {
    return {
      set onaudioprocess(fn: typeof hooked.onaudioprocess) {
        hooked.onaudioprocess = fn
      },
      get onaudioprocess() {
        return hooked.onaudioprocess
      },
      connect(node: { id?: string }) {
        if (node === speakers || node?.id === 'speakers') connectedToSpeakers = true
      },
      disconnect() {},
    }
  }
  createMediaStreamDestination() {
    return { id: 'msdest', stream: { getAudioTracks: () => [] }, connect() {}, disconnect() {} }
  }
  createGain() {
    return {
      gain: { value: 1 },
      connect(node: { id?: string }) {
        if (node === speakers || node?.id === 'speakers') connectedToSpeakers = true
      },
      disconnect() {},
    }
  }
  resume() {
    resumeCount += 1
    this.state = 'running'
    return Promise.resolve()
  }
  close() {
    closeCount += 1
    this.state = 'closed'
    return Promise.resolve()
  }
}

const g = globalThis as unknown as Record<string, unknown>
g.window = globalThis
g.AudioContext = FakeAudioContext
g.webkitAudioContext = FakeAudioContext

const audio = await import('./audioReactive.ts')

const stream = {
  getAudioTracks: () => [{ readyState: 'live', clone() { return { readyState: 'live' } } }],
} as unknown as MediaStream

audio.connectMicAnalyser(stream)
const ctx1 = audio.ensureSharedAudioContext()
assert.equal(ctx1.sampleRate, 48000)
assert.equal(audio.getSharedAudioSampleRate(), 48000)

assert.equal(connectedToSpeakers, false, 'PCM graph must not connect to ctx.destination')

const chunks: Float32Array[] = []
const unsub = audio.addMicPcmListener((buf) => chunks.push(buf))
if (!hooked.onaudioprocess) throw new Error('PCM processor should be attached')

const samples = new Float32Array(8)
samples[0] = 0.5
samples[1] = -0.5
hooked.onaudioprocess({
  inputBuffer: { getChannelData: () => samples },
})
assert.equal(chunks.length, 1, 'listener receives PCM')
assert.equal(chunks[0]![0], 0.5)
assert.equal(chunks[0]![1], -0.5)
assert.notEqual(chunks[0], samples, 'listener must receive a copy of the input buffer')

audio.disconnectMicAnalyser()
assert.equal(closeCount, 0, 'disconnect must not close the shared AudioContext')

audio.connectMicAnalyser(stream)
const ctx2 = audio.ensureSharedAudioContext()
assert.equal(ctx1, ctx2, 'second mic turn reuses the same AudioContext')

audio.resumeSharedAudioContext()
;(ctx2 as { state: string }).state = 'suspended'
audio.resumeSharedAudioContext()
assert.ok(resumeCount >= 1, 'resumeSharedAudioContext resumes a suspended context')

unsub()
audio.__resetSharedAudioForTests()

console.log('audioReactive.smoke: ok', { closeCount, resumeCount, pcmChunks: chunks.length })
