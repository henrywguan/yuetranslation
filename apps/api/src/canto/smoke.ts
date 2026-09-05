import { attestAgainstLexicon } from './attest.js'
import { colloquialScore } from './colloquialScore.js'
import { dictionaryTranslate } from './dictionary.js'
import { glossStats, lookupGloss } from './gloss.js'
import { lexiconTranslate, lexiconStats, looksLikeGlossDump } from './lexiconTranslate.js'
import { scrubMandarinToYue } from './scrub.js'
import { scrubYueToCmn } from './scrubCmn.js'
import { hardenYueOutput } from './postProcess.js'
import { wordshkEnabled } from './licenseGate.js'
import { openaiConfigured } from '../env.js'
import { translate } from '../translate.js'
import { breakdown } from '../breakdown.js'

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

const birthday = dictionaryTranslate({
  sourceLang: 'en',
  targetLang: 'yue',
  source: 'birthday',
})
assert(birthday?.text === '生日', `birthday phrase failed: ${birthday?.text}`)

const happyBirthday = dictionaryTranslate({
  sourceLang: 'en',
  targetLang: 'yue',
  source: 'happy birthday',
})
assert(happyBirthday?.text === '生日快樂', `happy birthday phrase failed: ${happyBirthday?.text}`)

// Offline translate must prefer phrase memory over dated CC-Canto slang (牛一).
const offlineBirthday = await translate({ text: 'Birthday', from: 'en', to: 'yue' })
assert(offlineBirthday.text === '生日', `offline birthday: ${offlineBirthday.text}`)
assert(
  offlineBirthday.engine === 'dictionary',
  `birthday should be phrase memory, got ${offlineBirthday.engine}`,
)

const offlineHappyBday = await translate({ text: 'happy birthday', from: 'en', to: 'yue' })
assert(offlineHappyBday.text === '生日快樂', `offline happy birthday: ${offlineHappyBday.text}`)

const scrubbed = scrubMandarinToYue('你们在做什么？')
assert(scrubbed.changed, 'scrub should change Mandarin')
assert(!/们|什么/.test(scrubbed.text), `scrub left Mandarin: ${scrubbed.text}`)

const scrubbedCmn = scrubYueToCmn('你哋做緊咩？係唔係喺呢度？')
assert(scrubbedCmn.changed, 'reverse scrub should change Yue')
assert(!/哋|緊|咩|係|唔|喺|呢度/.test(scrubbedCmn.text), `reverse scrub left Yue: ${scrubbedCmn.text}`)
assert(/你们|在做|什么|是不是|在|这里/.test(scrubbedCmn.text), `reverse scrub missing Mandarin: ${scrubbedCmn.text}`)

const scrubPhrase = scrubYueToCmn('點解你哋冇鍾意一齊食？')
assert(scrubPhrase.changed, 'phrase reverse scrub should change')
assert(scrubPhrase.text.includes('为什么'), `expected 为什么: ${scrubPhrase.text}`)
assert(scrubPhrase.text.includes('没有') || scrubPhrase.text.includes('没'), `expected 没有: ${scrubPhrase.text}`)
assert(scrubPhrase.text.includes('喜欢'), `expected 喜欢: ${scrubPhrase.text}`)
assert(!/點解|哋|冇|鍾意/.test(scrubPhrase.text), `phrase reverse left Yue: ${scrubPhrase.text}`)

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

// App translate API always returns final (no interim MT path).
const finalOnly = await translate({
  text: 'apple',
  from: 'en',
  to: 'yue',
})
assert(finalOnly.stage === 'final', `translate must be final, got ${finalOnly.stage}`)

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

const sttVariant = dictionaryTranslate({
  sourceLang: 'yue',
  targetLang: 'en',
  source: '明明白我講乜嘢？',
})
assert(
  /understand what i'?m saying/i.test(sttVariant?.text || ''),
  `STT variant 明明白 should repair to phrase memory: ${sttVariant?.text}`,
)

const sttTranslate = await translate({
  text: '明明白我講乜嘢？',
  from: 'yue',
  to: 'en',
  stage: 'final',
})
assert(
  /understand/i.test(sttTranslate.text),
  `粵→EN STT variant failed: ${sttTranslate.engine} ${sttTranslate.text}`,
)
assert(!/[\u4e00-\u9fff]/.test(sttTranslate.text), `粵→EN must not echo Han: ${sttTranslate.text}`)

if (openaiConfigured()) {
  // Live model calls are opt-in — smoke:canto must stay offline-safe for Cloud agents.
  if (process.env.YUE_SMOKE_LIVE === '1') {
    const modelYue = await translate({
      text: 'Do you wanna Margarita?',
      from: 'en',
      to: 'yue',
      stage: 'final',
    })
    assert(
      /[\u4e00-\u9fff]/.test(modelYue.text),
      `model EN→粵 should return Cantonese, got ${modelYue.engine} "${modelYue.text}" notes=${JSON.stringify(modelYue.meta?.notes)}`,
    )
    assert(
      modelYue.engine === 'openai' || modelYue.engine === 'openai-compatible',
      `online misses must use the model, got ${modelYue.engine}`,
    )
  }
} else {
  // End-to-end offline path (dictionary / lexicon — no model configured).
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

  const offlineSentence = await translate({
    text: 'we love apples and bananas',
    from: 'en',
    to: 'yue',
    stage: 'final',
  })
  assert(
    /[\u4e00-\u9fff]/.test(offlineSentence.text),
    `translate we love apples failed: ${offlineSentence.engine} ${offlineSentence.text}`,
  )
}

// Phrase-memory hits stay dictionary even when a model key is present (zero-latency).
const onlineApple = await translate({ text: 'apple', from: 'en', to: 'yue', stage: 'final' })
assert(onlineApple.engine === 'dictionary', `apple must stay phrase memory, got ${onlineApple.engine}`)
assert(onlineApple.text.includes('蘋') || onlineApple.text.includes('果'), onlineApple.text)

const offlinePhrase = lexiconTranslate({
  sourceLang: 'en',
  targetLang: 'yue',
  source: 'we love apples and bananas',
})
assert(
  offlinePhrase?.kind === 'composed' && /[\u4e00-\u9fff]/.test(offlinePhrase.text),
  `composed EN phrase failed: ${JSON.stringify(offlinePhrase)}`,
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

const fruitBreakdown = await breakdown({ text: '我哋愛蘋果香牙蕉' })
const ngaaRow = fruitBreakdown.characters.find((c) => c.char === '牙')
assert(ngaaRow, 'breakdown missing 牙')
assert(
  ngaaRow!.meaning && !/Cantonese character/i.test(ngaaRow!.meaning),
  `expected contextual gloss for 牙, got ${JSON.stringify(ngaaRow!.meaning)}`,
)


// English learner breakdown (offline dictionary path — no model required).
const enBreakdown = await breakdown({ text: 'Happy birthday', lang: 'en' })
assert(enBreakdown.lang === 'en', `expected en breakdown lang, got ${enBreakdown.lang}`)
assert(enBreakdown.characters.some((c) => /birthday/i.test(c.char)), 'en breakdown missing birthday token')
assert(
  enBreakdown.characters.some((c) => c.meaning),
  'en breakdown should include at least one Cantonese gloss offline',
)

console.log(
  JSON.stringify(
    {
      ok: true,
      dict: dict?.text,
      apple: apple?.text,
      lexWhere: lexWhere?.text,
      lexSorry: lexSorry?.text,
      offline: { apple: onlineApple.text, engine: onlineApple.engine, composed: offlinePhrase?.text },
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
