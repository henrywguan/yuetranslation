import assert from 'node:assert/strict'
import { bindMicBackgroundRelease, shouldReleaseMicForVisibility } from './micPrivacy.ts'

assert.equal(shouldReleaseMicForVisibility('hidden'), true)
assert.equal(shouldReleaseMicForVisibility('visible'), false)

const listeners = new Map<string, Set<EventListenerOrEventListenerObject>>()
function add(target: string, type: string, fn: EventListenerOrEventListenerObject) {
  const key = `${target}:${type}`
  const set = listeners.get(key) ?? new Set()
  set.add(fn)
  listeners.set(key, set)
}
function fire(target: string, type: string) {
  const set = listeners.get(`${target}:${type}`)
  if (!set) throw new Error(`no listener for ${target}:${type}`)
  for (const fn of set) {
    if (typeof fn === 'function') fn(new Event(type))
  }
}

type Listen = (type: string, fn: EventListenerOrEventListenerObject) => void
const g = globalThis as unknown as {
  document: { visibilityState: string; addEventListener: Listen; removeEventListener: Listen }
  window: { addEventListener: Listen; removeEventListener: Listen }
}
g.document = {
  visibilityState: 'visible',
  addEventListener: (type, fn) => add('document', type, fn),
  removeEventListener: (type, fn) => {
    listeners.get(`document:${type}`)?.delete(fn)
  },
}
g.window = {
  addEventListener: (type, fn) => add('window', type, fn),
  removeEventListener: (type, fn) => {
    listeners.get(`window:${type}`)?.delete(fn)
  },
}

let n = 0
const unbind = bindMicBackgroundRelease(() => {
  n += 1
})

g.document.visibilityState = 'visible'
fire('document', 'visibilitychange')
assert.equal(n, 0, 'visible must not release the mic')

g.document.visibilityState = 'hidden'
fire('document', 'visibilitychange')
assert.equal(n, 1, 'hidden must release the mic')

fire('window', 'pagehide')
assert.equal(n, 2, 'pagehide must release even if JS may freeze next')

fire('window', 'freeze')
assert.equal(n, 3, 'freeze must release')

unbind()
g.document.visibilityState = 'hidden'
fire('document', 'visibilitychange')
assert.equal(n, 3, 'unbind must drop listeners')

console.log('micPrivacy.smoke: ok')
