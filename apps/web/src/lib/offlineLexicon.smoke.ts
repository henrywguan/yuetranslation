import assert from 'node:assert/strict'
import {
  offlineTranslate,
  setOfflinePack,
} from './offlineLexicon.ts'
import type { OfflinePackPayload } from './offlinePackTypes.ts'

const pack: OfflinePackPayload = {
  version: 1,
  id: 'essentials',
  builtAt: new Date(0).toISOString(),
  phrases: [
    {
      sourceLang: 'en',
      targetLang: 'yue',
      source: 'hello',
      text: '你好',
    },
  ],
  seed: {
    唔該: 'thanks / excuse me',
  },
  glossEntries: {
    翻譯: { gloss: 'translate / translation', jyutping: 'faan1 jik6' },
  },
}

setOfflinePack(pack)

const hello = offlineTranslate('en', 'yue', 'hello')
assert.ok(hello)
assert.equal(hello.text, '你好')
assert.ok(hello.notes.includes('offline:phrase'))

const mgoi = offlineTranslate('yue', 'en', '唔該')
assert.ok(mgoi)
assert.equal(mgoi.text, 'thanks')
assert.ok(mgoi.notes.includes('offline:seed'))

const fanjik = offlineTranslate('yue', 'en', '翻譯')
assert.ok(fanjik)
assert.equal(fanjik.text, 'translate')
assert.ok(fanjik.notes.includes('offline:gloss'))

const thankYouSeed = Object.entries(pack.seed).find(([, gloss]) =>
  normalizeGlossKey(gloss).includes('thank you'),
)
if (thankYouSeed) {
  const composed = offlineTranslate('en', 'yue', 'thank you')
  assert.ok(composed)
  assert.equal(composed.text, thankYouSeed[0])
  assert.ok(composed.notes.includes('offline:lexicon') || composed.notes.includes('offline:compose'))
}

function normalizeGlossKey(gloss: string): string {
  return gloss.trim().toLowerCase()
}

console.log('offlineLexicon.smoke: ok')
