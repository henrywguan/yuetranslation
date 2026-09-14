/**
 * Harbor Quest · Campaign 2 — Cantonese Life · Unit 0 (Getting started).
 *
 * Mirrors Open Cantonese Unit 0 audio habits: play/listen on every phrase,
 * listen-first guessing, classroom drills, daily register, numbers + 第 ordinals.
 * Challenge copy is original game writing (not a textbook reprint).
 * Source: https://opencantonese.org/books/cantonese-life-1/unit-0
 */
import type { HarborLevel } from './curriculum'

/** Open Cantonese Unit 0 book root. */
export const OC_UNIT0_BASE = 'https://opencantonese.org/books/cantonese-life-1/unit-0'

export const LIFE0_LEVELS: HarborLevel[] = [
  {
    id: 'life0-guess',
    campaign: 'life0',
    realm: 'bamboo',
    ocBase: OC_UNIT0_BASE,
    ocLesson: '1-guess-the-word',
    chapter: 0,
    title: { en: 'Guess from the sound', zh: '聽聲估詞' },
    blurb: {
      en: 'Hear first — then name the food/loanword (Unit 0 opener).',
      zh: '先聽後估——食物／外來詞（Unit 0 開場）。',
    },
    tags: ['listen', 'loanwords'],
    hue: 'gold',
    steps: [
      {
        kind: 'teach',
        id: 'g-brief',
        title: { en: 'Ears before eyes', zh: '先用耳，後用眼' },
        body: {
          en: 'Open Cantonese opens Unit 0 with audio: hear a Cantonese word, then guess the meaning. Many food names are loanwords reshaped to Cantonese sounds — tap Speak on every chip.',
          zh: 'Open Cantonese Unit 0 由聽力開始：聽粵語詞，再估意思。好多食物名係外來詞——每個詞撳「講」。',
        },
        spotlight: '聽 → 估',
        spotlightHint: { en: 'Listen, then choose', zh: '先聽，再揀' },
        hear: [
          { han: '係咪？', label: 'hai6 mai6?' },
          { han: '啱喇', label: 'ngaam1 laa3' },
        ],
      },
      {
        kind: 'pick',
        id: 'g-bus',
        tip: {
          en: 'Listen first — then pick the English meaning.',
          zh: '先聽——再揀英文意思。',
        },
        prompt: { en: 'You hear 巴士. What is it?', zh: '你聽到「巴士」。係咩？' },
        hear: [{ han: '巴士', label: 'baa1 si2' }],
        choices: [
          { id: 'bus', label: 'Bus', sub: 'Vehicle' },
          { id: 'bread', label: 'Bread', sub: 'Food' },
          { id: 'ball', label: 'Ball', sub: 'Toy' },
        ],
        correctId: 'bus',
        explain: {
          en: '巴士 baa1 si2 is “bus” — English reshaped into Cantonese syllables.',
          zh: '巴士 baa1 si2＝bus——英文聲改成粵語音節。',
        },
      },
      {
        kind: 'pick',
        id: 'g-sofa',
        prompt: { en: 'You hear 梳化. What is it?', zh: '你聽到「梳化」。係咩？' },
        hear: [{ han: '梳化', label: 'so1 faa2' }],
        choices: [
          { id: 'sofa', label: 'Sofa', sub: 'Furniture' },
          { id: 'soup', label: 'Soup', sub: 'Food' },
          { id: 'soap', label: 'Soap', sub: 'Wash' },
        ],
        correctId: 'sofa',
        explain: {
          en: '梳化 so1 faa2 ≈ sofa — another listen-first loanword.',
          zh: '梳化 so1 faa2 ≈ sofa——又一個先聽後識嘅外來詞。',
        },
      },
      {
        kind: 'pick',
        id: 'g-phrase',
        tip: {
          en: 'Classroom guess phrases — tap Speak, then answer.',
          zh: '課堂估詞用語——撳講，再答。',
        },
        prompt: {
          en: 'Which phrase means “Correct — that’s it”?',
          zh: '邊句係「啱喇，就係咁」？',
        },
        hear: [
          { han: '啱喇，就係巴士喇。', label: 'ngaam1 laa3, zau6 hai6 baa1 si2 laa3' },
          { han: '唔係巴士呀，再試吓吖。', label: 'm4 hai6 baa1 si2 aa3, zoi3 si3 haa5 aa1' },
        ],
        choices: [
          { id: 'ok', label: '啱喇，就係…喇', sub: 'ngaam1 laa3…' },
          { id: 'no', label: '唔係…呀，再試吓', sub: 'm4 hai6…' },
          { id: 'q', label: '係咪…呀？', sub: 'hai6 mai6…' },
        ],
        correctId: 'ok',
        explain: {
          en: '啱喇 confirms a guess; 唔係 + 再試吓 asks them to try again.',
          zh: '「啱喇」確認估中；「唔係＋再試吓」叫人再試。',
        },
      },
      {
        kind: 'pick',
        id: 'g-cookie',
        prompt: {
          en: 'Level-3 loanwords often end with a type syllable. 曲奇餅 ends with…?',
          zh: '第三級外來詞成日用類別字收尾。「曲奇餅」結尾係？',
        },
        hear: [{ han: '曲奇餅', label: 'kuk1 kei4 beng2' }],
        choices: [
          { id: 'beng', label: '餅 beng2', sub: 'Biscuit / cake type' },
          { id: 'faa', label: '花 faa1', sub: 'Flower' },
          { id: 'jyu', label: '魚 jyu4', sub: 'Fish' },
        ],
        correctId: 'beng',
        explain: {
          en: '餅 marks the kind of thing — “cookie + biscuit-type” compounding.',
          zh: '「餅」標示類別——好似「曲奇＋餅」噉複合。',
        },
      },
    ],
  },
  {
    id: 'life0-classroom',
    campaign: 'life0',
    realm: 'bamboo',
    ocBase: OC_UNIT0_BASE,
    ocLesson: '2-classroom-language',
    chapter: 1,
    title: { en: 'Classroom language', zh: '課堂用語' },
    blurb: {
      en: 'Listen & repeat — action verbs and class talk.',
      zh: '聽同跟讀——動作動詞同課堂說話。',
    },
    tags: ['listen', 'classroom'],
    hue: 'jade',
    steps: [
      {
        kind: 'teach',
        id: 'c-verbs',
        title: { en: 'Seven class verbs', zh: '七個課堂動詞' },
        body: {
          en: 'Open Cantonese puts a play button on every row: listen, then repeat. Tap Speak on each chip.',
          zh: 'Open Cantonese 每一行都有播放掣：先聽，再跟讀。每個詞撳「講」。',
        },
        spotlight: '聽 講 讀',
        spotlightHint: { en: 'Listen · speak · read aloud', zh: '聽 · 講 · 讀' },
        hear: [
          { han: '聽', label: 'teng1' },
          { han: '講', label: 'gong2' },
          { han: '讀', label: 'duk6' },
          { han: '睇', label: 'tai2' },
          { han: '寫', label: 'se2' },
          { han: '揀', label: 'gaan2' },
          { han: '填', label: 'tin4' },
        ],
      },
      {
        kind: 'pick',
        id: 'c-listen',
        prompt: { en: 'Which verb means “listen”?', zh: '邊個動詞係「聽」？' },
        hear: [{ han: '聽', label: 'teng1' }],
        choices: [
          { id: 'teng', label: '聽 teng1', sub: 'Listen' },
          { id: 'tai', label: '睇 tai2', sub: 'Look / read' },
          { id: 'se', label: '寫 se2', sub: 'Write' },
        ],
        correctId: 'teng',
        explain: { en: '聽 teng1 — ears open.', zh: '聽 teng1——用耳。' },
      },
      {
        kind: 'pick',
        id: 'c-repeat',
        prompt: {
          en: 'Teacher says: “Repeat after me.” Which line?',
          zh: '老師話：「跟住我讀。」係邊句？',
        },
        hear: [{ han: '跟住我讀。', label: 'gan1 zyu6 ngo5 duk6' }],
        choices: [
          { id: 'rep', label: '跟住我讀', sub: 'gan1 zyu6 ngo5 duk6' },
          { id: 'page', label: '揭去第二頁', sub: 'Turn the page' },
          { id: 'q', label: '有冇問題？', sub: 'Any questions?' },
        ],
        correctId: 'rep',
        explain: {
          en: '跟住我讀 — classic listen-and-repeat cue.',
          zh: '跟住我讀——經典跟讀提示。',
        },
      },
      {
        kind: 'pick',
        id: 'c-feedback',
        prompt: { en: 'Which pair is praise vs try-again?', zh: '邊對係讚同再試？' },
        hear: [
          { han: '啱喇，非常好！', label: 'ngaam1 laa3, fei1 soeng4 hou2' },
          { han: '唔啱呀，再試吓吖。', label: 'm4 ngaam1 aa3, zoi3 si3 haa5 aa1' },
        ],
        choices: [
          { id: 'pair', label: '啱喇 / 唔啱＋再試', sub: 'Correct / try again' },
          { id: 'hello', label: '哈佬 / 拜拜', sub: 'Hello / bye' },
          { id: 'num', label: '一 / 二', sub: 'Numbers' },
        ],
        correctId: 'pair',
        explain: {
          en: 'Classroom feedback loops — hear the tone of praise vs retry.',
          zh: '課堂回饋——聽讚同再試嘅語氣。',
        },
      },
      {
        kind: 'build',
        id: 'c-polite-q',
        tip: {
          en: '請問 softens a question — build a polite “how do you read this?”',
          zh: '「請問」令問題更有禮貌——砌一句「點讀」。',
        },
        prompt: {
          en: 'Assemble: “Excuse me, how do you read this character?”',
          zh: '砌：「請問呢個字點讀呀？」',
        },
        hear: [{ han: '請問呢個字點讀呀？', label: 'cing2 man6 ni1 go3 zi6 dim2 duk6 aa3' }],
        slots: [
          { key: 'soft', label: 'Softener', options: ['請問', '喂', '哈佬'] },
          { key: 'what', label: 'Target', options: ['呢個字', '巴士', '第二頁'] },
          { key: 'ask', label: 'Ask', options: ['點讀呀', '點解呀', '講慢啲'] },
        ],
        correct: { soft: '請問', what: '呢個字', ask: '點讀呀' },
        resultJp: 'cing2 man6 ni1 go3 zi6 dim2 duk6 aa3',
        resultGloss: { en: 'How do you pronounce this character?', zh: '請問呢個字點讀？' },
        explain: {
          en: '請問 + target + 點讀 — the Unit 0 politeness pattern.',
          zh: '請問＋對象＋點讀——Unit 0 禮貌句式。',
        },
      },
    ],
  },
  {
    id: 'life0-daily',
    campaign: 'life0',
    realm: 'bamboo',
    ocBase: OC_UNIT0_BASE,
    ocLesson: '3-daily-expressions',
    chapter: 2,
    title: { en: 'Daily expressions', zh: '日常用語' },
    blurb: {
      en: 'Hello, bye, thanks, sorry — with the right politeness register.',
      zh: '打招呼、拜拜、多謝、對唔住——揀啱禮貌層級。',
    },
    tags: ['listen', 'greetings'],
    hue: 'harbor',
    steps: [
      {
        kind: 'teach',
        id: 'd-hello',
        title: { en: 'Hello, with register', zh: '打招呼，分場合' },
        body: {
          en: '哈佬 is casual; 你好 is more formal; 喂 on the phone is tone 2 — as a shout to friends it is tone 3. Always tap Speak.',
          zh: '「哈佬」隨意；「你好」正式啲；電話「喂」係2聲——叫朋友就3聲。記得撳講。',
        },
        spotlight: '喂² / 喂³',
        spotlightHint: { en: 'Same syllable, different job', zh: '同一音節，唔同用途' },
        hear: [
          { han: '哈佬', label: 'haa1 lou2' },
          { han: '你好', label: 'nei5 hou2' },
          { han: '喂？', label: 'wai2' },
          { han: '喂', label: 'wai3' },
        ],
      },
      {
        kind: 'pick',
        id: 'd-phone',
        prompt: { en: 'Picking up the phone — which 喂?', zh: '接電話——邊個「喂」？' },
        hear: [
          { han: '喂？', label: 'wai2' },
          { han: '喂', label: 'wai3' },
        ],
        choices: [
          { id: 'wai2', label: '喂？ wai2', sub: 'Phone hello' },
          { id: 'wai3', label: '喂 wai3', sub: 'Hey (friends)' },
          { id: 'nei', label: '你好', sub: 'Formal hello' },
        ],
        correctId: 'wai2',
        explain: {
          en: 'Tone is the lesson — same syllable, different job.',
          zh: '聲調就係重點——同一音節，唔同用途。',
        },
      },
      {
        kind: 'pick',
        id: 'd-thanks',
        tip: {
          en: '唔該 for service/help; 多謝 for gifts or praise.',
          zh: '唔該＝服務／幫忙；多謝＝禮物／讚美。',
        },
        prompt: {
          en: 'Taxi driver drops you off — which thank-you?',
          zh: '的士司機送你到——用邊句多謝？',
        },
        hear: [
          { han: '唔該', label: 'm4 goi1' },
          { han: '多謝', label: 'do1 ze6' },
        ],
        choices: [
          { id: 'mgoi', label: '唔該', sub: 'Service / help' },
          { id: 'doze', label: '多謝', sub: 'Gift / praise' },
          { id: 'deoi', label: '對唔住', sub: 'Sorry' },
        ],
        correctId: 'mgoi',
        explain: {
          en: '唔該 for service; save 多謝 for presents and compliments.',
          zh: '服務用唔該；禮物同讚美先用多謝。',
        },
      },
      {
        kind: 'pick',
        id: 'd-later',
        prompt: {
          en: '一陣見 means “see you later” only if…?',
          zh: '「一陣見」淨係喺邊種情況用？',
        },
        hear: [{ han: '一陣見', label: 'jat1 zan6 gin3' }],
        choices: [
          { id: 'same', label: 'You’ll meet again today', sub: 'Same-day meetup' },
          { id: 'year', label: 'Maybe next year', sub: 'Vague future' },
          { id: 'never', label: 'Never meeting again', sub: 'Final goodbye' },
        ],
        correctId: 'same',
        explain: {
          en: 'Unlike English “see you later,” Cantonese 一陣見 expects a same-day meet.',
          zh: '同英文 see you later 唔同——粵語「一陣見」預期今日會再見。',
        },
      },
      {
        kind: 'build',
        id: 'd-bye',
        prompt: { en: 'Build a polite exit: leave first + bye.', zh: '砌禮貌離開：走先＋再見。' },
        hear: [{ han: '走先喇，再見。', label: 'zau2 sin1 laa3, zoi3 gin3' }],
        slots: [
          { key: 'leave', label: 'Leave', options: ['走先喇', '早晨', '喂'] },
          { key: 'bye', label: 'Bye', options: ['再見', '多謝', '對唔住'] },
        ],
        correct: { leave: '走先喇', bye: '再見' },
        resultJp: 'zau2 sin1 laa3, zoi3 gin3',
        resultGloss: { en: 'I’ve got to go — goodbye.', zh: '走先喇，再見。' },
        explain: {
          en: '走先 marks leaving the gathering; pair it with a goodbye.',
          zh: '「走先」表示離開聚會；再配句再見。',
        },
      },
    ],
  },
  {
    id: 'life0-numbers',
    campaign: 'life0',
    realm: 'bamboo',
    ocBase: OC_UNIT0_BASE,
    ocLesson: '4-numbers-i-0-10-ordinal-numbers',
    chapter: 3,
    title: { en: 'Numbers 0–10', zh: '數字 0–10' },
    blurb: {
      en: 'Cardinals, 第-ordinals, and lucky/unlucky number lore.',
      zh: '基數、第字序數，同埋諧音吉凶。',
    },
    tags: ['listen', 'numbers'],
    hue: 'ink',
    steps: [
      {
        kind: 'teach',
        id: 'n-card',
        title: { en: 'Count aloud', zh: '出聲數' },
        body: {
          en: 'Every digit has a play button in Unit 0 — listen and repeat 零 to 十.',
          zh: 'Unit 0 每個數字都有播放——由零聽到十，跟住讀。',
        },
        spotlight: '0…10',
        spotlightHint: { en: 'Tap Speak on each', zh: '每個都撳講' },
        hear: [
          { han: '零', label: 'ling4' },
          { han: '一', label: 'jat1' },
          { han: '二', label: 'ji6' },
          { han: '三', label: 'saam1' },
          { han: '四', label: 'sei3' },
          { han: '五', label: 'ng5' },
          { han: '六', label: 'luk6' },
          { han: '七', label: 'cat1' },
          { han: '八', label: 'baat3' },
          { han: '九', label: 'gau2' },
          { han: '十', label: 'sap6' },
        ],
      },
      {
        kind: 'pick',
        id: 'n-eight',
        prompt: {
          en: 'Which number sounds lucky like 發 “prosper”?',
          zh: '邊個數字諧音好彩似「發」？',
        },
        hear: [
          { han: '八', label: 'baat3' },
          { han: '四', label: 'sei3' },
        ],
        choices: [
          { id: '8', label: '八 baat3', sub: '~ 發 faat3' },
          { id: '4', label: '四 sei3', sub: '~ 死 sei2' },
          { id: '2', label: '二 ji6', sub: 'Neutral' },
        ],
        correctId: '8',
        explain: {
          en: '八 ~ 發 (prosper); 四 ~ 死 (death) — culture note from Unit 0.',
          zh: '八～發；四～死——Unit 0 文化筆記。',
        },
      },
      {
        kind: 'pick',
        id: 'n-ordinal',
        tip: {
          en: 'Observe: ordinals add 第 before the cardinal.',
          zh: '觀察：序數喺基數前加「第」。',
        },
        prompt: { en: 'How do you say “third”?', zh: '「第三」點講？' },
        hear: [
          { han: '第三', label: 'dai6 saam1' },
          { han: '三', label: 'saam1' },
        ],
        choices: [
          { id: 'ord', label: '第三 dai6 saam1', sub: '第 + cardinal' },
          { id: 'card', label: '三 saam1', sub: 'Cardinal only' },
          { id: 'rev', label: '三第 saam1 dai6', sub: 'Reversed' },
        ],
        correctId: 'ord',
        explain: {
          en: '第 + number — the Unit 0 observation pattern.',
          zh: '第＋數字——Unit 0 觀察規律。',
        },
      },
      {
        kind: 'build',
        id: 'n-build-ord',
        prompt: { en: 'Build “fifth”.', zh: '砌「第五」。' },
        hear: [{ han: '第五', label: 'dai6 ng5' }],
        slots: [
          { key: 'prefix', label: 'Prefix', options: ['第', '唔', '再'] },
          { key: 'num', label: 'Number', options: ['五', '八', '十'] },
        ],
        correct: { prefix: '第', num: '五' },
        resultJp: 'dai6 ng5',
        resultGloss: { en: 'Fifth', zh: '第五' },
        explain: { en: '第五 — ordinal template locked in.', zh: '第五——序數句式記住。' },
      },
      {
        kind: 'pick',
        id: 'n-four',
        prompt: {
          en: 'Why do some buildings skip a “4th floor” label?',
          zh: '點解有啲大廈跳過「4樓」標示？',
        },
        hear: [{ han: '四', label: 'sei3' }],
        choices: [
          { id: 'death', label: 'Sounds like 死 “death”', sub: 'sei3 ~ sei2' },
          { id: 'hard', label: 'Hard to write', sub: 'Stroke count' },
          { id: 'even', label: 'Even numbers banned', sub: 'All evens' },
        ],
        correctId: 'death',
        explain: {
          en: 'Homophone culture — numbers carry feeling in Cantonese communities.',
          zh: '諧音文化——數字喺粵語社群有感覺。',
        },
      },
    ],
  },
  {
    id: 'life0-intro',
    campaign: 'life0',
    realm: 'bamboo',
    ocBase: OC_UNIT0_BASE,
    ocLesson: '6-introduction-to-cantonese',
    chapter: 4,
    title: { en: 'Cantonese word order', zh: '粵語詞序' },
    blurb: {
      en: 'Unit 0 closer — SVO order and why listen-first still matters.',
      zh: 'Unit 0 收束——主謂賓詞序，同點解仍然要先聽。',
    },
    tags: ['listen', 'order'],
    hue: 'jade',
    steps: [
      {
        kind: 'teach',
        id: 'i-svo',
        title: { en: 'Subject · verb · object', zh: '主 · 謂 · 賓' },
        body: {
          en: 'Like English, Cantonese is often SVO: 我飲茶. Keep listening while you read — Unit 0 ends by tying sound to structure.',
          zh: '好似英文，粵語成日係主謂賓：我飲茶。邊睇邊聽——Unit 0 用結構收結聲音。',
        },
        spotlight: '我 + 飲 + 茶',
        spotlightHint: { en: 'S · V · O', zh: '主 · 謂 · 賓' },
        hear: [{ han: '我飲茶。', label: 'ngo5 jam2 caa4' }],
      },
      {
        kind: 'pick',
        id: 'i-order',
        prompt: { en: 'Best order for “I drink tea”?', zh: '「我飲茶」最好詞序？' },
        hear: [{ han: '我飲茶。', label: 'ngo5 jam2 caa4' }],
        choices: [
          { id: 'svo', label: '我 飲 茶', sub: 'S V O' },
          { id: 'sov', label: '我 茶 飲', sub: 'S O V' },
          { id: 'vso', label: '飲 我 茶', sub: 'V S O' },
        ],
        correctId: 'svo',
        explain: { en: 'SVO keeps the ferry chart readable.', zh: '主謂賓令航圖好讀。' },
      },
      {
        kind: 'pick',
        id: 'i-listen',
        prompt: {
          en: 'Unit 0’s habit you should keep on every pier?',
          zh: 'Unit 0 每個碼頭都要留低嘅習慣？',
        },
        hear: [{ han: '跟住我讀。', label: 'gan1 zyu6 ngo5 duk6' }],
        choices: [
          { id: 'ear', label: 'Listen (and repeat) first', sub: 'Audio before rush' },
          { id: 'skip', label: 'Skip audio entirely', sub: 'Eyes only' },
          { id: 'shout', label: 'Shout without a model', sub: 'No hear clip' },
        ],
        correctId: 'ear',
        explain: {
          en: 'Play buttons everywhere in Unit 0 — Harbor Quest mirrors that with Speak on every clip.',
          zh: 'Unit 0 處處播放掣——Harbor Quest 用「講」掣對應。',
        },
      },
      {
        kind: 'build',
        id: 'i-build',
        prompt: { en: 'Build “We speak Cantonese.”', zh: '砌「我哋講廣東話。」' },
        hear: [{ han: '我哋講廣東話。', label: 'ngo5 dei2 gong2 gwong2 dung1 waa2' }],
        slots: [
          { key: 'who', label: 'Who', options: ['我哋', '茶', '第'] },
          { key: 'do', label: 'Verb', options: ['講', '聽', '填'] },
          { key: 'what', label: 'What', options: ['廣東話', '第二頁', '巴士'] },
        ],
        correct: { who: '我哋', do: '講', what: '廣東話' },
        resultJp: 'ngo5 dei2 gong2 gwong2 dung1 waa2',
        resultGloss: { en: 'We speak Cantonese.', zh: '我哋講廣東話。' },
        explain: {
          en: 'Campaign 2 clear — ears warm, chart open for more Life units later.',
          zh: '第二航線過關——耳仔熱身，之後可以再開更多 Life 單元。',
        },
      },
    ],
  },
]
