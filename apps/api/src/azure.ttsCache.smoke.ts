import assert from 'node:assert/strict'
import {
  rememberTtsClipForTests,
  resetTtsClipCacheForTests,
  ttsClipCacheKey,
  ttsClipCacheSizeForTests,
} from './azure.ts'

resetTtsClipCacheForTests()
assert.equal(ttsClipCacheSizeForTests(), 0)
assert.notEqual(ttsClipCacheKey('a', 'x'), ttsClipCacheKey('b', 'x'))

rememberTtsClipForTests('voice-a', '你好', Buffer.from([1, 2, 3]))
assert.equal(ttsClipCacheSizeForTests(), 1)
rememberTtsClipForTests('voice-a', '你好', Buffer.from([9]))
assert.equal(ttsClipCacheSizeForTests(), 1, 'same clip replaces, does not grow')

for (let i = 0; i < 60; i++) {
  rememberTtsClipForTests('voice-a', `line-${i}`, Buffer.from([i]))
}
assert.equal(ttsClipCacheSizeForTests(), 48, 'LRU must cap Azure clip memory')

resetTtsClipCacheForTests()
assert.equal(ttsClipCacheSizeForTests(), 0)
console.log('azure.ttsCache.smoke: ok')
