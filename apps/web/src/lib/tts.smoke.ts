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
  join(dir, 'ttsVoices.ts'),
  `export function readLocalSichuanVoice() { return null }
export function readLocalCmnVoice() { return null }
export function readLocalWuuVoice() { return null }
export function readLocalEnVoice() { return null }
export function readLocalTlVoice() { return null }
export function readLocalEsVoice() { return null }
export function readLocalViVoice() { return null }
export function readLocalYueVoice() { return null }
`,
)

let src = readFileSync(new URL('./tts.ts', import.meta.url), 'utf8')
src = src
  .replace("from './api'", "from './api.ts'")
  .replace("from './types'", "from './types.ts'")
  .replace("from './ttsVoices'", "from './ttsVoices.ts'")
writeFileSync(join(dir, 'tts.ts'), src)

const tts = await import(pathToFileURL(join(dir, 'tts.ts')).href)

tts.unlockTtsPlayback()
await new Promise((r) => setTimeout(r, 20))
assert.equal(tts.isTtsPlaybackUnlocked(), true)

const speakPromise = tts.speakText('hello', 'en') as Promise<void>
await new Promise((r) => setTimeout(r, 20))
assert.equal(tts.isTtsPlaying(), true, 'speakText should be playing while waiting for ended')

const srcWhilePlaying = instances[0]?.src
const resumeBefore = synthResume
tts.unlockTtsPlayback()
assert.equal(instances[0]?.src, srcWhilePlaying, 'unlock during TTS must not replace the clip with silent WAV')
assert.equal(synthResume, resumeBefore, 'unlock during TTS must not resume speechSynthesis')

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

rmSync(dir, { recursive: true, force: true })
console.log('tts.smoke: ok (barge-in preserveSession + clip cache)')
