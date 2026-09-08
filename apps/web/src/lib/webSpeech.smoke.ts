import assert from 'node:assert/strict'

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
g.speechSynthesis = { resume() {}, cancel() {}, speak() {} }
g.Audio = function Audio() {
  return {
    src: '',
    volume: 1,
    muted: false,
    currentTime: 0,
    onended: null,
    onerror: null,
    play: () => Promise.resolve(),
    pause() {},
    load() {},
    setAttribute() {},
    removeAttribute() {},
  }
}
g.navigator = { userAgent: 'Mozilla/5.0', platform: 'Linux', maxTouchPoints: 0, mediaDevices: {} }
g.localStorage = {
  getItem: () => null,
  setItem() {},
  removeItem() {},
}

const { createWebSpeechSession } = await import('./webSpeech.ts')

const events: string[] = []
const session = createWebSpeechSession({
  onInterim: () => events.push('interim'),
  onFinal: () => events.push('final'),
  onError: (m) => events.push(`error:${m}`),
  onStatus: (s) => events.push(`status:${s}`),
}, 'en')

assert.ok(session, 'expected a Web Speech session')

await session!.start()
assert.equal(instances.length, 1, 'first start creates one recognizer')
assert.equal(instances[0]?.startCount, 1)
assert.ok(events.includes('status:listening'))

await session!.stop()
assert.equal(instances[0]?.abortCount, 1, 'stop() must abort so the browser releases the mic lock')
assert.ok(events.includes('status:idle'))

// Second start must not throw “already started” — the first recognizer has ended.
await session!.start()
assert.equal(instances.length, 2, 'second start uses a fresh recognizer')
assert.equal(instances[1]?.startCount, 1)
assert.equal(instances[0]?.startCount, 1, 'old recognizer must not be started again')

await session!.stop()
assert.equal(instances[1]?.abortCount, 1)

console.log('webSpeech.smoke: ok', {
  recognizers: instances.length,
  firstAbort: instances[0]?.abortCount,
  secondAbort: instances[1]?.abortCount,
})
