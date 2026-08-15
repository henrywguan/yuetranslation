import { attestAgainstLexicon } from './attest.js'
import { colloquialScore } from './colloquialScore.js'
import { dictionaryTranslate } from './dictionary.js'
import { glossStats, lookupGloss } from './gloss.js'
import { scrubMandarinToYue } from './scrub.js'
import { hardenYueOutput } from './postProcess.js'
import { wordshkEnabled } from './licenseGate.js'

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg)
}

const dict = dictionaryTranslate({
  sourceLang: 'en',
  targetLang: 'yue',
  source: 'what are you doing?',
  wantAlternatives: true,
})
assert(dict?.text.includes('做緊'), `dict hit failed: ${dict?.text}`)
assert((dict?.alternatives.length || 0) >= 2, 'dict alts missing')

const scrubbed = scrubMandarinToYue('你们在做什么？')
assert(scrubbed.changed, 'scrub should change Mandarin')
assert(!/们|什么/.test(scrubbed.text), `scrub left Mandarin: ${scrubbed.text}`)

const good = colloquialScore('你做緊咩呀？')
const bad = colloquialScore('你们在做什么？')
assert(good > bad, `score order wrong good=${good} bad=${bad}`)

const interim = await hardenYueOutput({
  text: '你们在做什么？',
  stage: 'interim',
  client: null,
})
assert(interim.alternatives.length === 0, 'interim should drop alts')
assert(interim.meta.rewritten === false, 'interim must not rewrite')

const finalOk = await hardenYueOutput({
  text: '你做緊咩呀？',
  stage: 'final',
  client: null,
})
assert(
  (finalOk.meta.attestationCoverage || 0) >= 0.8,
  `expected strong CC-Canto attestation, got ${finalOk.meta.attestationCoverage}`,
)

const attestGood = attestAgainstLexicon('你做緊咩呀？')
const attestBad = attestAgainstLexicon('你们在做什么')
assert(attestGood.coverage > attestBad.coverage, 'attestation should prefer colloquial Canto')

const gloss地鐵 = lookupGloss('地鐵')
assert(gloss地鐵?.source === 'cc-canto', `expected cc-canto for 地鐵, got ${gloss地鐵?.source}`)

const stats = glossStats()
assert(stats.ccCanto > 1000, `expected CC-Canto pack loaded, got ${stats.ccCanto}`)
assert(wordshkEnabled() === false, 'wordshk should stay gated off')

console.log(
  JSON.stringify(
    {
      ok: true,
      dict: dict?.text,
      scrubbed: scrubbed.text,
      scores: { good, bad },
      attestation: { good: attestGood, bad: attestBad },
      finalMeta: finalOk.meta,
      glossStats: stats,
      wordshkEnabled: wordshkEnabled(),
    },
    null,
    2,
  ),
)
