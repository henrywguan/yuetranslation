import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'

type Rec = {
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  lang: string
  onresult: ((ev: unknown) => void) | null
  onerror: ((ev: { error: string }) => void) | null
  onend: (() => void) | null
  startCount: number
  abortCount: number
  stopCount: number
  start: () => void
  stop: () => void
  abort: () => void
}

const instances: Rec[] = []

function makeRec(): Rec {
  const rec: Rec = {
    continuous: false,
    interimResults: false,
    maxAlternatives: 1,
    lang: '',
    onresult: null,
    onerror: null,
    onend: null,
    startCount: 0,
    abortCount: 0,
    stopCount: 0,
    start() {
      rec.startCount += 1
      if (instances.some((other) => other !== rec && other.startCount > other.abortCount + other.stopCount)) {
        throw new Error('InvalidStateError: recognition already started')
      }
    },
    stop() {
      rec.stopCount += 1
      queueMicrotask(() => rec.onend?.())
    },
    abort() {
      rec.abortCount += 1
      queueMicrotask(() => rec.onend?.())
    },
  }
  instances.push(rec)
  return rec
}

const g = globalThis as unknown as Record<string, unknown>
g.window = globalThis
g.SpeechRecognition = function SpeechRecognition() {
  return makeRec()
}
g.webkitSpeechRecognition = g.SpeechRecognition

const dir = join(tmpdir(), `web-speech-smoke-${Date.now()}`)
mkdirSync(dir, { recursive: true })
writeFileSync(join(dir, 'tts.ts'), 'export function stopSpeaking() {}\n')
writeFileSync(join(dir, 'mediaAccess.ts'), 'export function isAppleTouchDevice() { return false }\n')
writeFileSync(
  join(dir, 'echoGuard.ts'),
  `export function createEchoGuard() {
  return { shouldIgnoreMic() { return false }, setPlaybackActive() {} }
}
`,
)
writeFileSync(
  join(dir, 'types.ts'),
  `export type Lang = 'en' | 'yue' | 'cmn' | 'wuu' | 'tl' | 'es' | 'vi'
export type LiveSession = { start(): Promise<void>; stop(): Promise<void>; setPlaybackActive(a: boolean): void }
export type SpeechEventHandlers = {
  onInterim: (lang: Lang, text: string) => void
  onFinal: (lang: Lang, text: string) => void
  onError: (message: string) => void
  onStatus: (status: 'listening' | 'idle' | 'speaking') => void
}
`,
)

let src = readFileSync(new URL('./webSpeech.ts', import.meta.url), 'utf8')
src = src
  .replace("from './tts'", "from './tts.ts'")
  .replace("from './echoGuard'", "from './echoGuard.ts'")
  .replace("from './mediaAccess'", "from './mediaAccess.ts'")
  .replace("from './types'", "from './types.ts'")
writeFileSync(join(dir, 'webSpeech.ts'), src)

const { createWebSpeechSession } = await import(pathToFileURL(join(dir, 'webSpeech.ts')).href)

const events: string[] = []
const session = createWebSpeechSession({
  onInterim: () => events.push('interim'),
  onFinal: () => events.push('final'),
  onError: (m: string) => events.push(`error:${m}`),
  onStatus: (s: string) => events.push(`status:${s}`),
}, 'en')

assert.ok(session, 'expected a Web Speech session')

await session!.start()
assert.equal(instances.length, 1, 'first start creates one recognizer')
assert.equal(instances[0]?.startCount, 1)
assert.ok(events.includes('status:listening'))

await session!.stop()
assert.equal(instances[0]?.abortCount, 1, 'stop() must abort so the browser releases the mic lock')
assert.ok(events.includes('status:idle'))

await session!.start()
assert.equal(instances.length, 2, 'second start uses a fresh recognizer')
assert.equal(instances[1]?.startCount, 1)
assert.equal(instances[0]?.startCount, 1, 'old recognizer must not be started again')

await session!.stop()
assert.equal(instances[1]?.abortCount, 1)

rmSync(dir, { recursive: true, force: true })
console.log('webSpeech.smoke: ok', {
  recognizers: instances.length,
  firstAbort: instances[0]?.abortCount,
  secondAbort: instances[1]?.abortCount,
})
