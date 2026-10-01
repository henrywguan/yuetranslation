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
  PRACTICE_PARTNER_OPEN_SYSTEM,
  PRACTICE_PARTNER_SCENE_SYSTEM,
  PracticePartnerChatBodySchema,
  buildPracticePartnerTurn,
  PRACTICE_PARTNER_SITUATION_IDS,
  PRACTICE_PARTNER_SITUATION_META,
  PRACTICE_PARTNER_SITUATION_SYSTEM,
  keptLinesNote,
  situationMixNote,
  parsePracticePartnerReply,
  practicePartnerSystemFor,
  readPracticePartnerCorrection,
  categoryLockLine,
  difficultyLockLine,
  moveLockLine,
  toneLockLine,
  normalizeVerdict,
  practicePartnerSampling,
  recentSpeakOpenings,
  resolvePracticePartnerCategory,
  resolvePracticePartnerDifficulty,
  sanitizeSpeak,
  speakOpeningKey,
} from './practicePartnerAi.js'

assert.match(PRACTICE_PARTNER_SYSTEM, /港灣/, 'persona stays 港灣')
assert.match(PRACTICE_PARTNER_SYSTEM, /Hello! Today we are doing/, 'warm opening')
assert.match(PRACTICE_PARTNER_SYSTEM, /TONE LADDER/, 'streak warmth and miss heat')
assert.match(PRACTICE_PARTNER_SYSTEM, /EXERCISE LADDER/)
assert.match(PRACTICE_PARTNER_SYSTEM, /repeat → listen → translate → finish/)
assert.match(PRACTICE_PARTNER_SYSTEM, /does not make a miss gentle|does NOT soften/i)
assert.match(PRACTICE_PARTNER_SYSTEM, /THE DEMAND/, 'demand phase')
assert.match(PRACTICE_PARTNER_SYSTEM, /THE JUDGMENT/, 'judgment phase')
assert.match(PRACTICE_PARTNER_SYSTEM, /Jyutping/, 'Jyutping required on the card')
assert.match(PRACTICE_PARTNER_SYSTEM, /json object/i, 'structured JSON for the UI loop')
assert.match(PRACTICE_PARTNER_SYSTEM, /Azure TTS/, 'TTS-safe speak line')
assert.match(PRACTICE_PARTNER_SYSTEM, /SPOKEN BEATS/)
assert.match(PRACTICE_PARTNER_SYSTEM, /SITUATIONAL/)
assert.match(PRACTICE_PARTNER_SYSTEM, /少甜/)
assert.match(PRACTICE_PARTNER_SYSTEM, /LAST MISS/)
assert.match(PRACTICE_PARTNER_SYSTEM, /Do not emit SSML/)
assert.match(PRACTICE_PARTNER_SYSTEM, /CATEGORY LOCK/, 'deck lock')
assert.match(PRACTICE_PARTNER_SYSTEM, /DIFFICULTY LOCK/, 'difficulty lock')
assert.match(PRACTICE_PARTNER_SYSTEM, /Do not put Jyutping romanization/, 'speak stays 漢字 + English')
assert.match(PRACTICE_PARTNER_SYSTEM, /PASS VARIETY/, 'pass-line bank in the system prompt')
assert.match(PRACTICE_PARTNER_SYSTEM, /FAIL VARIETY/, 'fail-line bank in the system prompt')
assert.match(PRACTICE_PARTNER_SYSTEM, /ROAST RULES/, 'witty roast personality')
assert.match(PRACTICE_PARTNER_SYSTEM, /CONTEXTUAL WIT/, 'contextual improvisation')
assert.match(PRACTICE_PARTNER_SYSTEM, /inspiration only|handmade for THIS turn|REAL witty person/i)
assert.match(PRACTICE_PARTNER_SYSTEM, /有冇搞錯/, 'fail roast includes 有冇搞錯')
assert.match(PRACTICE_PARTNER_SYSTEM, /蠢笨蛋/, 'fail roast includes 蠢笨蛋')
assert.ok(PRACTICE_PARTNER_PASS_OPENERS.length >= 40, 'enough pass openers to rotate')
assert.ok(PRACTICE_PARTNER_FAIL_OPENERS.length >= 30, 'enough fail openers to rotate')
assert.ok(
  PRACTICE_PARTNER_FAIL_OPENERS.some((s) => s.includes('有冇搞錯')),
  'fail bank includes 有冇搞錯',
)
assert.ok(
  PRACTICE_PARTNER_FAIL_OPENERS.some((s) => s.includes('蠢笨蛋')),
  'fail bank includes 蠢笨蛋',
)
assert.ok(
  PRACTICE_PARTNER_PASS_OPENERS.some((s) => /算你叻|clown|Lucky|temporary genius/i.test(s)),
  'pass bank includes joking jabs',
)
assert.equal(practicePartnerSampling(null).temperature, 0.75)
assert.ok(
  practicePartnerSampling({ en: 'dog', zh: '狗', jyutping: 'gau2' }).temperature >= 0.9,
  'judge turns sample hotter for improvisational wit',
)
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
assert.match(empty.turn, /\[OPENING\]/)
assert.match(empty.turn, /Hello! Today we are doing Animals/)
assert.match(empty.turn, /Repeat after me/)
assert.equal(empty.history.length, 0)

const warm = toneLockLine('foods', { streak: 5, missStreak: 0 })
assert.match(warm, /passStreak=5/)
assert.match(warm, /PROUD/)
assert.match(warm, /does NOT soften/)

const harsh = toneLockLine('common', { streak: 6, missStreak: 2 })
assert.match(harsh, /HARSH/)
assert.match(harsh, /does NOT soften/)
assert.match(harsh, /passStreak=6/)

const sharper = toneLockLine('animals', { streak: 0, missStreak: 1 })
assert.match(sharper, /SHARPER/)
assert.match(sharper, /FRIENDLY/)

const judge = buildPracticePartnerTurn(
  [
    { role: 'assistant', content: 'Say 對唔住 now.' },
    { role: 'user', content: '對唔住，我唔記得帶功課' },
  ],
  previous,
  'common',
  'mainlander',
  { streak: 6, missStreak: 0 },
)
assert.equal(judge.history.length, 1)
assert.match(judge.turn, /\[JUDGE\]/)
assert.match(judge.turn, /\[CATEGORY\] common/)
assert.match(judge.turn, /\[DIFFICULTY\] mainlander/)
assert.match(judge.turn, /TARGET ZH: 對唔住/)
assert.match(judge.turn, /LEARNER SAID: 對唔住，我唔記得帶功課/)
assert.match(judge.turn, /MUST stay in this \[CATEGORY\]/)
assert.match(judge.turn, /Obey \[DIFFICULTY\]/)
assert.match(judge.turn, /React to that exact attempt/)
assert.match(judge.turn, /\[TONE\]/)
assert.match(judge.turn, /passStreak=6/)
assert.match(judge.turn, /missStreak=0/)
assert.match(judge.turn, /CRITICAL/)
assert.match(judge.turn, /does NOT soften/)
assert.match(judge.turn, /\[CONTEXTUAL WIT\]/)
assert.match(judge.turn, /Banned defaults/)
assert.match(judge.turn, /哼。勉強過關/)
assert.match(judge.turn, /有冇搞錯/)
assert.match(judge.turn, /playful and meme/)
assert.match(judge.turn, /SITUATIONAL|少甜/)
assert.doesNotMatch(judge.turn, /\[LAST MISS\]/)

const withMiss = buildPracticePartnerTurn(
  [
    { role: 'assistant', content: 'Repeat after me. 狗' },
    { role: 'user', content: 'cat' },
  ],
  { en: 'dog', zh: '狗', jyutping: 'gau2' },
  'animals',
  'abc',
  {
    streak: 4,
    missStreak: 0,
    move: 'repeat',
    nextMove: 'listen',
    lastMiss: { said: 'gau', zh: '狗', en: 'dog' },
  },
)
assert.match(withMiss.turn, /\[LAST MISS\]/)
assert.match(withMiss.turn, /gau/)
assert.match(withMiss.turn, /does NOT soften/)

const climbed = buildPracticePartnerTurn(
  [
    { role: 'assistant', content: 'Repeat after me. 狗' },
    { role: 'user', content: '狗' },
  ],
  { en: 'dog', zh: '狗', jyutping: 'gau2' },
  'animals',
  'abc',
  {
    streak: 1,
    missStreak: 0,
    move: 'listen',
    nextMove: 'translate',
    review: { en: 'cat', zh: '貓', jyutping: 'maau1' },
  },
)
assert.match(climbed.turn, /\[MOVE\]/)
assert.match(climbed.turn, /attempting listen/)
assert.match(climbed.turn, /next demand is translate/)
assert.match(climbed.turn, /\[REVIEW\].*貓/)
assert.match(climbed.turn, /Drop to REPEAT/)
assert.match(moveLockLine('finish', 'finish', null), /Contrast/)
assert.match(judge.turn, /inspiration|ENERGY|vibe samples/i)

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

const withLastMiss = PracticePartnerChatBodySchema.safeParse({
  messages: [{ role: 'user', content: 'dog' }],
  activeDrill: previous,
  lastMiss: { said: 'dok', zh: '狗', en: 'dog' },
})
assert.ok(withLastMiss.success, 'a bounded last miss is accepted')

const blankMiss = PracticePartnerChatBodySchema.safeParse({
  messages: [{ role: 'user', content: 'dog' }],
  lastMiss: { said: '   ', zh: '狗', en: 'dog' },
})
assert.ok(!blankMiss.success, 'a blank last miss is rejected')

const openBody = PracticePartnerChatBodySchema.safeParse({
  messages: [],
  mode: 'open',
  difficulty: 'abc',
})
assert.ok(openBody.success, 'open chat is a mode, not a deck')

const badMode = PracticePartnerChatBodySchema.safeParse({
  messages: [],
  mode: 'lesson',
})
assert.ok(!badMode.success, 'unknown modes are rejected')

const openKick = buildPracticePartnerTurn([], null, 'animals', 'new_learner', { mode: 'open' })
assert.match(openKick.turn, /\[OPEN CHAT\]/)
assert.doesNotMatch(openKick.turn, /\[MOVE\]/)
assert.doesNotMatch(openKick.turn, /\[CATEGORY\]/)
assert.equal(practicePartnerSystemFor('open'), PRACTICE_PARTNER_OPEN_SYSTEM)
assert.match(PRACTICE_PARTNER_OPEN_SYSTEM, /not a say-this drill/)

const openJudge = buildPracticePartnerTurn(
  [{ role: 'user', content: 'I want tea' }],
  { en: 'tea', zh: '茶', jyutping: 'caa4' },
  'foods',
  'abc',
  { mode: 'open' },
)
assert.match(openJudge.turn, /THEY SAID: I want tea/)
assert.doesNotMatch(openJudge.turn, /\[JUDGE\]/)

const sceneKick = buildPracticePartnerTurn([], { en: 'water', zh: '水', jyutping: 'seoi2' }, 'foods', 'abc', {
  mode: 'scene',
  place: 'Night Market (夜市)',
  sceneTurn: 1,
  sceneTurns: 4,
})
assert.match(sceneKick.turn, /\[SCENE\] Night Market/)
assert.match(sceneKick.turn, /Turn 1 of 4/)
assert.match(sceneKick.turn, /TARGET ZH: 水/)
assert.match(sceneKick.turn, /does not score the road/)
assert.equal(practicePartnerSystemFor('scene'), PRACTICE_PARTNER_SCENE_SYSTEM)
assert.equal(practicePartnerSystemFor('drill'), PRACTICE_PARTNER_SYSTEM)
assert.equal(practicePartnerSystemFor(null), PRACTICE_PARTNER_SYSTEM)
assert.match(PRACTICE_PARTNER_SYSTEM, /why is one short written sentence/)
assert.equal(practicePartnerSystemFor('situation'), PRACTICE_PARTNER_SITUATION_SYSTEM)
assert.match(PRACTICE_PARTNER_SITUATION_SYSTEM, /conversation continues/)
assert.match(PRACTICE_PARTNER_OPEN_SYSTEM, /correction/)

const situationBody = PracticePartnerChatBodySchema.safeParse({
  messages: [],
  mode: 'situation',
  situation: 'cafe',
  kept: [{ en: 'water', zh: '水', jyutping: 'seoi2' }],
})
assert.ok(situationBody.success, 'a chosen situation is accepted')

const badSituation = PracticePartnerChatBodySchema.safeParse({
  messages: [],
  situation: 'debate',
})
assert.ok(!badSituation.success, 'unknown situations are rejected')
assert.equal(PRACTICE_PARTNER_SITUATION_IDS.length, 22)
for (const id of PRACTICE_PARTNER_SITUATION_IDS) {
  assert.ok(PRACTICE_PARTNER_SITUATION_META[id], id)
  assert.ok(
    PracticePartnerChatBodySchema.safeParse({ messages: [], situation: id }).success,
    id,
  )
}
assert.equal(situationMixNote('busy', 'slang').includes('[CAST]'), true)
assert.match(situationMixNote('busy', 'slang'), /\[AIM\].*colloquial/)

const situationKick = buildPracticePartnerTurn([], null, 'common', 'abc', {
  mode: 'situation',
  situation: 'cafe',
  personality: 'busy',
  goal: 'task',
  kept: [{ en: 'water', zh: '水', jyutping: 'seoi2' }],
})
assert.match(situationKick.turn, /\[SITUATION\] Cha chaan teng/)
assert.match(situationKick.turn, /茶餐廳/)
assert.match(situationKick.turn, /\[CAST\]/)
assert.match(situationKick.turn, /\[AIM\]/)
assert.match(situationKick.turn, /\[KEPT LINES\].*水/)
assert.doesNotMatch(situationKick.turn, /\[MOVE\]/)

const dimsumKick = buildPracticePartnerTurn([], null, 'common', 'new_learner', {
  mode: 'situation',
  situation: 'dimsum',
  personality: 'elder',
  goal: 'casual',
})
assert.match(dimsumKick.turn, /\[SITUATION\] Dim sum/)
assert.match(dimsumKick.turn, /飲茶/)
assert.match(dimsumKick.turn, /older person/)
assert.match(keptLinesNote([{ zh: '水', en: 'water' }]), /Do not quiz/)

const hint = buildPracticePartnerTurn(
  [{ role: 'assistant', content: 'What do you want?' }],
  null,
  'common',
  'new_learner',
  { mode: 'situation', situation: 'mtr', hint: true },
)
assert.match(hint.turn, /\[HINT\]/)
assert.match(hint.turn, /MTR/)
assert.equal(hint.history.length, 1, 'a hint does not drop the conversation')

const withWhy = parsePracticePartnerReply(
  JSON.stringify({
    reaction: 'Try the rising tone.',
    cue: 'Again.',
    verdict: 'fail',
    en: 'water',
    zh: '水',
    jyutping: 'seoi2',
    why: 'seoi2 rises.',
    correction: { en: 'water', zh: '水', jyutping: 'seoi2' },
  }),
)
assert.equal(withWhy.aside.why, 'seoi2 rises.')
assert.equal(withWhy.aside.correction, null, 'a correction that repeats the spoken line is dropped')

const withBetter = parsePracticePartnerReply(
  JSON.stringify({
    reaction: 'Tea, then.',
    cue: 'Hot or cold?',
    verdict: 'none',
    en: 'Tea.',
    zh: '茶呀。',
    jyutping: 'caa4 aa3',
    why: 'That came through in English.',
    correction: { en: 'I want tea', zh: '我要茶', jyutping: 'ngo5 jiu3 caa4' },
  }),
)
assert.equal(withBetter.aside.correction?.zh, '我要茶')
assert.equal(readPracticePartnerCorrection({ en: 'tea', zh: '', jyutping: 'caa4' }), null)

console.log('practicePartnerAi.smoke: ok')
