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

async function runCase(apple: boolean) {
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

  const dir = join(tmpdir(), `web-speech-smoke-${apple ? 'ios' : 'desk'}-${Date.now()}`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'tts.ts'), 'export function stopSpeaking() {}\n')
  writeFileSync(
    join(dir, 'mediaAccess.ts'),
    `export function isAppleTouchDevice() { return ${apple ? 'true' : 'false'} }\n`,
  )
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

  const session = createWebSpeechSession({
    onInterim: () => {},
    onFinal: () => {},
    onError: () => {},
    onStatus: () => {},
  }, 'en')
  assert.ok(session)

  await session!.start()
  await session!.stop()
  await session!.start()
  await session!.stop()

  assert.equal(instances.length, 2, `${apple ? 'ios' : 'desk'}: two recognizers`)
  assert.equal(instances[0]?.lang, 'en-US')
  if (apple) {
    assert.equal(instances[0]?.stopCount, 1, 'iOS must stop() not abort() — abort poisons the next tap')
    assert.equal(instances[0]?.abortCount, 0, 'iOS must not abort()')
    assert.equal(instances[1]?.stopCount, 1)
    assert.equal(instances[1]?.abortCount, 0)
  } else {
    assert.equal(instances[0]?.abortCount, 1, 'desktop stop() aborts to release the mic lock')
    assert.equal(instances[1]?.abortCount, 1)
  }

  const yueSession = createWebSpeechSession(
    {
      onInterim: () => {},
      onFinal: () => {},
      onError: () => {},
      onStatus: () => {},
    },
    'yue',
  )
  await yueSession!.start()
  assert.equal(instances[2]?.lang, 'zh-HK', 'Cantonese lock must use zh-HK, not English')
  await yueSession!.stop()
  rmSync(dir, { recursive: true, force: true })
}

await runCase(false)
await runCase(true)
console.log('webSpeech.smoke: ok (desktop abort + iOS stop)')
