import { attestAgainstLexicon } from './attest.js'
import { colloquialScore } from './colloquialScore.js'
import { dictionaryTranslate } from './dictionary.js'
import { glossStats, lookupGloss } from './gloss.js'
import { lexiconTranslate, lexiconStats, looksLikeGlossDump } from './lexiconTranslate.js'
import { scrubMandarinToYue } from './scrub.js'
import { hardenYueOutput } from './postProcess.js'
import { wordshkEnabled } from './licenseGate.js'
import { translate } from '../translate.js'

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

const apple = dictionaryTranslate({
  sourceLang: 'en',
  targetLang: 'yue',
  source: 'apple',
})
assert(apple?.text === '蘋果', `phrase apple failed: ${apple?.text}`)

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

// App translate API always coerces to final (no interim MT path).
const coerced = await translate({
  text: 'apple',
  from: 'en',
  to: 'yue',
  stage: 'interim',
})
assert(coerced.stage === 'final', `interim request must coerce to final, got ${coerced.stage}`)

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

const lexWhere = lexiconTranslate({
  sourceLang: 'en',
  targetLang: 'yue',
  source: 'where',
  wantAlternatives: true,
})
assert(lexWhere?.text, `lexicon EN→粵 where failed`)
assert(lexWhere && /邊/.test(lexWhere.text), `lexicon where unexpected: ${lexWhere?.text}`)

const lexSorry = lexiconTranslate({
  sourceLang: 'yue',
  targetLang: 'en',
  source: '對唔住',
})
assert(/sorry/i.test(lexSorry?.text || ''), `lexicon 粵→EN sorry failed: ${lexSorry?.text}`)

const lexSeg = lexiconTranslate({
  sourceLang: 'yue',
  targetLang: 'en',
  source: '地鐵',
})
assert(/mtr/i.test(lexSeg?.text || ''), `lexicon 地鐵 failed: ${lexSeg?.text}`)

// Segmented gloss joins must not ship as “translations” (live mic junk).
const lexJunk = lexiconTranslate({
  sourceLang: 'yue',
  targetLang: 'en',
  source: '你聽唔聽到我？',
})
assert(
  !lexJunk || lexJunk.kind === 'exact',
  `segmented 粵→EN junk should be rejected: ${JSON.stringify(lexJunk)}`,
)
const hearMe = dictionaryTranslate({
  sourceLang: 'yue',
  targetLang: 'en',
  source: '你聽唔聽到我？',
})
assert(/hear me/i.test(hearMe?.text || ''), `phrase 你聽唔聽到我？ failed: ${hearMe?.text}`)

const morningJunk = lexiconTranslate({
  sourceLang: 'yue',
  targetLang: 'en',
  source: '喂，早晨呀。',
})
assert(
  !morningJunk || !/particle|comma|full stop|answering phone/i.test(morningJunk.text),
  `morning greeting lexicon junk: ${JSON.stringify(morningJunk)}`,
)

// Stronger gloss-dump detector
assert(looksLikeGlossDump('(of answering phone calls) hello'), 'parenthetical sense should dump')
assert(looksLikeGlossDump('you 聽 not 聽 reach I'), 'mixed gloss join should dump')
assert(looksLikeGlossDump('softening particle hello'), 'meta particle dump')
assert(looksLikeGlossDump('obvious to not understand colloquial I me speak'), 'lemma list dump')
assert(!looksLikeGlossDump('Can you hear me?'), 'natural EN must pass')
assert(!looksLikeGlossDump('Hey, good morning'), 'short greeting must pass')
assert(
  !looksLikeGlossDump("Do you understand what I'm saying?"),
  'natural 6+ word question must pass',
)

const morningPhrase = dictionaryTranslate({
  sourceLang: 'yue',
  targetLang: 'en',
  source: '喂，早晨呀。',
})
assert(
  /good morning|hello/i.test(morningPhrase?.text || ''),
  `phrase 喂，早晨呀。 failed: ${morningPhrase?.text}`,
)

const understandJunk = lexiconTranslate({
  sourceLang: 'yue',
  targetLang: 'en',
  source: '明唔明白我講乜嘢？',
})
assert(
  !understandJunk || understandJunk.kind === 'exact',
  `understand lexicon should not segment: ${JSON.stringify(understandJunk)}`,
)
const understandPhrase = dictionaryTranslate({
  sourceLang: 'yue',
  targetLang: 'en',
  source: '明唔明白我講乜嘢？',
})
assert(
  /understand what i'?m saying/i.test(understandPhrase?.text || ''),
  `phrase 明唔明白我講乜嘢？ failed: ${understandPhrase?.text}`,
)
const understandTranslate = await translate({
  text: '明唔明白我講乜嘢？',
  from: 'yue',
  to: 'en',
  stage: 'final',
})
assert(
  !/obvious|question mark|colloquial|I \/ me/i.test(understandTranslate.text),
  `translate still dumped gloss: ${understandTranslate.text}`,
)
assert(
  /understand/i.test(understandTranslate.text) || understandTranslate.engine === 'demo',
  `expected natural EN or demo, got ${understandTranslate.engine}: ${understandTranslate.text}`,
)

// End-to-end offline path (dictionary / lexicon — no model required for these hits).
const offlineApple = await translate({ text: 'apple', from: 'en', to: 'yue', stage: 'final' })
assert(
  offlineApple.engine === 'dictionary' || offlineApple.engine === 'lexicon',
  `offline apple engine=${offlineApple.engine}`,
)
assert(offlineApple.text.includes('蘋') || offlineApple.text.includes('果'), offlineApple.text)

const offlineWhere = await translate({ text: 'where', from: 'en', to: 'yue', stage: 'final' })
assert(
  offlineWhere.engine === 'dictionary' || offlineWhere.engine === 'lexicon',
  `offline where engine=${offlineWhere.engine} text=${offlineWhere.text}`,
)

const stats = glossStats()
assert(stats.ccCanto > 1000, `expected CC-Canto pack loaded, got ${stats.ccCanto}`)
assert(wordshkEnabled() === false, 'wordshk should stay gated off')
const lex = lexiconStats()
assert(lex.enKeys > 1000, `expected EN reverse index, got ${lex.enKeys}`)

// 大家好 must never paint dictionary gloss dumps into the EN pane.
const helloAll = dictionaryTranslate({
  sourceLang: 'yue',
  targetLang: 'en',
  source: '大家好。',
})
assert(/everybody|everyone|hi|hello/i.test(helloAll?.text || ''), `大家好 phrase: ${helloAll?.text}`)
assert(
  !/greeting word|full stop/i.test(helloAll?.text || ''),
  `大家好 must not be a gloss dump: ${helloAll?.text}`,
)
assert(
  looksLikeGlossDump('It is a greeting word, "hi everybody" full stop'),
  'greeting-word dump must be detected',
)
assert(
  looksLikeGlossDump('It is a greeting word, "hi everybody"'),
  'greeting-word dump without full stop must be detected',
)
const helloLex = lexiconTranslate({
  sourceLang: 'yue',
  targetLang: 'en',
  source: '大家好。',
})
assert(
  !helloLex || !looksLikeGlossDump(helloLex.text),
  `lexicon must not return dump for 大家好: ${JSON.stringify(helloLex)}`,
)

console.log(
  JSON.stringify(
    {
      ok: true,
      dict: dict?.text,
      apple: apple?.text,
      lexWhere: lexWhere?.text,
      lexSorry: lexSorry?.text,
      offline: { apple: offlineApple, where: offlineWhere },
      scrubbed: scrubbed.text,
      scores: { good, bad },
      attestation: { good: attestGood, bad: attestBad },
      finalMeta: finalOk.meta,
      glossStats: stats,
      lexiconStats: lex,
      wordshkEnabled: wordshkEnabled(),
    },
    null,
    2,
  ),
)
