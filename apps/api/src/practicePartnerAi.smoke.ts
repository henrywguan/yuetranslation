/**
 * Offline smoke for Practice Partner say-this drill (no DeepSeek / Azure).
 * Covers persona, JSON parse, verdict normalize, and DEMAND / JUDGE turn wrapping.
 */
import assert from 'node:assert/strict'
import {
  PRACTICE_PARTNER_BANNED_PASS_DEFAULTS,
  PRACTICE_PARTNER_CATEGORY_IDS,
  PRACTICE_PARTNER_CATEGORY_META,
  PRACTICE_PARTNER_DIFFICULTY_IDS,
  PRACTICE_PARTNER_DIFFICULTY_META,
  PRACTICE_PARTNER_FAIL_OPENERS,
  PRACTICE_PARTNER_PASS_OPENERS,
  PRACTICE_PARTNER_SYSTEM,
  PracticePartnerChatBodySchema,
  buildPracticePartnerTurn,
  categoryLockLine,
  difficultyLockLine,
  normalizeVerdict,
  parsePracticePartnerReply,
  practicePartnerSampling,
  recentSpeakOpenings,
  resolvePracticePartnerCategory,
  resolvePracticePartnerDifficulty,
  sanitizeSpeak,
  speakOpeningKey,
} from './practicePartnerAi.js'

assert.match(PRACTICE_PARTNER_SYSTEM, /港灣/, 'persona stays 港灣')
assert.match(PRACTICE_PARTNER_SYSTEM, /drill sergeant|maximum-anger|unhinged/i, 'mean-tutor voice')
assert.match(PRACTICE_PARTNER_SYSTEM, /THE DEMAND/, 'demand phase')
assert.match(PRACTICE_PARTNER_SYSTEM, /THE JUDGMENT/, 'judgment phase')
assert.match(PRACTICE_PARTNER_SYSTEM, /Jyutping/, 'Jyutping required on the card')
assert.match(PRACTICE_PARTNER_SYSTEM, /json object/i, 'structured JSON for the UI loop')
assert.match(PRACTICE_PARTNER_SYSTEM, /Azure TTS/, 'TTS-safe speak line')
assert.match(PRACTICE_PARTNER_SYSTEM, /CATEGORY LOCK/, 'deck lock')
assert.match(PRACTICE_PARTNER_SYSTEM, /DIFFICULTY LOCK/, 'difficulty lock')
assert.match(PRACTICE_PARTNER_SYSTEM, /Do not put Jyutping romanization/, 'speak stays 漢字 + English')
assert.match(PRACTICE_PARTNER_SYSTEM, /PASS VARIETY/, 'pass-line bank in the system prompt')
assert.match(PRACTICE_PARTNER_SYSTEM, /FAIL VARIETY/, 'fail-line bank in the system prompt')
assert.ok(PRACTICE_PARTNER_PASS_OPENERS.length >= 24, 'enough pass openers to rotate')
assert.ok(PRACTICE_PARTNER_FAIL_OPENERS.length >= 12, 'enough fail openers to rotate')
assert.ok(
  PRACTICE_PARTNER_BANNED_PASS_DEFAULTS.some((s) => s.includes('啱喇')),
  'bans the looping 哼。啱喇 default',
)
assert.ok(
  !PRACTICE_PARTNER_PASS_OPENERS.includes('哼。啱喇' as (typeof PRACTICE_PARTNER_PASS_OPENERS)[number]),
  'bank does not re-teach the banned default',
)
assert.doesNotMatch(PRACTICE_PARTNER_SYSTEM, /warm Cantonese practice partner/, 'old soft persona retired')
assert.equal(speakOpeningKey('  哼。啱喇。 Next. 狗  '), '哼。啱喇。 Next. 狗')
assert.deepEqual(
  recentSpeakOpenings([
    { role: 'assistant', content: '哼。勉強過關。 Next 狗' },
    { role: 'user', content: '狗' },
    { role: 'assistant', content: 'Acceptable. Barely. Next 貓' },
    { role: 'user', content: '貓' },
  ]),
  [speakOpeningKey('哼。勉強過關。 Next 狗'), speakOpeningKey('Acceptable. Barely. Next 貓')],
)
assert.equal(practicePartnerSampling(null).temperature, 0.7)
assert.ok(
  practicePartnerSampling({ en: 'dog', zh: '狗', jyutping: 'gau2' }).temperature > 0.8,
  'judge turns sample hotter for variety',
)

assert.deepEqual([...PRACTICE_PARTNER_CATEGORY_IDS], ['animals', 'foods', 'common', 'expert'])
assert.equal(resolvePracticePartnerCategory('foods'), 'foods')
assert.equal(resolvePracticePartnerCategory('nope'), 'common')
assert.match(categoryLockLine('animals'), /\[CATEGORY\] animals/)
assert.match(PRACTICE_PARTNER_CATEGORY_META.expert.examples, /語氣|尷尬|亂噏/)

assert.deepEqual(
  [...PRACTICE_PARTNER_DIFFICULTY_IDS],
  ['new_learner', 'abc', 'mainlander'],
)
assert.equal(resolvePracticePartnerDifficulty('mainlander'), 'mainlander')
assert.equal(resolvePracticePartnerDifficulty('nope'), 'abc')
assert.match(difficultyLockLine('new_learner'), /\[DIFFICULTY\] new_learner/)
assert.match(difficultyLockLine('new_learner'), /ENGLISH MAJORITY/)
assert.match(difficultyLockLine('abc'), /CANTONESE MAJORITY/)
assert.match(difficultyLockLine('mainlander'), /ALL CANTONESE/)
assert.match(difficultyLockLine('mainlander'), /stern|mocking/i)
assert.match(PRACTICE_PARTNER_DIFFICULTY_META.mainlander.labelZh, /大陸/)

assert.equal(normalizeVerdict('PASS'), 'pass')
assert.equal(normalizeVerdict('correct'), 'pass')
assert.equal(normalizeVerdict('WRONG'), 'fail')
assert.equal(normalizeVerdict('incorrect'), 'fail')
assert.equal(normalizeVerdict('none'), 'none')
assert.equal(normalizeVerdict(''), 'none')

assert.equal(sanitizeSpeak('Fine. **Correct.** 對唔住'), 'Fine. Correct. 對唔住')
assert.ok(!sanitizeSpeak('```json\n{"speak":"x"}\n```').includes('```'))

const kickoff = parsePracticePartnerReply(
  JSON.stringify({
    speak: 'Say it now. 對唔住，我唔記得帶功課. Or face the consequences.',
    verdict: 'none',
    advance: false,
    en: 'I am sorry I forgot my homework',
    zh: '對唔住，我唔記得帶功課',
    jyutping: 'deoi3 m4 zyu6, ngo5 m4 gei3 dak1 daai3 gung1 fo3',
  }),
)
assert.equal(kickoff.drill.verdict, 'none')
assert.equal(kickoff.drill.advance, false, 'only a pass advances')
assert.match(kickoff.speak, /對唔住/)
assert.equal(kickoff.drill.zh, '對唔住，我唔記得帶功課')

const fail = parsePracticePartnerReply(
  '```json\n' +
    JSON.stringify({
      speak: 'WRONG! That tone was completely flat! Try again! 對唔住，我唔記得帶功課.',
      verdict: 'fail',
      advance: true,
      en: 'I am sorry I forgot my homework',
      zh: '對唔住，我唔記得帶功課',
      jyutping: 'deoi3 m4 zyu6, ngo5 m4 gei3 dak1 daai3 gung1 fo3',
    }) +
    '\n```',
)
assert.equal(fail.drill.verdict, 'fail')
assert.equal(fail.drill.advance, false, 'fail must not advance even if the model sets advance=true')

const pass = parsePracticePartnerReply(
  JSON.stringify({
    speak: 'Fine. Correct. Next. 我要凍檸檬茶，少甜.',
    verdict: 'pass',
    advance: false,
    en: 'I want iced lemon tea, less sweet',
    zh: '我要凍檸檬茶，少甜',
    jyutping: 'ngo5 jiu3 dung3 ning4 mung1 caa4, siu2 tim4',
  }),
)
assert.equal(pass.drill.verdict, 'pass')
assert.equal(pass.drill.advance, true, 'pass always advances to the next phrase')
assert.equal(pass.drill.en, 'I want iced lemon tea, less sweet')

const previous = {
  en: 'I am sorry I forgot my homework',
  zh: '對唔住，我唔記得帶功課',
  jyutping: 'deoi3 m4 zyu6, ngo5 m4 gei3 dak1 daai3 gung1 fo3',
}
const recovered = parsePracticePartnerReply(
  JSON.stringify({
    speak: 'Try again. 對唔住',
    verdict: 'fail',
    advance: false,
  }),
  previous,
)
assert.equal(recovered.drill.zh, previous.zh, 'missing target fields fall back to the active drill')

assert.throws(
  () => parsePracticePartnerReply('hello there, no json and no drill'),
  /missing drill phrase/,
)

const empty = buildPracticePartnerTurn([], null, 'animals', 'new_learner')
assert.match(empty.turn, /\[DEMAND\]/)
assert.match(empty.turn, /\[CATEGORY\] animals/)
assert.match(empty.turn, /\[DIFFICULTY\] new_learner/)
assert.equal(empty.history.length, 0)

const judge = buildPracticePartnerTurn(
  [
    { role: 'assistant', content: 'Say 對唔住 now.' },
    { role: 'user', content: '對唔住，我唔記得帶功課' },
  ],
  previous,
  'common',
  'mainlander',
)
assert.equal(judge.history.length, 1)
assert.match(judge.turn, /\[JUDGE\]/)
assert.match(judge.turn, /\[CATEGORY\] common/)
assert.match(judge.turn, /\[DIFFICULTY\] mainlander/)
assert.match(judge.turn, /TARGET ZH: 對唔住/)
assert.match(judge.turn, /LEARNER SAID: 對唔住，我唔記得帶功課/)
assert.match(judge.turn, /MUST stay in this \[CATEGORY\]/)
assert.match(judge.turn, /Obey \[DIFFICULTY\]/)
assert.match(judge.turn, /\[VARIETY\]/)
assert.match(judge.turn, /Banned defaults/)
assert.match(judge.turn, /哼。勉強過關/)

const premature = buildPracticePartnerTurn([{ role: 'user', content: 'hello' }], null)
assert.match(premature.turn, /\[DEMAND\]/)
assert.match(premature.turn, /hello/)
assert.match(premature.turn, /\[DIFFICULTY\] abc/, 'defaults to ABC')

const kickoffBody = PracticePartnerChatBodySchema.safeParse({ messages: [] })
assert.ok(kickoffBody.success, 'empty messages allowed for Begin drill')

const attemptBody = PracticePartnerChatBodySchema.safeParse({
  messages: [{ role: 'user', content: '對唔住' }],
  activeDrill: previous,
  category: 'expert',
  difficulty: 'mainlander',
})
assert.ok(attemptBody.success)

const badCategory = PracticePartnerChatBodySchema.safeParse({
  messages: [],
  category: 'sports',
})
assert.ok(!badCategory.success, 'unknown decks are rejected')

const badDifficulty = PracticePartnerChatBodySchema.safeParse({
  messages: [],
  difficulty: 'hard',
})
assert.ok(!badDifficulty.success, 'unknown difficulties are rejected')

const badBody = PracticePartnerChatBodySchema.safeParse({
  messages: [{ role: 'user', content: '' }],
})
assert.ok(!badBody.success, 'blank user lines stay rejected')

console.log('practicePartnerAi.smoke: ok')
