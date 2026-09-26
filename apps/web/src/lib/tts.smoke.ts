import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'

type FakeEl = {
  src: string
  volume: number
  muted: boolean
  currentTime: number
  onended: (() => void) | null
  onerror: (() => void) | null
  playCount: number
  pauseCount: number
  loadCount: number
  play: () => Promise<void>
  pause: () => void
  load: () => void
  setAttribute: (k: string, v: string) => void
  removeAttribute: (k: string) => void
}

const instances: FakeEl[] = []
let synthCancel = 0
let synthPause = 0
let synthResume = 0

function makeEl(src = ''): FakeEl {
  const el: FakeEl = {
    src,
    volume: 1,
    muted: false,
    currentTime: 0,
    onended: null,
    onerror: null,
    playCount: 0,
    pauseCount: 0,
    loadCount: 0,
    play() {
      el.playCount += 1
      return Promise.resolve()
    },
    pause() {
      el.pauseCount += 1
    },
    load() {
      el.loadCount += 1
    },
    setAttribute() {},
    removeAttribute(k: string) {
      if (k === 'src') el.src = ''
    },
  }
  instances.push(el)
  return el
}

const g = globalThis as unknown as Record<string, unknown>
g.window = globalThis
g.Audio = function Audio(_src?: string) {
  return makeEl(_src || '')
}
const RealURL = globalThis.URL
g.URL = class extends RealURL {
  static createObjectURL = () => 'blob:tts-smoke'
  static revokeObjectURL = () => {}
}
g.speechSynthesis = {
  resume() {
    synthResume += 1
  },
  pause() {
    synthPause += 1
  },
  cancel() {
    synthCancel += 1
  },
  speak() {},
}

const dir = join(tmpdir(), `tts-smoke-${Date.now()}`)
mkdirSync(dir, { recursive: true })
writeFileSync(
  join(dir, 'api.ts'),
  `let fetches = 0
export function fetchCount() { return fetches }
export async function fetchTtsAudio() {
  fetches += 1
  return new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/mpeg' })
}
`,
)
writeFileSync(join(dir, 'types.ts'), `export type Lang = 'en' | 'yue'\n`)
writeFileSync(
  join(dir, 'mediaAccess.ts'),
  `export function isAppleTouchDevice() { return false }\n`,
)
writeFileSync(
  join(dir, 'audioReactive.ts'),
  `export function ensureSharedAudioContext() {
  return {
    state: 'running',
    resume: async () => {},
    get destination() { return {} },
    createMediaElementSource() { throw new Error('no webaudio in smoke') },
    createGain() { return { gain: { value: 1 }, connect() {} } },
  }
}
export function resumeSharedAudioContext() {}\n`,
)
writeFileSync(
  join(dir, 'ttsVoices.ts'),
  `export function readLocalSichuanVoice() { return null }
export function readLocalCmnVoice() { return null }
export function readLocalWuuVoice() { return null }
export function readLocalEnVoice() { return null }
export function readLocalTlVoice() { return null }
export function readLocalEsVoice() { return null }
export function readLocalEsesVoice() { return null }
export function readLocalViVoice() { return null }
export function readLocalYueVoice() { return null }
`,
)

let src = readFileSync(new URL('./tts.ts', import.meta.url), 'utf8')
src = src
  .replace("from './api'", "from './api.ts'")
  .replace("from './types'", "from './types.ts'")
  .replace("from './ttsVoices'", "from './ttsVoices.ts'")
  .replace("from './mediaAccess'", "from './mediaAccess.ts'")
  .replace("from './audioReactive'", "from './audioReactive.ts'")
writeFileSync(join(dir, 'tts.ts'), src)

const tts = await import(pathToFileURL(join(dir, 'tts.ts')).href)

tts.unlockTtsPlayback()
await new Promise((r) => setTimeout(r, 20))
assert.equal(tts.isTtsPlaybackUnlocked(), true)
const playAfterFirst = instances[0]?.playCount ?? 0
tts.unlockTtsPlayback()
assert.equal(instances[0]?.playCount, playAfterFirst, 'second unlock is a no-op')
tts.unlockTtsPlayback({ force: true })
assert.ok((instances[0]?.playCount ?? 0) > playAfterFirst, 'force unlock after mic must replay silent WAV')
assert.equal(instances[0]?.volume, 1, 'force unlock uses speaker volume')

const speakPromise = tts.speakText('hello', 'en') as Promise<void>
await new Promise((r) => setTimeout(r, 20))
assert.equal(tts.isTtsPlaying(), true, 'speakText should be playing while waiting for ended')

const srcWhilePlaying = instances[0]?.src
const resumeBefore = synthResume
const playWhileSpeaking = instances[0]?.playCount ?? 0
tts.unlockTtsPlayback()
assert.equal(instances[0]?.src, srcWhilePlaying, 'unlock during TTS must not replace the clip with silent WAV')
assert.equal(synthResume, resumeBefore, 'unlock during TTS must not resume speechSynthesis')
assert.equal(instances[0]?.playCount, playWhileSpeaking, 'unlock during TTS must not replay silent WAV')

const loadBeforeDuck = instances[0]?.loadCount ?? 0
tts.duckTtsForMicBargeIn()
assert.equal(tts.isTtsPlaying(), false)
assert.equal(instances[0]?.volume, 0, 'duck must mute without resetting the element')
assert.equal(instances[0]?.loadCount, loadBeforeDuck, 'duck must not audio.load()')

const cancelBefore = synthCancel
const loadBefore = instances[0]?.loadCount ?? 0
const pauseBefore = instances[0]?.pauseCount ?? 0
tts.stopSpeaking({ preserveSession: true })
await speakPromise
assert.equal(synthCancel, cancelBefore, 'iOS barge-in must not speechSynthesis.cancel()')
assert.ok(synthPause >= 1, 'iOS barge-in pauses speechSynthesis instead of cancel')
assert.equal(instances[0]?.loadCount, loadBefore, 'preserveSession must not audio.load()')
assert.ok((instances[0]?.pauseCount ?? 0) > pauseBefore, 'preserveSession pauses HTMLAudio')
assert.equal(tts.isMicEchoMuted(), false, 'barge-in must not arm the 600ms echo tail')

tts.stopSpeaking()
assert.ok(synthCancel > cancelBefore, 'full stop may cancel speechSynthesis')
assert.ok((instances[0]?.loadCount ?? 0) > loadBefore, 'full stop loads to reset src')

const apiMod = (await import(pathToFileURL(join(dir, 'api.ts')).href)) as {
  fetchCount: () => number
}
tts.resetTtsAudioCacheForTests()
const before = apiMod.fetchCount() as number
const p1 = tts.loadTtsAudio('cache-me', 'en') as Promise<Blob | null>
const p2 = tts.loadTtsAudio('cache-me', 'en') as Promise<Blob | null>
await Promise.all([p1, p2])
assert.equal(apiMod.fetchCount(), before + 1, 'parallel loads must share one Azure fetch')
await tts.loadTtsAudio('cache-me', 'en')
assert.equal(apiMod.fetchCount(), before + 1, 'replay must not refetch TTS')
assert.equal(tts.ttsAudioCacheSizeForTests(), 1)

// --- iPhone loud path: Web Audio BufferSource, not HTMLAudio ---
const appleDir = join(tmpdir(), `tts-smoke-apple-${Date.now()}`)
mkdirSync(appleDir, { recursive: true })
writeFileSync(join(appleDir, 'api.ts'), readFileSync(join(dir, 'api.ts'), 'utf8'))
writeFileSync(join(appleDir, 'types.ts'), `export type Lang = 'en' | 'yue'\n`)
writeFileSync(join(appleDir, 'mediaAccess.ts'), `export function isAppleTouchDevice() { return true }\n`)
writeFileSync(
  join(appleDir, 'ttsVoices.ts'),
  readFileSync(join(dir, 'ttsVoices.ts'), 'utf8'),
)
rmSync(dir, { recursive: true, force: true })

const appleCtx = {
  state: 'running' as string,
  resume: async () => {
    appleCtx.state = 'running'
  },
  destination: {},
  decodeCalls: 0,
  bufferStarts: 0,
  oscStarts: 0,
  async decodeAudioData(_buf: ArrayBuffer) {
    appleCtx.decodeCalls += 1
    return { duration: 0.4, sampleRate: 16000, numberOfChannels: 1, length: 64 }
  },
  createOscillator() {
    return {
      frequency: { value: 0 },
      connect() {},
      disconnect() {},
      start() {
        appleCtx.oscStarts += 1
      },
      stop() {},
    }
  },
  createGain() {
    return { gain: { value: 1 }, connect() {}, disconnect() {} }
  },
  createBufferSource() {
    return {
      buffer: null as unknown,
      playbackRate: { value: 1 },
      onended: null as (() => void) | null,
      connect() {},
      disconnect() {},
      start() {
        appleCtx.bufferStarts += 1
        queueMicrotask(() => this.onended?.())
      },
      stop() {},
    }
  },
  createMediaElementSource() {
    throw new Error('iPhone loud path must not wire MediaElementSource')
  },
}

writeFileSync(
  join(appleDir, 'audioReactive.ts'),
  `const ctx = globalThis.__appleTtsCtx
export function ensureSharedAudioContext() { return ctx }
export function resumeSharedAudioContext() { return ctx.resume() }
`,
)
;(globalThis as unknown as { __appleTtsCtx: typeof appleCtx }).__appleTtsCtx = appleCtx

writeFileSync(join(appleDir, 'tts.ts'), src)
const appleTts = await import(pathToFileURL(join(appleDir, 'tts.ts')).href)

appleTts.unlockTtsPlayback({ force: true })
assert.ok(appleTts.ttsKeepAliveArmedForTests(), 'force unlock arms iPhone keep-alive')
assert.ok(appleCtx.oscStarts >= 1, 'keep-alive oscillator starts in the gesture')

appleTts.resetTtsAudioCacheForTests()
await appleTts.speakText('louder please', 'yue', null, { loud: true })
assert.ok(appleCtx.decodeCalls >= 1, 'loud iPhone TTS decodes through Web Audio')
assert.ok(appleCtx.bufferStarts >= 1, 'loud iPhone TTS starts a BufferSource')

rmSync(appleDir, { recursive: true, force: true })
console.log('tts.smoke: ok (barge-in preserveSession + clip cache + iPhone loud Web Audio)')
