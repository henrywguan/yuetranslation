import assert from 'node:assert/strict'
import { readLastTalk, writeLastTalk } from './practicePartnerLastTalk.ts'

const store = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
  },
})

assert.equal(readLastTalk(), null)
writeLastTalk({ kind: 'situation', situation: 'dimsum' })
assert.deepEqual(readLastTalk(), { kind: 'situation', situation: 'dimsum' })
writeLastTalk({ kind: 'open' })
assert.deepEqual(readLastTalk(), { kind: 'open' })
store.set('yue-practice-partner-last-talk-v1', JSON.stringify({ kind: 'situation', situation: 'debate' }))
assert.equal(readLastTalk(), null)

console.log('practicePartnerLastTalk.smoke: ok')
