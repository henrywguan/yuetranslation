/**
 * Offline unit probe for iOS TTS unlock (no Azure / DeepSeek).
 *
 * Mocks HTMLAudioElement, stubs fetchTtsAudio via a tiny in-memory module graph.
 */
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'

type FakeEl = {
  src: string
  volume: number
  muted: boolean
  currentTime: number
  onended: (() => void) | null
  onerror: (() => void) | null
  playCount: number
  play: () => Promise<void>
  pause: () => void
  load: () => void
  setAttribute: (k: string, v: string) => void
  removeAttribute: (k: string) => void
}

const instances: FakeEl[] = []
let blockPlay = false

function makeEl(src = ''): FakeEl {
  const el: FakeEl = {
    src,
    volume: 1,
    muted: false,
    currentTime: 0,
    onended: null,
    onerror: null,
    playCount: 0,
    play() {
      el.playCount += 1
      if (blockPlay) {
        return Promise.reject(Object.assign(new Error('NotAllowedError'), { name: 'NotAllowedError' }))
      }
      return Promise.resolve()
    },
    pause() {},
    load() {},
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
// Keep the real URL constructor; only stub object-URL helpers used by tts.ts.
const RealURL = globalThis.URL
g.URL = class extends RealURL {
  static createObjectURL = () => 'blob:probe-tts'
  static revokeObjectURL = () => {}
}
g.fetch = async () => ({ ok: true })
g.speechSynthesis = {
  resume() {},
  cancel() {},
  speak() {},
}

async function main() {
  // Materialize a temp copy of tts.ts with api stubbed so we never touch network.
  const dir = join(tmpdir(), `tts-unlock-probe-${Date.now()}`)
  mkdirSync(dir, { recursive: true })
  const apiStub = `export async function fetchTtsAudio() {
  return new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/mpeg' })
}
`
  writeFileSync(join(dir, 'api.ts'), apiStub)
  writeFileSync(join(dir, 'types.ts'), `export type Lang = 'en' | 'yue'\n`)

  // Read real tts.ts and rewrite imports to local stubs.
  const { readFileSync } = await import('node:fs')
  let src = readFileSync(new URL('../src/lib/tts.ts', import.meta.url), 'utf8')
  src = src.replace("from './api'", "from './api.ts'").replace("from './types'", "from './types.ts'")
  writeFileSync(join(dir, 'tts.ts'), src)

  const tts = await import(pathToFileURL(join(dir, 'tts.ts')).href)

  console.log('instances before unlock', { count: instances.length })

  blockPlay = false
  tts.unlockTtsPlayback()
  await new Promise((r) => setTimeout(r, 40))

  const unlocked = tts.isTtsPlaybackUnlocked() as boolean
  console.log('after unlock', {
    unlocked,
    instanceCount: instances.length,
    playCount: instances[0]?.playCount ?? 0,
  })
  if (!unlocked) throw new Error('expected unlocked=true after unlockTtsPlayback')
  if (instances.length !== 1) throw new Error(`expected 1 shared Audio, got ${instances.length}`)

  tts.stopSpeaking()
  console.log('after stopSpeaking', { instanceCount: instances.length })
  if (instances.length !== 1) throw new Error('stopSpeaking must keep shared Audio')

  const beforeSpeak = instances.length
  const speakPromise = tts.speakText('hello', 'en') as Promise<void>
  await new Promise((r) => setTimeout(r, 40))
  instances[0]?.onended?.()
  await speakPromise

  console.log('after delayed speakText', {
    instanceCount: instances.length,
    beforeSpeak,
    playCount: instances[0]?.playCount ?? 0,
    reused: instances.length === beforeSpeak,
  })
  if (instances.length !== 1) throw new Error('speakText must reuse shared Audio')
  if ((instances[0]?.playCount ?? 0) < 2) {
    throw new Error('expected unlock play + speak play on same element')
  }

  // Contrast: blocked play still reuses element and rejects without throwing out.
  blockPlay = true
  const blocked = tts.speakText('blocked', 'en') as Promise<void>
  await new Promise((r) => setTimeout(r, 40))
  await blocked
  console.log('blocked play path exercised', {
    instanceCount: instances.length,
    playCount: instances[0]?.playCount ?? 0,
  })

  console.log('tts unlock probe PASS', {
    unlocked: tts.isTtsPlaybackUnlocked(),
    sharedInstances: instances.length,
  })
  console.log('PASS')
  rmSync(dir, { recursive: true, force: true })
}

main().catch((err) => {
  console.error('FAIL', err)
  process.exit(1)
})
