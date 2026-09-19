/**
 * Harbor Quest · Cantonese Life 1 Units 1–11.
 *
 * One campaign per Open Cantonese unit; one pier per lesson (unit reviews omitted).
 * Challenge copy is original game writing — not a textbook reprint.
 * Source: https://opencantonese.org/books/cantonese-life-1
 */
import type {
  HarborLevel,
  HarborRealmId,
  LearnLine,
  PickStep,
  QuestStep,
  TeachStep,
} from './curriculum'

export const OC_LIFE1_BOOK = 'https://opencantonese.org/books/cantonese-life-1'

export type LifeUnitId =
  | 'life1'
  | 'life2'
  | 'life3'
  | 'life4'
  | 'life5'
  | 'life6'
  | 'life7'
  | 'life8'
  | 'life9'
  | 'life10'
  | 'life11'

type PickSeed = {
  id: string
  prompt: LearnLine
  hear: { han: string; label: string }[]
  choices: { id: string; label: string; sub?: string }[]
  correctId: string
  explain: LearnLine
  tip?: LearnLine
}

type LessonSeed = {
  lesson: number
  /** Open Cantonese lesson path slug under unit-N/, e.g. `lesson-1`. */
  slug: string
  title: LearnLine
  blurb: LearnLine
  tags: string[]
  hue: HarborLevel['hue']
  teach: Omit<TeachStep, 'kind'>
  picks: PickSeed[]
}

type UnitSeed = {
  id: LifeUnitId
  unit: number
  title: LearnLine
  blurb: LearnLine
  realm: HarborRealmId
  ocHome: string
  lessons: LessonSeed[]
}

function pick(seed: PickSeed): PickStep {
  return {
    kind: 'pick',
    id: seed.id,
    tip: seed.tip,
    prompt: seed.prompt,
    hear: seed.hear,
    choices: seed.choices,
    correctId: seed.correctId,
    explain: seed.explain,
  }
}

function teach(seed: Omit<TeachStep, 'kind'>): TeachStep {
  return { kind: 'teach', ...seed }
}

function levelFromLesson(unit: UnitSeed, lesson: LessonSeed, chapter: number): HarborLevel {
  const steps: QuestStep[] = [teach(lesson.teach), ...lesson.picks.map(pick)]
  return {
    id: `${unit.id}-l${lesson.lesson}`,
    campaign: unit.id,
    realm: unit.realm,
    ocBase: `${OC_LIFE1_BOOK}/unit-${unit.unit}`,
    ocLesson: lesson.slug,
    chapter,
    title: lesson.title,
    blurb: lesson.blurb,
    tags: lesson.tags,
    hue: lesson.hue,
    steps,
  }
}

/** Shared listen tip for Life book piers. */
const LISTEN: LearnLine = {
  en: 'Tap Speak, then choose.',
  zh: '撳「講」，再揀。',
}

export const LIFE_UNIT_SEEDS: UnitSeed[] = [
  {
    id: 'life1',
    unit: 1,
    title: { en: 'Campaign 3 · Getting to know you (1)', zh: '航線三 · 認識你（一）' },
    blurb: {
      en: 'Names, who someone is, hobbies, likes — Unit 1.',
      zh: '名字、邊個、興趣、鍾唔鍾意——Unit 1。',
    },
    realm: 'bamboo',
    ocHome: `${OC_LIFE1_BOOK}/unit-1`,
    lessons: [
      {
        lesson: 1,
        slug: 'lesson-1',
        title: { en: 'What’s your name?', zh: '你叫咩名呀？' },
        blurb: { en: 'Say names · 係 · particles 呀 / 呢.', zh: '報名·係·助詞呀／呢。' },
        tags: ['names', '係'],
        hue: 'jade',
        teach: {
          id: 't',
          title: { en: 'Call me…', zh: '我叫…' },
          body: {
            en: 'Unit 1 opens with 你叫咩名呀？ Use 我叫 + name, and 係 for “to be.” Rising 呀 softens questions.',
            zh: 'Unit 1 開場「你叫咩名呀？」——「我叫＋名」，「係」表判斷；上升「呀」令問句軟啲。',
          },
          spotlight: '你叫咩名呀？',
          spotlightHint: { en: 'What’s your name?', zh: '你叫咩名？' },
          hear: [
            { han: '你叫咩名呀？', label: 'nei5 giu3 me1 meng2 aa3?' },
            { han: '我叫小明。', label: 'ngo5 giu3 siu2 ming4' },
          ],
        },
        picks: [
          {
            id: 'p1',
            tip: LISTEN,
            prompt: { en: 'Best reply to 你叫咩名呀？', zh: '「你叫咩名呀？」最好答？' },
            hear: [{ han: '你叫咩名呀？', label: 'nei5 giu3 me1 meng2 aa3?' }],
            choices: [
              { id: 'name', label: '我叫…', sub: 'ngo5 giu3…' },
              { id: 'age', label: '我二十歲', sub: 'Age' },
              { id: 'job', label: '我返工', sub: 'Work' },
            ],
            correctId: 'name',
            explain: {
              en: '我叫 + name answers “what are you called?”',
              zh: '「我叫＋名」答「你叫咩」。',
            },
          },
          {
            id: 'p2',
            prompt: { en: '係 hai6 here means…?', zh: '呢度「係」大致係？' },
            hear: [{ han: '我係學生。', label: 'ngo5 hai6 hok6 saang1' }],
            choices: [
              { id: 'be', label: 'To be', sub: 'Copula' },
              { id: 'go', label: 'To go', sub: 'Motion' },
              { id: 'eat', label: 'To eat', sub: 'Food' },
            ],
            correctId: 'be',
            explain: { en: '係 links identity — “I am a student.”', zh: '「係」連身分——我係學生。' },
          },
          {
            id: 'p3',
            prompt: { en: 'Particle 呢 ne1 often means…?', zh: '助詞「呢」成日係？' },
            hear: [{ han: '你呢？', label: 'nei5 ne1?' }],
            choices: [
              { id: 'how', label: 'How about…?', sub: 'Follow-up' },
              { id: 'past', label: 'Past tense', sub: 'Time' },
              { id: 'plural', label: 'Plural only', sub: 'Grammar' },
            ],
            correctId: 'how',
            explain: { en: '你呢？ = “And you?” / “How about you?”', zh: '「你呢？」＝咁你呢？' },
          },
        ],
      },
      {
        lesson: 2,
        slug: 'lesson-2',
        title: { en: 'Who is this?', zh: '呢個人係邊個嚟㗎？' },
        blurb: { en: 'People · classifiers · 邊個.', zh: '人物·量詞·邊個。' },
        tags: ['people', '邊個'],
        hue: 'harbor',
        teach: {
          id: 't',
          title: { en: 'This person…', zh: '呢個人…' },
          body: {
            en: 'Identify people with 呢個／嗰個 + relationship words. 邊個 asks “who?” Classifiers matter early — 個 for people.',
            zh: '用「呢個／嗰個」加關係詞認人。「邊個」問邊個；量詞「個」好早就要識。',
          },
          spotlight: '邊個',
          spotlightHint: { en: 'Who?', zh: '邊個？' },
          hear: [
            { han: '呢個人係邊個嚟㗎？', label: 'ni1 go3 jan4 hai6 bin1 go3 lai4 gaa3?' },
            { han: '佢係我朋友。', label: 'keoi5 hai6 ngo5 pang4 jau5' },
          ],
        },
        picks: [
          {
            id: 'p1',
            tip: LISTEN,
            prompt: { en: '邊個 means…?', zh: '「邊個」係？' },
            hear: [{ han: '邊個？', label: 'bin1 go3?' }],
            choices: [
              { id: 'who', label: 'Who', sub: 'Person' },
              { id: 'where', label: 'Where', sub: 'Place' },
              { id: 'when', label: 'When', sub: 'Time' },
            ],
            correctId: 'who',
            explain: { en: '邊個 = who (which person).', zh: '邊個＝邊一個／邊個。' },
          },
          {
            id: 'p2',
            prompt: { en: '兩 and 二 both mean “two.” Which fits 兩個朋友?', zh: '「兩個朋友」用邊個「二」？' },
            hear: [{ han: '兩個朋友', label: 'loeng5 go3 pang4 jau5' }],
            choices: [
              { id: 'loeng', label: '兩 loeng5', sub: 'Before classifiers' },
              { id: 'ji', label: '二 ji6', sub: 'Counting alone' },
              { id: 'either', label: 'Either always', sub: 'Same' },
            ],
            correctId: 'loeng',
            explain: {
              en: '兩 before classifiers (兩個); 二 in numbers/phone-like counting.',
              zh: '量詞前用「兩」；數數／讀號多用「二」。',
            },
          },
          {
            id: 'p3',
            prompt: { en: '佢係我… — closest family word?', zh: '「佢係我…」邊個最似家人？' },
            hear: [{ han: '佢係我媽媽。', label: 'keoi5 hai6 ngo5 maa4 maa1' }],
            choices: [
              { id: 'mum', label: '媽媽', sub: 'Mum' },
              { id: 'bus', label: '巴士', sub: 'Bus' },
              { id: 'tea', label: '茶', sub: 'Tea' },
            ],
            correctId: 'mum',
            explain: { en: 'Relationship nouns follow 我 / 你 / 佢.', zh: '關係詞跟住「我／你／佢」。' },
          },
        ],
      },
      {
        lesson: 3,
        slug: 'lesson-3',
        title: { en: 'What do you like doing?', zh: '你平時鍾意做咩㗎？' },
        blurb: { en: 'Hobbies · 鍾意 · 同／同埋.', zh: '興趣·鍾意·同／同埋。' },
        tags: ['hobbies', '鍾意'],
        hue: 'gold',
        teach: {
          id: 't',
          title: { en: 'Usually I like…', zh: '我平時鍾意…' },
          body: {
            en: '平時 + 鍾意 + activity. Link hobbies with 同 / 同埋. 咩／乜嘢 ask “what?”',
            zh: '「平時＋鍾意＋活動」。興趣用「同／同埋」連；「咩／乜嘢」問咩。',
          },
          spotlight: '鍾意',
          spotlightHint: { en: 'To like', zh: '鍾意' },
          hear: [
            { han: '你平時鍾意做咩㗎？', label: 'nei5 ping4 si4 zung1 ji3 zou6 me1 gaa3?' },
            { han: '我鍾意睇戲同食飯。', label: 'ngo5 zung1 ji3 tai2 hei3 tung4 sik6 faan6' },
          ],
        },
        picks: [
          {
            id: 'p1',
            tip: LISTEN,
            prompt: { en: '鍾意 means…?', zh: '「鍾意」係？' },
            hear: [{ han: '我鍾意行山。', label: 'ngo5 zung1 ji3 haang4 saan1' }],
            choices: [
              { id: 'like', label: 'To like', sub: 'Preference' },
              { id: 'hate', label: 'To hate', sub: 'Opposite' },
              { id: 'buy', label: 'To buy', sub: 'Shop' },
            ],
            correctId: 'like',
            explain: { en: '鍾意 = like / enjoy.', zh: '鍾意＝喜歡。' },
          },
          {
            id: 'p2',
            prompt: { en: 'Join two hobbies with…?', zh: '兩個興趣點連？' },
            hear: [{ han: '睇書同埋聽音樂', label: 'tai2 syu1 tung4 maai4 teng1 jam1 ngok6' }],
            choices: [
              { id: 'and', label: '同 / 同埋', sub: 'and' },
              { id: 'or', label: '定係', sub: 'or' },
              { id: 'but', label: '但係', sub: 'but' },
            ],
            correctId: 'and',
            explain: { en: '同 / 同埋 link noun phrases.', zh: '「同／同埋」連名詞。' },
          },
          {
            id: 'p3',
            prompt: { en: '咩 in 做咩 is…?', zh: '「做咩」嘅「咩」？' },
            hear: [{ han: '做咩？', label: 'zou6 me1?' }],
            choices: [
              { id: 'what', label: 'What', sub: 'Question' },
              { id: 'who', label: 'Who', sub: 'Person' },
              { id: 'yes', label: 'Yes', sub: 'Affirm' },
            ],
            correctId: 'what',
            explain: { en: '咩 / 乜嘢 ≈ what.', zh: '咩／乜嘢≈什麼。' },
          },
        ],
      },
      {
        lesson: 4,
        slug: 'lesson-4',
        title: { en: 'Do you like hiking?', zh: '你鍾唔鍾意行山㗎？' },
        blurb: { en: 'X-唔-X likes · 識 ability.', zh: '鍾唔鍾意·識。' },
        tags: ['X-not-X', '識'],
        hue: 'ink',
        teach: {
          id: 't',
          title: { en: 'Like or not?', zh: '鍾唔鍾意？' },
          body: {
            en: 'Yes-no with stative verbs: 鍾唔鍾意. 識 means “know how to.” 唔 negates.',
            zh: '靜態動詞用「鍾唔鍾意」問是非。「識」＝識唔識做；「唔」否定。',
          },
          spotlight: '鍾唔鍾意',
          spotlightHint: { en: 'Like or not?', zh: '鍾唔鍾意？' },
          hear: [
            { han: '你鍾唔鍾意行山㗎？', label: 'nei5 zung1 m4 zung1 ji3 haang4 saan1 gaa3?' },
            { han: '我唔鍾意，但我識游水。', label: 'ngo5 m4 zung1 ji3, daan6 ngo5 sik1 jau4 seoi2' },
          ],
        },
        picks: [
          {
            id: 'p1',
            tip: LISTEN,
            prompt: { en: '鍾唔鍾意 is an example of…?', zh: '「鍾唔鍾意」係？' },
            hear: [{ han: '鍾唔鍾意', label: 'zung1 m4 zung1 ji3' }],
            choices: [
              { id: 'xnx', label: 'X-not-X question', sub: 'Yes/no' },
              { id: 'past', label: 'Past tense', sub: 'Time' },
              { id: 'plural', label: 'Plural marker', sub: 'Noun' },
            ],
            correctId: 'xnx',
            explain: {
              en: 'Verb + 唔 + verb makes a yes-no question.',
              zh: '動詞＋唔＋動詞＝是非問句。',
            },
          },
          {
            id: 'p2',
            prompt: { en: '識 sik1 in 識游水 means…?', zh: '「識游水」嘅「識」？' },
            hear: [{ han: '我識游水。', label: 'ngo5 sik1 jau4 seoi2' }],
            choices: [
              { id: 'can', label: 'Know how to', sub: 'Ability' },
              { id: 'meet', label: 'Meet someone', sub: 'Social' },
              { id: 'write', label: 'Write only', sub: 'Literacy' },
            ],
            correctId: 'can',
            explain: { en: '識 + skill = know how to.', zh: '識＋技能＝會／識得。' },
          },
          {
            id: 'p3',
            prompt: { en: '唔 before a verb means…?', zh: '動詞前「唔」？' },
            hear: [{ han: '我唔鍾意。', label: 'ngo5 m4 zung1 ji3' }],
            choices: [
              { id: 'not', label: 'Not', sub: 'Negation' },
              { id: 'very', label: 'Very', sub: 'Degree' },
              { id: 'also', label: 'Also', sub: 'Add' },
            ],
            correctId: 'not',
            explain: { en: '唔 = not (before verbs/adjectives).', zh: '唔＝不。' },
          },
        ],
      },
    ],
  },
  // Units 2–11 continue below in compact form
]

/** Build remaining units 2–11 with lesson seeds. */
function unit(
  id: LifeUnitId,
  unitNum: number,
  title: LearnLine,
  blurb: LearnLine,
  realm: HarborRealmId,
  lessons: LessonSeed[],
): UnitSeed {
  return {
    id,
    unit: unitNum,
    title,
    blurb,
    realm,
    ocHome: `${OC_LIFE1_BOOK}/unit-${unitNum}`,
    lessons,
  }
}

function L(
  lesson: number,
  titleEn: string,
  titleZh: string,
  blurbEn: string,
  blurbZh: string,
  tags: string[],
  hue: HarborLevel['hue'],
  spotlight: string,
  hearHan: string,
  hearJp: string,
  teachEn: string,
  teachZh: string,
  picks: [string, string, string, string, string, string, string, string, string][],
): LessonSeed {
  // picks rows: [id, promptEn, promptZh, han, jp, c1, c2, c3, correctId]
  // c1/c2/c3 format: "id|label|sub"
  const parse = (s: string) => {
    const [id, label, sub] = s.split('|')
    return { id: id!, label: label!, sub }
  }
  return {
    lesson,
    slug: `lesson-${lesson}`,
    title: { en: titleEn, zh: titleZh },
    blurb: { en: blurbEn, zh: blurbZh },
    tags,
    hue,
    teach: {
      id: 't',
      title: { en: titleEn, zh: titleZh },
      body: { en: teachEn, zh: teachZh },
      spotlight,
      spotlightHint: { en: titleEn, zh: titleZh },
      hear: [{ han: hearHan, label: hearJp }],
    },
    picks: picks.map((row) => {
      const [id, pe, pz, han, jp, a, b, c, correctId] = row
      return {
        id: id!,
        tip: LISTEN,
        prompt: { en: pe!, zh: pz! },
        hear: [{ han: han!, label: jp! }],
        choices: [parse(a!), parse(b!), parse(c!)],
        correctId: correctId!,
        explain: {
          en: `Harbor note: ${parse(row.find((x) => x.startsWith(correctId + '|')) ?? a!).label} is the cast.`,
          zh: `航圖：揀啱「${parse(row.find((x) => x.startsWith(correctId + '|')) ?? a!).label}」。`,
        },
      }
    }),
  }
}

const MORE_UNITS: UnitSeed[] = [
  unit(
    'life2',
    2,
    { en: 'Campaign 4 · Getting to know you (2)', zh: '航線四 · 認識你（二）' },
    { en: 'Work/study, places, origin, languages — Unit 2.', zh: '做嘢／讀書、地點、嚟自邊、語言——Unit 2。' },
    'bamboo',
    [
      L(
        6,
        'Working or studying?',
        '你做緊嘢定讀緊書㗎？',
        '緊 progressive · 定 “or”.',
        '緊進行·定。',
        ['緊', '定'],
        'jade',
        '做緊／讀緊',
        '你做緊嘢定讀緊書㗎？',
        'nei5 zou6 gan2 je5 ding6 duk6 gan2 syu1 gaa3?',
        'Aspect 緊 marks “in the middle of.” 定／定係 offers an or-choice between work and study.',
        '助詞「緊」表進行中。「定／定係」喺做嘢同讀書之間俾人揀。',
        [
          ['p1', '緊 gan2 marks…?', '「緊」標示？', '我做緊嘢。', 'ngo5 zou6 gan2 je5', 'prog|Progressive|In progress', 'past|Past only|Finished', 'future|Future|Will', 'prog'],
          ['p2', '定／定係 means…?', '「定／定係」？', '茶定咖啡？', 'caa4 ding6 gaa3 fe1?', 'or|Or|Choice', 'and|And|Both', 'but|But|Contrast', 'or'],
          ['p3', '讀緊書 is closest to…?', '「讀緊書」最似？', '讀緊書', 'duk6 gan2 syu1', 'studying|Studying now|School', 'sleeping|Sleeping|Rest', 'cooking|Cooking|Kitchen', 'studying'],
        ],
      ),
      L(
        7,
        'Where do you work?',
        '你喺邊度返工㗎？',
        '喺 location · 邊度.',
        '喺·邊度。',
        ['喺', '邊度'],
        'harbor',
        '喺邊度',
        '你喺邊度返工㗎？',
        'nei5 hai2 bin1 dou6 faan1 gung1 gaa3?',
        'Preposition 喺 + place. 邊度 asks where. 返工 / 返學 for work and school commute.',
        '介詞「喺」＋地點。「邊度」問邊度；返工／返學講返工返學。',
        [
          ['p1', '邊度 means…?', '「邊度」？', '邊度？', 'bin1 dou6?', 'where|Where|Place', 'who|Who|Person', 'why|Why|Reason', 'where'],
          ['p2', '喺 before a place means…?', '地點前「喺」？', '我喺中環返工。', 'ngo5 hai2 zung1 waan4 faan1 gung1', 'at|At / in / on|Location', 'from-only|From only|Origin', 'with|With|Company', 'at'],
          ['p3', '返工 is…?', '「返工」？', '返工', 'faan1 gung1', 'go-work|Go to work|Job', 'go-home|Go home|House', 'eat|Eat|Food', 'go-work'],
        ],
      ),
      L(
        8,
        'Where are you from?',
        '你喺邊度嚟㗎？',
        'Origin · purpose visits.',
        '嚟自·目的。',
        ['嚟', 'origin'],
        'gold',
        '喺邊度嚟',
        '你喺邊度嚟㗎？',
        'nei5 hai2 bin1 dou6 lai4 gaa3?',
        'Ask origin with 喺邊度嚟. Serial verbs can add purpose for visiting.',
        '用「喺邊度嚟」問來源；可以再串動詞講嚟呢度做咩。',
        [
          ['p1', 'Best origin answer shape?', '來源答法？', '我喺澳洲嚟。', 'ngo5 hai2 ou3 zau1 lai4', 'from|我喺…嚟|Origin', 'name|我叫…|Name', 'age|我…歲|Age', 'from'],
          ['p2', '嚟 lai4 here is…?', '呢度「嚟」？', '我嚟香港。', 'ngo5 lai4 hoeng1 gong2', 'come|Come|Motion', 'eat|Eat|Food', 'buy|Buy|Shop', 'come'],
          ['p3', 'Rising 呀 aa4 can…?', '上升「呀」可以？', '係呀？', 'hai6 aa4?', 'confirm|Seek confirmation|Check', 'past|Mark past|Time', 'plural|Mark plural|Noun', 'confirm'],
        ],
      ),
      L(
        9,
        'What languages do you speak?',
        '你識咩語言㗎？',
        '識 know · 因為／所以.',
        '識·因為／所以。',
        ['識', '語言'],
        'ink',
        '識咩語言',
        '你識咩語言㗎？',
        'nei5 sik1 me1 jyu5 jin4 gaa3?',
        '識 + language. 因為…所以… links reason and result. 過 can mark experience.',
        '「識」＋語言。「因為…所以…」連因果；「過」可以講經驗。',
        [
          ['p1', '識廣東話 means…?', '「識廣東話」？', '我識廣東話。', 'ngo5 sik1 gwong2 dung1 waa2', 'know|Know Cantonese|Language', 'hate|Hate it|Feeling', 'buy|Buy books|Shop', 'know'],
          ['p2', '因為…所以… links…?', '「因為…所以…」？', '因為好玩所以學。', 'jan1 wai6 hou2 waan2 so2 ji5 hok6', 'cause|Cause → result|Logic', 'or|Either/or|Choice', 'list|Only lists|Nouns', 'cause'],
          ['p3', '點解 asks…?', '「點解」問？', '點解學粵語？', 'dim2 gaai2 hok6 jyut6 jyu5?', 'why|Why|Reason', 'where|Where|Place', 'who|Who|Person', 'why'],
        ],
      ),
    ],
  ),
  unit(
    'life3',
    3,
    { en: 'Campaign 5 · Getting to know you (3)', zh: '航線五 · 認識你（三）' },
    { en: 'Home, age, marriage, kids — Unit 3.', zh: '住邊、年紀、婚姻、仔女——Unit 3。' },
    'bamboo',
    [
      L(11, 'Who do you live with?', '你同邊個一齊住㗎？', '住 · family · 有／冇.', '住·家人·有／冇。', ['住', '家庭'], 'jade', '一齊住', '你同邊個一齊住㗎？', 'nei5 tung4 bin1 go3 jat1 cai4 zyu6 gaa3?', '住 “live.” 同…一齊 for “together with.” 有／冇 for have / not have.', '「住」＝住。「同…一齊」＝一齊；「有／冇」講有冇。', [
        ['p1', '住 means…?', '「住」？', '我住香港。', 'ngo5 zyu6 hoeng1 gong2', 'live|To live|Home', 'run|To run|Sport', 'buy|To buy|Shop', 'live'],
        ['p2', '有 vs 冇?', '「有」同「冇」？', '我有哥哥，冇妹妹。', 'ngo5 jau5 go4 go1, mou5 mui2 mui2', 'have|Have / not have|Possession', 'go|Go / stop|Motion', 'big|Big / small|Size', 'have'],
        ['p3', '幾多 asks…?', '「幾多」問？', '你哋有幾多個人？', 'nei5 dei6 jau5 gei2 do1 go3 jan4?', 'howmany|How many / how much|Quantity', 'where|Where|Place', 'when|When|Time', 'howmany'],
      ]),
      L(12, 'When is your birthday?', '你幾時生日㗎？', 'Age · dates · 幾時.', '歲·日子·幾時。', ['幾時', '歲'], 'harbor', '幾時生日', '你幾時生日㗎？', 'nei5 gei2 si4 saang1 jat6 gaa3?', '幾時 = when. Numbers 11–99 and 幾多歲 / 幾歲 for age.', '「幾時」＝幾時；十一至九十九同「幾多歲／幾歲」講年紀。', [
        ['p1', '幾時 means…?', '「幾時」？', '幾時？', 'gei2 si4?', 'when|When|Time', 'who|Who|Person', 'how|How|Manner', 'when'],
        ['p2', '幾多歲 asks…?', '「幾多歲」？', '你幾多歲呀？', 'nei5 gei2 do1 seoi3 aa3?', 'age|How old|Age', 'price|How much money|Money', 'where|Where|Place', 'age'],
        ['p3', '生日 is…?', '「生日」？', '今日我生日。', 'gam1 jat6 ngo5 saang1 jat6', 'bday|Birthday|Date', 'job|Job|Work', 'bus|Bus|Travel', 'bday'],
      ]),
      L(13, 'Married yet?', '你結咗婚未㗎？', '咗 perfective · 未 yet.', '咗完成·未。', ['咗', '未'], 'gold', '結咗婚未', '你結咗婚未㗎？', 'nei5 git3 zo2 fan1 mei6 gaa3?', '咗 marks completed change. 未 = not yet / yet. Compare with experiential 過.', '「咗」表完成變化；「未」＝未／還沒。可同經驗「過」對比。', [
        ['p1', '咗 zo2 often marks…?', '「咗」成日標？', '我食咗飯。', 'ngo5 sik6 zo2 faan6', 'done|Completed action|Aspect', 'future|Future only|Will', 'plural|Plural|Noun', 'done'],
        ['p2', '未 mei6 means…?', '「未」？', '未結婚。', 'mei6 git3 fan1', 'notyet|Not yet|Aspect', 'always|Always|Habit', 'never-past|Never in past only|Time', 'notyet'],
        ['p3', '過 gwo3 (experiential) is closest to…?', '經驗「過」最似？', '我去過日本。', 'ngo5 heoi3 gwo3 jat6 bun2', 'ever|Have (ever) done|Experience', 'now|Doing now|Progressive', 'must|Must|Modal', 'ever'],
      ]),
      L(14, 'Do you have kids?', '你哋有冇仔女㗎？', 'Children · pets · 都 “all”.', '仔女·寵物·都。', ['仔女', '有冇'], 'ink', '有冇仔女', '你哋有冇仔女㗎？', 'nei5 dei6 jau5 mou5 zai2 neoi2 gaa3?', '有冇 yes-no for possession. 仔女 = kids. 都 can mean “all.”', '「有冇」問有冇；「仔女」＝子女；「都」可以＝全部。', [
        ['p1', '有冇 questions ask…?', '「有冇」問？', '有冇貓？', 'jau5 mou5 maau1?', 'have|Whether you have|Yes/no', 'where|Where it is|Place', 'why|Why|Reason', 'have'],
        ['p2', '仔女 means…?', '「仔女」？', '仔女', 'zai2 neoi2', 'kids|Children|Family', 'friends|Friends|Social', 'tools|Tools|Work', 'kids'],
        ['p3', '都 dou1 can mean…?', '「都」可以？', '佢哋都去。', 'keoi5 dei6 dou1 heoi3', 'all|All / also|Scope', 'only|Only|Limit', 'never|Never|Negation', 'all'],
      ]),
    ],
  ),
  unit(
    'life4',
    4,
    { en: 'Campaign 6 · Arranging to meet (1)', zh: '航線六 · 約人（一）' },
    { en: 'Invite, free time, food, where to eat — Unit 4.', zh: '約人、得唔得閒、食咩、去邊——Unit 4。' },
    'river',
    [
      L(16, 'Why don’t we…?', '不如一齊打波吖', '不如 · 吖 suggestion.', '不如·吖建議。', ['不如', '約'], 'jade', '不如…吖', '不如我哋下個星期一齊打波吖。', 'bat1 jyu4 ngo5 dei6 haa6 go3 sing1 kei4 jat1 cai4 daa2 bo1 aa1', '不如 + suggestion + particle 吖. Weekday time words start here.', '「不如」＋建議＋「吖」。呢課開始用星期時間詞。', [
        ['p1', '不如 launches…?', '「不如」用來？', '不如去飲茶吖。', 'bat1 jyu4 heoi3 jam2 caa4 aa1', 'suggest|A suggestion|Invite', 'refuse|A refusal|No', 'past|Past tense|Time', 'suggest'],
        ['p2', '下個星期 is…?', '「下個星期」？', '下個星期', 'haa6 go3 sing1 kei4', 'nextweek|Next week|Time', 'lastweek|Last week|Past', 'today|Today|Now', 'nextweek'],
        ['p3', '一齊 means…?', '「一齊」？', '一齊去', 'jat1 cai4 heoi3', 'together|Together|With', 'alone|Alone|Solo', 'never|Never|Negation', 'together'],
      ]),
      L(17, 'When are you free?', '你幾時得呀？', 'Availability · 或者.', '得唔得閒·或者。', ['得', '時間'], 'harbor', '幾時得', '你幾時得呀？', 'nei5 gei2 si4 dak1 aa3?', '得 = available/okay. 或者 offers alternatives (vs 定 for exclusive or).', '「得」＝得閒／得。 「或者」俾選擇（同「定」唔一樣）。', [
        ['p1', '得 dak1 here ≈…?', '呢度「得」≈？', '我聽日得。', 'ngo5 ting1 jat6 dak1', 'free|Available / OK|Free', 'must|Must|Modal', 'eat|Eat|Food', 'free'],
        ['p2', '或者 vs 定?', '「或者」對「定」？', '星期一或者星期二', 'sing1 kei4 jat1 waak6 ze2 sing1 kei4 ji6', 'inclusive|Open alternatives|Or', 'same|Always identical|Same', 'negation|Both mean not|No', 'inclusive'],
        ['p3', 'Parts of day include…?', '一日分段有？', '下晝', 'haa6 zau3', 'afternoon|Afternoon|Time', 'year|Year|Date', 'who|Who|Person', 'afternoon'],
      ]),
      L(18, 'What do you want to eat?', '你想食咩呀？', '想 · cuisine.', '想·菜式。', ['想', '食'], 'gold', '想食咩', '你想食咩呀？', 'nei5 soeng2 sik6 me1 aa3?', 'Modal 想 “want to.” Ask cuisine preferences; 好唔好 checks suggestions.', '情態「想」＝想。問想食咩；「好唔好」確認建議。', [
        ['p1', '想 soeng2 means…?', '「想」？', '我想食麵。', 'ngo5 soeng2 sik6 min6', 'want|Want to|Modal', 'must|Must|Force', 'hate|Hate|Feeling', 'want'],
        ['p2', '好唔好 checks…?', '「好唔好」？', '去飲茶好唔好？', 'heoi3 jam2 caa4 hou2 m4 hou2?', 'ok|Is that good/OK?|Confirm', 'who|Who goes|Person', 'price|How much|Money', 'ok'],
        ['p3', '嘢 je5 can mean…?', '「嘢」可以？', '食嘢', 'sik6 je5', 'thing|Thing / stuff|Noun', 'only-people|People only|Person', 'never|Never|Negation', 'thing'],
      ]),
      L(19, 'Where do you want to eat?', '你想去邊度食呀？', 'Where to eat · 多啲.', '去邊食·多啲。', ['邊度', '食'], 'ink', '去邊度食', '你想去邊度食呀？', 'nei5 soeng2 heoi3 bin1 dou6 sik6 aa3?', 'Combine 想去 + 邊度 + 食. 多啲 can mark preferring one option more.', '「想去＋邊度＋食」。「多啲」可以講更鍾意邊個選擇。', [
        ['p1', 'Best question for place to eat?', '問去邊食？', '你想去邊度食呀？', 'nei5 soeng2 heoi3 bin1 dou6 sik6 aa3?', 'where|邊度食|Place', 'who|邊個食|Person', 'why|點解食|Why', 'where'],
        ['p2', '多啲 with preference ≈…?', '「多啲」講喜好≈？', '我想去呢度多啲。', 'ngo5 soeng2 heoi3 ni1 dou6 do1 di1', 'more|Prefer more|Compare', 'never|Never|Negation', 'plural|Plural|Noun', 'more'],
        ['p3', '去 heoi3 is…?', '「去」？', '去旺角', 'heoi3 wong6 gok3', 'go|Go|Motion', 'come|Come|Motion', 'stay|Stay|Home', 'go'],
      ]),
    ],
  ),
  unit(
    'life5',
    5,
    { en: 'Campaign 7 · Arranging to meet (2)', zh: '航線七 · 約人（二）' },
    { en: 'Restaurant, time, invite others, book a table — Unit 5.', zh: '揀餐廳、時間、約人、訂位——Unit 5。' },
    'river',
    [
      L(21, 'Which restaurant?', '你想去邊間餐廳食呀？', 'Classifier 間 · comments.', '量詞間·評價。', ['間', '餐廳'], 'jade', '邊間餐廳', '你想去邊間餐廳食呀？', 'nei5 soeng2 heoi3 bin1 gaan1 caan1 teng1 sik6 aa3?', 'Classifier 間 for shops/restaurants. 有／冇 + 過 for “have you been.”', '舖頭／餐廳用「間」。 「有冇＋過」問去過未。', [
        ['p1', '間 goes with…?', '「間」配？', '一間餐廳', 'jat1 gaan1 caan1 teng1', 'shop|Shops / restaurants|Place', 'people|People|Person', 'books|Books|Object', 'shop'],
        ['p2', '有冇去過 asks…?', '「有冇去過」？', '你有冇去過？', 'nei5 jau5 mou5 heoi3 gwo3?', 'been|Have you been?|Experience', 'price|How much?|Money', 'name|What’s your name?|Name', 'been'],
        ['p3', '不過 means…?', '「不過」？', '好食不過貴。', 'hou2 sik6 bat1 gwo3 gwai3', 'but|But|Contrast', 'and|And|Add', 'or|Or|Choice', 'but'],
      ]),
      L(22, 'What time should we eat?', '我哋食幾多點好呀？', 'Clock time · meeting point.', '幾點·集合。', ['幾點', '集合'], 'harbor', '幾多點', '我哋食幾多點好呀？', 'ngo5 dei6 sik6 gei2 do1 dim2 hou2 aa3?', '幾多點／幾點 for clock time. Agree meeting point and time.', '「幾多點／幾點」問鐘點；約集合時間同地點。', [
        ['p1', '幾多點 asks…?', '「幾多點」？', '幾多點？', 'gei2 do1 dim2?', 'time|What time|Clock', 'who|Who|Person', 'cost|How much money|Money', 'time'],
        ['p2', 'O唔OK checks…?', '「O唔OK」？', '七點O唔OK？', 'cat1 dim2 ou1 m4 ou1 kei1?', 'ok|Is it OK?|Confirm', 'where|Where|Place', 'why|Why|Reason', 'ok'],
        ['p3', 'Time before place is common — first say…?', '時間地點：先講？', '七點喺中環見', 'cat1 dim2 hai2 zung1 waan4 gin3', 'time|Time then place|Order', 'place-only|Place only|Place', 'name|Name first|Name', 'time'],
      ]),
      L(23, 'Want to come too?', '你去唔去呀？', '會 future · invite others.', '會·約其他人。', ['會', '約'], 'gold', '去唔去', '你去唔去呀？', 'nei5 heoi3 m4 heoi3 aa3?', '會 marks future. Invite extras with 去唔去 / 要. Particle 埋 “as well.”', '「會」表將來；用「去唔去／要」約多個人；「埋」＝一齊／都。', [
        ['p1', '會 wui5 (future) ≈…?', '將來「會」≈？', '我哋會食飯。', 'ngo5 dei6 wui5 sik6 faan6', 'will|Will|Future', 'can-swim|Know how|Ability', 'must|Must|Force', 'will'],
        ['p2', '去唔去 is…?', '「去唔去」？', '你去唔去？', 'nei5 heoi3 m4 heoi3?', 'xnx|X-not-X invite|Yes/no', 'past|Past tense|Time', 'name|A name|Noun', 'xnx'],
        ['p3', '要 jiu3 can mean…?', '「要」可以？', '要唔要去？', 'jiu3 m4 jiu3 heoi3?', 'need|Need / want to|Modal', 'never|Never|Negation', 'only-color|Color only|Adj', 'need'],
      ]),
      L(24, 'Book a table', '唔該我想book位嘅', 'Polite 唔該 · book seats.', '唔該·訂位。', ['唔該', '訂位'], 'ink', 'book位', '唔該我想book位嘅。', 'm4 goi1 ngo5 soeng2 buk1 wai2 ge3', 'Polite openers: 唔該 / 請問. Titles and 幾多號 for details.', '禮貌開場：唔該／請問。稱謂同「幾多號」問細節。', [
        ['p1', '唔該 often means…?', '「唔該」成日？', '唔該。', 'm4 goi1', 'please|Please / thanks|Polite', 'sorry-only|Only sorry|Apology', 'goodbye|Goodbye|Leave', 'please'],
        ['p2', '請問 is…?', '「請問」？', '請問…', 'cing2 man6', 'mayiask|May I ask…|Polite', 'iorder|I order|Food', 'imlost|I’m lost|Help', 'mayiask'],
        ['p3', 'book位 means…?', '「book位」？', 'book位', 'buk1 wai2', 'reserve|Reserve seats|Restaurant', 'pay|Pay bill|Money', 'cook|Cook|Kitchen', 'reserve'],
      ]),
    ],
  ),
  unit(
    'life6',
    6,
    { en: 'Campaign 8 · Having a meal (1)', zh: '航線八 · 食飯（一）' },
    { en: 'Table, ordering food & drinks, set meals — Unit 6.', zh: '入座、點菜飲品、套餐——Unit 6。' },
    'bamboo',
    [
      L(26, 'Have you booked?', '請問有冇book位嘅？', 'Getting a table.', '入座。', ['訂位', '枱'], 'jade', '有冇book位', '請問有冇book位嘅？', 'cing2 man6 jau5 mou5 buk1 wai2 ge2?', 'Arrive and confirm booking. Location words for table types.', '到步確認訂位；用位置詞講枱。', [
        ['p1', 'Staff may ask 有冇book位 — you…?', '店員問有冇book位——你？', '有，三個人。', 'jau5, saam1 go3 jan4', 'confirm|Confirm party size|Booking', 'order-now|Order mains only|Food', 'leave|Leave silently|Exit', 'confirm'],
        ['p2', '枱 toi2 is…?', '「枱」？', '圓枱', 'jyun4 toi2', 'table|Table|Furniture', 'bowl|Bowl|Dish', 'bill|Bill|Pay', 'table'],
        ['p3', '呢度／嗰度 point to…?', '「呢度／嗰度」指？', '坐呢度', 'co5 ni1 dou6', 'here|Here / there|Place', 'who|Who|Person', 'why|Why|Reason', 'here'],
      ]),
      L(27, 'Let’s order…', '不如叫涼瓜炒蛋吖', 'Dishes · classifiers.', '菜式·量詞。', ['叫', '菜'], 'harbor', '叫菜', '不如叫涼瓜炒蛋吖。', 'bat1 jyu4 giu3 loeng4 gwaa1 caau2 daan2 aa1', '叫 a dish. Food classifiers and soft suggestion particles.', '「叫」菜；食物量詞同建議助詞。', [
        ['p1', '叫 a dish means…?', '「叫」菜？', '叫一碟菜心', 'giu3 jat1 dip6 coi3 sam1', 'order|Order that dish|Order', 'cook-home|Cook at home only|Home', 'throw|Throw away|Waste', 'order'],
        ['p2', '碟 is a classifier for…?', '「碟」量？', '一碟', 'jat1 dip6', 'plated|Plated food|Food', 'people|People|Person', 'days|Days|Time', 'plated'],
        ['p3', '唔好 before a verb means…?', '動詞前「唔好」？', '唔好辣', 'm4 hou2 laat6', 'dont|Don’t / not too|Negation', 'must|Must|Force', 'already|Already|Aspect', 'dont'],
      ]),
      L(28, 'Please place the order', '唔該幫我哋落單吖', 'Drinks · 落單.', '飲品·落單。', ['落單', '飲'], 'gold', '落單', '唔該幫我哋落單吖。', 'm4 goi1 bong1 ngo5 dei6 lok6 daan1 aa1', '落單 = place the order. 要 for “want.” Drink classifiers.', '「落單」＝落單；「要」＝要；飲品量詞。', [
        ['p1', '落單 means…?', '「落單」？', '幫我落單', 'bong1 ngo5 lok6 daan1', 'order|Send the order|Service', 'pay|Pay only|Money', 'leave|Leave|Exit', 'order'],
        ['p2', '要 jiu3 for food ≈…?', '食物「要」≈？', '我要杯茶', 'ngo5 jiu3 bui1 caa4', 'want|I want…|Order', 'hate|I hate…|Feeling', 'am|I am…|Copula', 'want'],
        ['p3', '杯 measures…?', '「杯」量？', '一杯', 'jat1 bui1', 'cups|Cup drinks|Drink', 'people|People|Person', 'tables|Tables|Furniture', 'cups'],
      ]),
      L(29, 'One set C', '一個C餐吖唔該', 'Cha chaan teng sets.', '茶餐廳套餐。', ['套餐', '餐'], 'ink', 'C餐', '一個C餐吖唔該。', 'jat1 go3 C caan1 aa1 m4 goi1', 'Set meals and special requests. Particles for “ready/possible.”', '套餐同特別要求；助詞講好未／得唔得。', [
        ['p1', 'C餐 is…?', '「C餐」？', 'C餐', 'C caan1', 'set|Set meal C|Menu', 'bus|Bus C|Travel', 'name|A surname|Name', 'set'],
        ['p2', '得 dak1 (possibility) ≈…?', '可能「得」≈？', '而家叫得。', 'ji4 gaa1 giu3 dak1', 'can|Can / possible|Ability', 'must|Must|Force', 'never|Never|Negation', 'can'],
        ['p3', '好 hou2 as particle can mark…?', '助詞「好」可標？', '煮好未？', 'zyu2 hou2 mei6?', 'done|Finished|Aspect', 'who|Who|Person', 'color|Color|Adj', 'done'],
      ]),
    ],
  ),
  unit(
    'life7',
    7,
    { en: 'Campaign 9 · Having a meal (2)', zh: '航線九 · 食飯（二）' },
    { en: 'Serving, extra chopsticks, opinions, the bill — Unit 7.', zh: '上菜、加筷、評價、埋單——Unit 7。' },
    'bamboo',
    [
      L(31, 'Whose set is this?', 'C餐係邊個㗎？', 'Serving food.', '上菜。', ['上菜', '邊個'], 'jade', '係邊個', 'C餐係邊個㗎？', 'C caan1 hai6 bin1 go3 gaa3?', 'Match dishes to people. 要 for needs; 同 “for.”', '菜對人；「要」講需要；「同」＝為。', [
        ['p1', 'Waiter: C餐係邊個 — you say…?', '店員：C餐係邊個——你？', '我嘅。', 'ngo5 ge3', 'mine|Mine|Possessive', 'bill|Bill please|Pay', 'spicy|Make it spicy|Taste', 'mine'],
        ['p2', '同 tung4 can mean…?', '「同」可以？', '同我加茶', 'tung4 ngo5 gaa1 caa4', 'for|For / with|Prep', 'only-or|Only “or”|Choice', 'never|Never|Negation', 'for'],
        ['p3', '係 for emphasis can…?', '強調「係」可以？', '係我叫嘅', 'hai6 ngo5 giu3 ge3', 'stress|Stress identity|Focus', 'past|Past only|Time', 'plural|Plural|Noun', 'stress'],
      ]),
      L(32, 'More chopsticks please', '俾多一對筷子', 'Tableware help.', '餐具。', ['筷子', '可以'], 'harbor', '筷子', '唔該可唔可以俾多一對筷子我哋呀？', 'm4 goi1 ho2 m4 ho2 ji5 bei2 do1 jat1 deoi3 faai3 zi2 ngo5 dei6 aa3?', '可以 polite ability. 俾 give. 多／少 for more/less.', '「可以」禮貌能力；「俾」＝給；「多／少」加減。', [
        ['p1', '可唔可以 asks…?', '「可唔可以」？', '可唔可以…？', 'ho2 m4 ho2 ji5?', 'can|Can you…?|Polite', 'who|Who|Person', 'when|When|Time', 'can'],
        ['p2', '俾 bei2 means…?', '「俾」？', '俾我', 'bei2 ngo5', 'give|Give|Verb', 'buy|Buy|Shop', 'run|Run|Sport', 'give'],
        ['p3', '一對筷子 — 對 is…?', '「一對筷子」嘅「對」？', '一對', 'jat1 deoi3', 'pair|Pair classifier|Classifier', 'people|Person classifier|Person', 'day|Day|Time', 'pair'],
      ]),
      L(33, 'How’s the food?', '你覺得點呀？', 'Opinions · too…', '評價·太。', ['覺得', '點'], 'gold', '覺得點', '你哋覺得個炒飯點呀？', 'nei5 dei6 gok3 dak1 go3 caau2 faan6 dim2 aa3?', '覺得 + 點 for opinions. 太 / 得滯 / 夠 for degree.', '「覺得＋點」評價；「太／得滯／夠」講程度。', [
        ['p1', '覺得 means…?', '「覺得」？', '我覺得好食。', 'ngo5 gok3 dak1 hou2 sik6', 'think|Think / feel|Opinion', 'buy|Buy|Shop', 'run|Run|Sport', 'think'],
        ['p2', '點 asking opinion ≈…?', '評價「點」≈？', '點呀？', 'dim2 aa3?', 'how|How is it?|Opinion', 'who|Who|Person', 'where|Where|Place', 'how'],
        ['p3', '太 taai3 means…?', '「太」？', '太鹹', 'taai3 haam4', 'too|Too / so|Degree', 'not|Not|Negation', 'also|Also|Add', 'too'],
      ]),
      L(34, 'Bill please', '埋單吖唔該', 'Paying · prices.', '埋單·價錢。', ['埋單', '錢'], 'ink', '埋單', '埋單吖唔該。', 'maai4 daan1 aa1 m4 goi1', '埋單 = ask for the bill. 幾多錢 for price. Payment vocabulary.', '「埋單」＝埋單；「幾多錢」問價；付款詞彙。', [
        ['p1', '埋單 means…?', '「埋單」？', '埋單', 'maai4 daan1', 'bill|Get the bill|Pay', 'order|Order food|Food', 'reserve|Reserve|Book', 'bill'],
        ['p2', '幾多錢 asks…?', '「幾多錢」？', '幾多錢？', 'gei2 do1 cin2?', 'cost|How much money|Money', 'time|What time|Clock', 'who|Who|Person', 'cost'],
        ['p3', '找 zaau2 at checkout is…?', '埋單「找」？', '找錢', 'zaau2 cin2', 'change|Give change|Money', 'search|Search only|Look', 'run|Run|Sport', 'change'],
      ]),
    ],
  ),
  unit(
    'life8',
    8,
    { en: 'Campaign 10 · Going out', zh: '航線十 · 出街' },
    { en: 'Errands, street find, mall floors, walking directions — Unit 8.', zh: '跑腿、搵路、商場樓層、點行——Unit 8。' },
    'river',
    [
      L(36, 'Can you buy some…?', '可唔可以去街市買…', 'Errands · 嗰陣.', '跑腿·嗰陣。', ['街市', '買'], 'jade', '去街市買', '可唔可以去街市買啲叉燒呀？', 'ho2 m4 ho2 ji5 heoi3 gaai1 si5 maai5 di1 caa1 siu1 aa3?', 'Ask someone to run an errand. 嗰陣時 “when.” Directional verbs.', '叫人跑腿；「嗰陣時」＝當…時；方向動詞。', [
        ['p1', '街市 is…?', '「街市」？', '街市', 'gaai1 si5', 'market|Wet market|Place', 'school|School|Study', 'beach|Beach|Leisure', 'market'],
        ['p2', '嗰陣時 means…?', '「嗰陣時」？', '返嚟嗰陣', 'faan1 lai4 go2 zan6', 'when|When (that time)|Time', 'who|Who|Person', 'never|Never|Negation', 'when'],
        ['p3', '會 future can also…?', '將來「會」又可以？', '我會買。', 'ngo5 wui5 maai5', 'will|Will|Future', 'swim|Know how to swim|Ability', 'must-eat|Must eat|Force', 'will'],
      ]),
      L(37, 'What’s nearby?', '附近邊度有…', 'Finding places.', '搵地方。', ['附近', '有'], 'harbor', '附近', '呢度附近邊度有糖水舖呀？', 'ni1 dou6 fu6 gan6 bin1 dou6 jau5 tong4 seoi2 pou2 aa3?', '附近 + 邊度有. Location expressions and 應該.', '「附近＋邊度有」。位置詞同「應該」。', [
        ['p1', '附近 means…?', '「附近」？', '附近', 'fu6 gan6', 'nearby|Nearby|Place', 'far|Far away|Place', 'yesterday|Yesterday|Time', 'nearby'],
        ['p2', '應該 means…?', '「應該」？', '你應該直行。', 'nei5 jing1 goi1 zik6 haang4', 'should|Should|Modal', 'never|Never|Negation', 'already|Already|Aspect', 'should'],
        ['p3', '即係 can mean…?', '「即係」可以？', '即係轉左', 'zik1 hai6 zyun3 zo2', 'mean|That means / i.e.|Explain', 'or|Or|Choice', 'buy|Buy|Shop', 'mean'],
      ]),
      L(38, 'Which floor?', '喺幾多樓呀？', 'Mall floors · 點行.', '幾多樓·點行。', ['樓', '方向'], 'gold', '幾多樓', '超級市場喺幾多樓呀？', 'ciu1 kap1 si5 coeng4 hai2 gei2 do1 lau2 aa3?', 'Floor numbers and mall directions. Sequence + 到 arrival.', '樓層同商場方向；順序詞同「到」到達。', [
        ['p1', '幾多樓 asks…?', '「幾多樓」？', '幾多樓？', 'gei2 do1 lau2?', 'floor|Which floor|Building', 'cost|How much|Money', 'who|Who|Person', 'floor'],
        ['p2', '點／點樣 can ask…?', '「點／點樣」可問？', '點去？', 'dim2 heoi3?', 'how|How / which way|Manner', 'who|Who|Person', 'only-when|Only when|Time', 'how'],
        ['p3', '到 dou3 (arrival) marks…?', '「到」到達標？', '行到門口', 'haang4 dou3 mun4 hau2', 'arrive|Reach / arrive|Aspect', 'plural|Plural|Noun', 'never|Never|Negation', 'arrive'],
      ]),
      L(39, 'How should I walk?', '我應該點行呀？', 'Street directions.', '點行。', ['行', '方向'], 'ink', '點行', '我應該點行呀？', 'ngo5 jing1 goi1 dim2 haang4 aa3?', '沿 along, 之前／之後, successive actions.', '「沿」沿住；「之前／之後」；連續動作。', [
        ['p1', '直行 means…?', '「直行」？', '直行', 'zik6 haang4', 'straight|Go straight|Direction', 'turn|Turn only|Turn', 'stop|Stop|Halt', 'straight'],
        ['p2', '轉左／轉右 are…?', '「轉左／轉右」？', '轉左', 'zyun3 zo2', 'turns|Turn left/right|Direction', 'foods|Food words|Food', 'names|Names|Person', 'turns'],
        ['p3', '之前 means…?', '「之前」？', '轉角之前', 'zyun3 gok3 zi1 cin4', 'before|Before|Time', 'after|After|Time', 'never|Never|Negation', 'before'],
      ]),
    ],
  ),
  unit(
    'life9',
    9,
    { en: 'Campaign 11 · Buying ingredients', zh: '航線十一 · 買餸' },
    { en: 'Cook plans, veggies, meat, seafood — Unit 9.', zh: '諗住煮、菜、肉、海鮮——Unit 9。' },
    'river',
    [
      L(41, 'What will you cook?', '你今晚諗住煮啲咩呀？', '諗住 · wet market.', '諗住·街市。', ['諗住', '煮'], 'jade', '諗住煮', '你今晚諗住煮啲咩呀？', 'nei5 gam1 maan5 nam2 zyu6 zyu2 di1 me1 aa3?', '諗住 = plan to. Grocery classifiers and market stalls.', '「諗住」＝打算；餸量詞同街市檔。', [
        ['p1', '諗住 means…?', '「諗住」？', '我諗住煮湯。', 'ngo5 nam2 zyu6 zyu2 tong1', 'plan|Plan to|Intent', 'hate|Hate|Feeling', 'forgot|Forgot|Memory', 'plan'],
        ['p2', '今晚 is…?', '「今晚」？', '今晚', 'gam1 maan5', 'tonight|Tonight|Time', 'last-year|Last year|Past', 'morning|Morning only|Time', 'tonight'],
        ['p3', '會 for habit can mark…?', '習慣「會」標？', '我平時會買菜。', 'ngo5 ping4 si4 wui5 maai5 coi3', 'habit|Habitual will|Habit', 'must|Must|Force', 'never|Never|Negation', 'habit'],
      ]),
      L(42, 'How much a catty?', '菜心幾錢斤呀？', 'Weight · prices.', '斤兩·價錢。', ['斤', '價錢'], 'harbor', '幾錢斤', '菜心幾錢斤呀？', 'coi3 sam1 gei2 cin2 gan1 aa3?', '斤 catty pricing. Persuasion particles at the stall.', '論斤問價；檔口勸說助詞。', [
        ['p1', '斤 gan1 is…?', '「斤」？', '一斤', 'jat1 gan1', 'catty|Catty weight|Measure', 'day|Day|Time', 'person|Person|People', 'catty'],
        ['p2', '幾錢／幾多錢 asks…?', '「幾錢」問？', '幾錢斤？', 'gei2 cin2 gan1?', 'price|Price|Money', 'who|Who|Person', 'where|Where|Place', 'price'],
        ['p3', '菜心 is…?', '「菜心」？', '菜心', 'coi3 sam1', 'choysum|Choy sum|Veg', 'pork|Pork|Meat', 'bus|Bus|Travel', 'choysum'],
      ]),
      L(43, 'Which cut for steaming?', '蒸排骨買邊個位', 'Meat cuts · 如果.', '肉部位·如果。', ['肉', '如果'], 'gold', '如果…嘅話', '如果用嚟蒸排骨嘅話，應該買邊個位呀？', 'jyu4 gwo2 jung6 lai4 zing1 paai4 gwat1 ge3 waa2, jing1 goi1 maai5 bin1 go3 wai2 aa3?', '如果…嘅話 conditionals. Cuts and cooking methods.', '「如果…嘅話」條件句；部位同煮法。', [
        ['p1', '如果…嘅話 marks…?', '「如果…嘅話」標？', '如果…嘅話', 'jyu4 gwo2… ge3 waa2', 'if|If-clause|Condition', 'because|Because only|Cause', 'or|Or|Choice', 'if'],
        ['p2', '蒸 is…?', '「蒸」？', '蒸', 'zing1', 'steam|Steam|Cook', 'fry-only|Only fry|Cook', 'buy|Buy|Shop', 'steam'],
        ['p3', '排骨 is…?', '「排骨」？', '排骨', 'paai4 gwat1', 'ribs|Ribs|Meat', 'fish|Fish|Seafood', 'tea|Tea|Drink', 'ribs'],
      ]),
      L(44, 'How to cook these?', '可以點煮呀？', 'Seafood · 點煮.', '海鮮·點煮。', ['海鮮', '煮'], 'ink', '點煮', '蟶子可以點煮呀？', 'sing3 zi2 ho2 ji5 dim2 zyu2 aa3?', 'Ask cooking methods. 種／隻 types; 一係 either-or.', '問煮法；「種／隻」類型；「一係」二選一。', [
        ['p1', '點煮 asks…?', '「點煮」？', '點煮？', 'dim2 zyu2?', 'howcook|How to cook|Method', 'who|Who cooks|Person', 'cost|How much|Money', 'howcook'],
        ['p2', '一係…一係… ≈…?', '「一係…一係」≈？', '一係蒸一係炒', 'jat1 hai6 zing1 jat1 hai6 caau2', 'either|Either…or…|Choice', 'both-and|Both required|And', 'never|Never|Negation', 'either'],
        ['p3', '完 jyun4 marks…?', '「完」標？', '洗完', 'sai2 jyun4', 'finished|Finished|Aspect', 'start|Start|Begin', 'plural|Plural|Noun', 'finished'],
      ]),
    ],
  ),
  unit(
    'life10',
    10,
    { en: 'Campaign 12 · Taking transport', zh: '航線十二 · 搭車' },
    { en: 'Routes, choices, MTR, bus/taxi — Unit 10.', zh: '搭咩車、點揀、地鐵、巴士的士——Unit 10。' },
    'bamboo',
    [
      L(46, 'What can I take?', '可以坐咩車去', 'Transport options.', '交通。', ['車', '坐'], 'jade', '坐咩車', '可以坐咩車去呀？', 'ho2 ji5 zo6 me1 ce1 heoi3 aa3?', '坐 + transport. 知／知道. Subway and bus vocabulary.', '「坐」＋交通工具；「知／知道」；地鐵巴士詞。', [
        ['p1', '坐地鐵 means…?', '「坐地鐵」？', '坐地鐵', 'co5 dei6 tit3', 'take-mtr|Take the MTR|Transit', 'buy-car|Buy a car|Shop', 'swim|Swim|Sport', 'take-mtr'],
        ['p2', '知唔知道 asks…?', '「知唔知道」？', '你知唔知道？', 'nei5 zi1 m4 zi1 dou3?', 'know|Do you know?|Knowledge', 'go|Are you going?|Motion', 'eat|Did you eat?|Food', 'know'],
        ['p3', '再 can mean…?', '「再」可以？', '再轉車', 'zoi3 zyun3 ce1', 'then|Again / and then|Sequence', 'never|Never|Negation', 'who|Who|Person', 'then'],
      ]),
      L(47, 'Is the MTR good?', '坐地鐵去好唔好呀？', 'Compare routes.', '比較路線。', ['地鐵', '好唔好'], 'harbor', '好唔好', '坐地鐵去好唔好呀？', 'co5 dei6 tit3 heoi3 hou2 m4 hou2 aa3?', 'Duration, 由 from, 除咗 apart from, 但係 but.', '時間、由、除咗、但係。', [
        ['p1', '由 jau4 means…?', '「由」？', '由中環去', 'jau4 zung1 waan4 heoi3', 'from|From|Origin', 'with|With|Company', 'for|For|Benefactive', 'from'],
        ['p2', '但係 means…?', '「但係」？', '快但係要轉車', 'faai3 daan6 hai6 jiu3 zyun3 ce1', 'but|But|Contrast', 'and|And|Add', 'or|Or|Choice', 'but'],
        ['p3', '幾耐 asks…?', '「幾耐」？', '要幾耐？', 'jiu3 gei2 noi6?', 'howlong|How long|Duration', 'howmuch|How much money|Money', 'who|Who|Person', 'howlong'],
      ]),
      L(48, 'Which exit?', '喺邊個出口呀？', 'MTR · Octopus.', '地鐵·八達通。', ['出口', '八達通'], 'gold', '出口', '紅館喺邊個出口呀？', 'hung4 gun2 hai2 bin1 go3 ceot1 hau2 aa3?', 'Exit numbers and station language. Relative clauses begin.', '出口編號同車站用語；開始接觸關係子句。', [
        ['p1', '出口 is…?', '「出口」？', 'A出口', 'A ceot1 hau2', 'exit|Exit|Station', 'entrance-only|Entrance only|Station', 'bus|Bus|Travel', 'exit'],
        ['p2', '八達通 is…?', '「八達通」？', '八達通', 'baat3 daat6 tung1', 'octopus|Octopus card|Pay', 'passport|Passport|Travel', 'menu|Menu|Food', 'octopus'],
        ['p3', '請問 softens…?', '「請問」令？', '請問…', 'cing2 man6', 'ask|A polite ask|Polite', 'order|An order|Food', 'goodbye|Goodbye|Leave', 'ask'],
      ]),
      L(49, 'Does this bus pass…?', '經唔經…㗎？', 'Bus · minibus · taxi.', '巴士·小巴·的士。', ['巴士', '經'], 'ink', '經唔經', '呢架巴士經唔經維園㗎？', 'ni1 gaa3 baa1 si2 ging1 m4 ging1 wai4 jyun2 gaa3?', '經 “pass through.” Vehicle classifier 架. Taxi/minibus talk.', '「經」＝經過；車用「架」；的士／小巴用語。', [
        ['p1', '經 means…?', '「經」？', '經旺角', 'ging1 wong6 gok3', 'via|Pass through|Route', 'buy|Buy|Shop', 'eat|Eat|Food', 'via'],
        ['p2', '架 classifier for…?', '量詞「架」？', '一架巴士', 'jat1 gaa3 baa1 si2', 'vehicles|Vehicles|Transport', 'people|People|Person', 'books|Books|Object', 'vehicles'],
        ['p3', '的士 is…?', '「的士」？', '的士', 'dik1 si2', 'taxi|Taxi|Transport', 'train|Train|Transport', 'boat|Boat|Transport', 'taxi'],
      ]),
    ],
  ),
  unit(
    'life11',
    11,
    { en: 'Campaign 13 · Buying clothes', zh: '航線十三 · 買衫' },
    { en: 'Shopping plans, sizes, comparisons, discounts — Unit 11.', zh: '買咩、尺碼、邊件好啲、有冇折——Unit 11。' },
    'bamboo',
    [
      L(51, 'What do you want to buy?', '你想買啲咩呀？', 'Clothes plans · enter store.', '買衫計劃·入舖。', ['買', '衫'], 'jade', '想買咩', '你想買啲咩呀？', 'nei5 soeng2 maai5 di1 me1 aa3?', 'Clothes classifiers. Particles 定 / 過 for planning and re-doing.', '衫褲量詞；「定／過」講預先同再嚟。', [
        ['p1', '件 often classifies…?', '「件」成日量？', '一件衫', 'jat1 gin6 saam1', 'clothes|Clothes items|Wear', 'people|People|Person', 'days|Days|Time', 'clothes'],
        ['p2', '買 means…?', '「買」？', '買衫', 'maai5 saam1', 'buy|Buy|Shop', 'sell-only|Sell only|Shop', 'wear|Wear only|Wear', 'buy'],
        ['p3', '放 fong3 can mean…?', '「放」可以？', '放喺度', 'fong3 hai2 dou6', 'put|Put / place|Verb', 'run|Run|Sport', 'sing|Sing|Music', 'put'],
      ]),
      L(52, 'I wear medium', '我着開中碼嘅', 'Sizes · 開 habitual.', '尺碼·開。', ['碼', '着'], 'harbor', '中碼', '我着開中碼嘅。', 'ngo5 zoek3 hoi1 zung1 maa5 ge3', '着／著 wear; 開 habitual. Colors and fit comments.', '「着／著」穿；「開」習慣體；顏色同大細評價。', [
        ['p1', '中碼 is…?', '「中碼」？', '中碼', 'zung1 maa5', 'medium|Medium size|Size', 'spicy|Spicy|Taste', 'exit|Exit|Station', 'medium'],
        ['p2', '開 hoi1 (habitual) ≈…?', '習慣「開」≈？', '我着開呢個碼', 'ngo5 zoek3 hoi1 ni1 go3 maa5', 'usually|Usually wear|Habit', 'now-only|Only right now|Progressive', 'never|Never|Negation', 'usually'],
        ['p3', '着／著 zoek3 means…?', '「着／著」？', '着衫', 'zoek3 saam1', 'wear|Wear (clothes)|Wear', 'buy|Buy|Shop', 'wash|Wash|Clean', 'wear'],
      ]),
      L(53, 'Which is better?', '你覺得邊件好啲呀？', 'Comparatives · 多啲.', '比較·多啲。', ['好啲', '比較'], 'gold', '好啲', '你覺得邊件好啲呀？', 'nei5 gok3 dak1 bin1 gin6 hou2 di1 aa3?', 'Adjective + 啲 / 過 comparatives; 最 superlative; 多啲 with likes.', '形容詞＋啲／過比較；「最」最高級；「多啲」講更鍾意。', [
        ['p1', '好啲 means…?', '「好啲」？', '呢件好啲', 'ni1 gin6 hou2 di1', 'better|A bit better|Compare', 'worst|Worst|Compare', 'only|Only|Limit', 'better'],
        ['p2', '最 marks…?', '「最」標？', '最好', 'zeoi3 hou2', 'most|Superlative|Compare', 'plural|Plural|Noun', 'past|Past|Time', 'most'],
        ['p3', '鍾意…多啲 means…?', '「鍾意…多啲」？', '我鍾意呢件多啲', 'ngo5 zung1 ji3 ni1 gin6 do1 di1', 'prefer|Like this more|Compare', 'hate|Hate this|Feeling', 'buy-two|Must buy two|Shop', 'prefer'],
      ]),
      L(54, 'Any discount?', '而家有冇折呀？', 'Discounts · checkout.', '折扣·付款。', ['折', '價錢'], 'ink', '有冇折', '而家有冇折呀？', 'ji4 gaa1 jau5 mou5 zit3 aa3?', '折 discounts. Polite 會 invitations; 所有 “all.”', '「折」折扣；禮貌「會」邀請；「所有」＝全部。', [
        ['p1', '有冇折 asks…?', '「有冇折」？', '有冇折？', 'jau5 mou5 zit3?', 'discount|Any discount?|Shop', 'size|Any size?|Size', 'exit|Which exit?|Station', 'discount'],
        ['p2', '九折 means…?', '「九折」？', '九折', 'gau2 zit3', '10off|10% off (90%)|Price', 'nine-items|Nine items|Count', 'floor-nine|9th floor|Building', '10off'],
        ['p3', '所有 means…?', '「所有」？', '所有貨品', 'so2 jau5 fo3 ban2', 'all|All|Scope', 'none|None|Negation', 'one|Only one|Limit', 'all'],
      ]),
    ],
  ),
]

export const LIFE_BOOK_UNITS: UnitSeed[] = [...LIFE_UNIT_SEEDS, ...MORE_UNITS]

export const HARBOR_LIFE_CAMPAIGNS: {
  id: LifeUnitId
  title: LearnLine
  blurb: LearnLine
  realm: HarborRealmId
  ocHome: string
}[] = LIFE_BOOK_UNITS.map((u) => ({
  id: u.id,
  title: u.title,
  blurb: u.blurb,
  realm: u.realm,
  ocHome: u.ocHome,
}))

/** All Life 1 Unit 1–11 piers (4 lessons × 11 units). */
export const LIFE_BOOK_LEVELS: HarborLevel[] = LIFE_BOOK_UNITS.flatMap((u) =>
  u.lessons.map((lesson) => levelFromLesson(u, lesson, lesson.lesson)),
)

export const LIFE_BOOK_LEVEL_COUNT = LIFE_BOOK_LEVELS.length
