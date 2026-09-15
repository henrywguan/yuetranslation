/** Offline themed bank for Harbor Quest · Match the Definition arena. */

export type MatchDifficulty = 'easy' | 'medium' | 'hard'
export type MatchTopic = 'kids' | 'animals' | 'nature' | 'food' | 'harbor'

export type MatchWord = {
  id: string
  han: string
  /** Space-separated Jyutping syllables with tone digits (e.g. `nei5 hou2`). */
  jp: string
  /** English gloss shown as a choice. */
  def: string
  topic: MatchTopic
  difficulty: MatchDifficulty
}

export type MatchTopicConfig = {
  id: MatchTopic
  label: { en: string; zh: string }
  blurb: { en: string; zh: string }
}

export type MatchDifficultyConfig = {
  id: MatchDifficulty
  label: { en: string; zh: string }
  blurb: { en: string; zh: string }
  /** Seconds on the clock per round. */
  seconds: number
  /** Arena gold awarded per correct hit. */
  goldPerHit: number
}

/** Topic → then difficulty scales words → phrases → sentences inside that theme. */
export const MATCH_TOPIC: Record<MatchTopic, MatchTopicConfig> = {
  kids: {
    id: 'kids',
    label: { en: 'Kids', zh: '小朋友' },
    blurb: { en: 'Family, school & play', zh: '家庭、學校同玩耍' },
  },
  animals: {
    id: 'animals',
    label: { en: 'Animals', zh: '動物' },
    blurb: { en: 'Pets, farm & wildlife', zh: '寵物、農場同野生' },
  },
  nature: {
    id: 'nature',
    label: { en: 'Nature', zh: '自然' },
    blurb: { en: 'Weather, plants & sky', zh: '天氣、植物同天空' },
  },
  food: {
    id: 'food',
    label: { en: 'Food', zh: '飲食' },
    blurb: { en: 'Meals, tea & taste', zh: '食飯、飲茶同味道' },
  },
  harbor: {
    id: 'harbor',
    label: { en: 'Harbor', zh: '港灣' },
    blurb: { en: 'Boats, pier & voyage', zh: '船、碼頭同航程' },
  },
}

export const MATCH_TOPICS: MatchTopic[] = ['kids', 'animals', 'nature', 'food', 'harbor']

/** Easy = simple words · Medium = phrases · Hard = full sentences. */
export const MATCH_DIFFICULTY: Record<MatchDifficulty, MatchDifficultyConfig> = {
  easy: {
    id: 'easy',
    label: { en: 'Easy', zh: '簡單' },
    blurb: { en: 'Simple words', zh: '簡單詞語' },
    seconds: 15,
    goldPerHit: 10,
  },
  medium: {
    id: 'medium',
    label: { en: 'Medium', zh: '中等' },
    blurb: { en: 'Short phrases', zh: '短語' },
    seconds: 22,
    goldPerHit: 18,
  },
  hard: {
    id: 'hard',
    label: { en: 'Hard', zh: '困難' },
    blurb: { en: 'Full sentences', zh: '完整句子' },
    seconds: 30,
    goldPerHit: 30,
  },
}

export const MATCH_DIFFICULTIES: MatchDifficulty[] = ['easy', 'medium', 'hard']

/**
 * Themed starter set — Open Cantonese + Harbor Quest flavour.
 * Definitions are short learner glosses (not full dictionary senses).
 */
export const MATCH_DEFINITION_BANK: MatchWord[] = [
  // ════════ Kids ════════
  { id: 'k-e-baa1', han: '爸', jp: 'baa1', def: 'dad / father', topic: 'kids', difficulty: 'easy' },
  { id: 'k-e-maa1', han: '媽', jp: 'maa1', def: 'mom / mother', topic: 'kids', difficulty: 'easy' },
  { id: 'k-e-go1', han: '哥', jp: 'go1', def: 'older brother', topic: 'kids', difficulty: 'easy' },
  { id: 'k-e-ze2', han: '姐', jp: 'ze2', def: 'older sister', topic: 'kids', difficulty: 'easy' },
  { id: 'k-e-dai6', han: '弟', jp: 'dai6', def: 'younger brother', topic: 'kids', difficulty: 'easy' },
  { id: 'k-e-mui6', han: '妹', jp: 'mui6', def: 'younger sister', topic: 'kids', difficulty: 'easy' },
  { id: 'k-e-zai2', han: '仔', jp: 'zai2', def: 'kid / boy', topic: 'kids', difficulty: 'easy' },
  { id: 'k-e-syu1', han: '書', jp: 'syu1', def: 'book', topic: 'kids', difficulty: 'easy' },
  { id: 'k-e-bat1', han: '筆', jp: 'bat1', def: 'pen / pencil', topic: 'kids', difficulty: 'easy' },
  { id: 'k-e-sau2', han: '手', jp: 'sau2', def: 'hand', topic: 'kids', difficulty: 'easy' },

  { id: 'k-m-nei5hou2', han: '你好', jp: 'nei5 hou2', def: 'hello (polite)', topic: 'kids', difficulty: 'medium' },
  { id: 'k-m-zou2san4', han: '早晨', jp: 'zou2 san4', def: 'good morning', topic: 'kids', difficulty: 'medium' },
  { id: 'k-m-zoi3gin3', han: '再見', jp: 'zoi3 gin3', def: 'goodbye', topic: 'kids', difficulty: 'medium' },
  { id: 'k-m-do1ze6', han: '多謝', jp: 'do1 ze6', def: 'thank you', topic: 'kids', difficulty: 'medium' },
  { id: 'k-m-m4hou2', han: '唔好意思', jp: 'm4 hou2 ji3 si1', def: 'sorry / excuse me', topic: 'kids', difficulty: 'medium' },
  { id: 'k-m-pang4jau5', han: '朋友', jp: 'pang4 jau5', def: 'friend', topic: 'kids', difficulty: 'medium' },
  { id: 'k-m-duk6syu1', han: '讀書', jp: 'duk6 syu1', def: 'to study / read', topic: 'kids', difficulty: 'medium' },
  { id: 'k-m-wan2heoi3', han: '玩遊戲', jp: 'waan2 jau4 hei3', def: 'to play a game', topic: 'kids', difficulty: 'medium' },
  { id: 'k-m-gan1zyu6', han: '跟住我讀', jp: 'gan1 zyu6 ngo5 duk6', def: 'repeat after me', topic: 'kids', difficulty: 'medium' },
  { id: 'k-m-ngaam1laa3', han: '啱喇', jp: 'ngaam1 laa3', def: 'correct / that’s it', topic: 'kids', difficulty: 'medium' },

  {
    id: 'k-h-cing2man6',
    han: '請問呢個字點讀呀？',
    jp: 'cing2 man6 ni1 go3 zi6 dim2 duk6 aa3',
    def: 'Excuse me, how do you read this character?',
    topic: 'kids',
    difficulty: 'hard',
  },
  {
    id: 'k-h-ngaam1hou2',
    han: '啱喇，非常好！',
    jp: 'ngaam1 laa3, fei1 soeng4 hou2',
    def: 'That’s right — very good!',
    topic: 'kids',
    difficulty: 'hard',
  },
  {
    id: 'k-h-m4ngaam1',
    han: '唔啱呀，再試吓吖。',
    jp: 'm4 ngaam1 aa3, zoi3 si3 haa5 aa1',
    def: 'Not quite — try again.',
    topic: 'kids',
    difficulty: 'hard',
  },
  {
    id: 'k-h-zau2sin1',
    han: '走先喇，再見。',
    jp: 'zau2 sin1 laa3, zoi3 gin3',
    def: 'I’ve got to go — goodbye.',
    topic: 'kids',
    difficulty: 'hard',
  },
  {
    id: 'k-h-ming4',
    han: '我唔明，可唔可以講多次？',
    jp: 'ngo5 m4 ming4, ho2 m4 ho2 ji5 gong2 do1 ci3',
    def: 'I don’t understand — can you say it again?',
    topic: 'kids',
    difficulty: 'hard',
  },
  {
    id: 'k-h-duk6syu1',
    han: '今日我哋一齊讀書啦。',
    jp: 'gam1 jat6 ngo5 dei6 jat1 cai4 duk6 syu1 laa1',
    def: 'Let’s study together today.',
    topic: 'kids',
    difficulty: 'hard',
  },
  {
    id: 'k-h-pang4jau5',
    han: '呢個係我最好嘅朋友。',
    jp: 'ni1 go3 hai6 ngo5 zeoi3 hou2 ge3 pang4 jau5',
    def: 'This is my best friend.',
    topic: 'kids',
    difficulty: 'hard',
  },
  {
    id: 'k-h-waan2',
    han: '放學之後一齊出去玩呀？',
    jp: 'fong3 hok6 zi1 hau6 jat1 cai4 ceot1 heoi3 waan2 aa3',
    def: 'Want to go play together after school?',
    topic: 'kids',
    difficulty: 'hard',
  },

  // ════════ Animals ════════
  { id: 'a-e-gau2', han: '狗', jp: 'gau2', def: 'dog', topic: 'animals', difficulty: 'easy' },
  { id: 'a-e-maau1', han: '貓', jp: 'maau1', def: 'cat', topic: 'animals', difficulty: 'easy' },
  { id: 'a-e-jyu2', han: '魚', jp: 'jyu2', def: 'fish', topic: 'animals', difficulty: 'easy' },
  { id: 'a-e-niu5', han: '鳥', jp: 'niu5', def: 'bird', topic: 'animals', difficulty: 'easy' },
  { id: 'a-e-zyu1', han: '豬', jp: 'zyu1', def: 'pig', topic: 'animals', difficulty: 'easy' },
  { id: 'a-e-ngau4', han: '牛', jp: 'ngau4', def: 'cow / ox', topic: 'animals', difficulty: 'easy' },
  { id: 'a-e-maa5', han: '馬', jp: 'maa5', def: 'horse', topic: 'animals', difficulty: 'easy' },
  { id: 'a-e-loeng4', han: '龍', jp: 'lung4', def: 'dragon', topic: 'animals', difficulty: 'easy' },
  { id: 'a-e-tou3', han: '兔', jp: 'tou3', def: 'rabbit', topic: 'animals', difficulty: 'easy' },
  { id: 'a-e-fung1', han: '蜂', jp: 'fung1', def: 'bee', topic: 'animals', difficulty: 'easy' },

  { id: 'a-m-siu2gau2', han: '小狗', jp: 'siu2 gau2', def: 'puppy / little dog', topic: 'animals', difficulty: 'medium' },
  { id: 'a-m-siu2maau1', han: '小貓', jp: 'siu2 maau1', def: 'kitten / little cat', topic: 'animals', difficulty: 'medium' },
  { id: 'a-m-fei1niu5', han: '飛鳥', jp: 'fei1 niu5', def: 'flying bird', topic: 'animals', difficulty: 'medium' },
  { id: 'a-m-daai6jyu2', han: '大魚', jp: 'daai6 jyu2', def: 'big fish', topic: 'animals', difficulty: 'medium' },
  { id: 'a-m-zung1ngau4', han: '水牛', jp: 'seoi2 ngau4', def: 'water buffalo', topic: 'animals', difficulty: 'medium' },
  { id: 'a-m-baak6tou3', han: '白兔', jp: 'baak6 tou3', def: 'white rabbit', topic: 'animals', difficulty: 'medium' },
  { id: 'a-m-hung4lung4', han: '恐龍', jp: 'hung2 lung4', def: 'dinosaur', topic: 'animals', difficulty: 'medium' },
  { id: 'a-m-wong4fung1', han: '蜜蜂', jp: 'mat6 fung1', def: 'honeybee', topic: 'animals', difficulty: 'medium' },
  { id: 'a-m-hai5', han: '蟹', jp: 'haai5', def: 'crab', topic: 'animals', difficulty: 'medium' },
  { id: 'a-m-haa1', han: '蝦', jp: 'haa1', def: 'shrimp', topic: 'animals', difficulty: 'medium' },

  {
    id: 'a-h-gau2',
    han: '呢隻狗好得意呀！',
    jp: 'ni1 zek3 gau2 hou2 dak1 ji3 aa3',
    def: 'This dog is so cute!',
    topic: 'animals',
    difficulty: 'hard',
  },
  {
    id: 'a-h-maau1',
    han: '小貓鍾意瞓喺梳化上面。',
    jp: 'siu2 maau1 zung1 ji3 fan3 hai2 so1 faa2 soeng6 min6',
    def: 'The kitten likes sleeping on the sofa.',
    topic: 'animals',
    difficulty: 'hard',
  },
  {
    id: 'a-h-jyu2',
    han: '河裏面有好多魚。',
    jp: 'ho4 leoi5 min6 jau5 hou2 do1 jyu2',
    def: 'There are lots of fish in the river.',
    topic: 'animals',
    difficulty: 'hard',
  },
  {
    id: 'a-h-niu5',
    han: '睇吓樹上嗰隻鳥。',
    jp: 'tai2 haa5 syu6 soeng6 go2 zek3 niu5',
    def: 'Look at that bird in the tree.',
    topic: 'animals',
    difficulty: 'hard',
  },
  {
    id: 'a-h-lung4',
    han: '傳說裏面有一條金龍。',
    jp: 'cyun4 syut3 leoi5 min6 jau5 jat1 tiu4 gam1 lung4',
    def: 'In the legend there is a golden dragon.',
    topic: 'animals',
    difficulty: 'hard',
  },
  {
    id: 'a-h-tou3',
    han: '白兔跳得好快。',
    jp: 'baak6 tou3 tiu3 dak1 hou2 faai3',
    def: 'The white rabbit hops very fast.',
    topic: 'animals',
    difficulty: 'hard',
  },
  {
    id: 'a-h-haai5',
    han: '沙灘上面有一隻蟹。',
    jp: 'saa1 taan1 soeng6 min6 jau5 jat1 zek3 haai5',
    def: 'There is a crab on the beach.',
    topic: 'animals',
    difficulty: 'hard',
  },
  {
    id: 'a-h-fung1',
    han: '小心啲，蜜蜂會刺人。',
    jp: 'siu2 sam1 di1, mat6 fung1 wui5 ci3 jan4',
    def: 'Be careful — bees can sting.',
    topic: 'animals',
    difficulty: 'hard',
  },

  // ════════ Nature ════════
  { id: 'n-e-tin1', han: '天', jp: 'tin1', def: 'sky / day', topic: 'nature', difficulty: 'easy' },
  { id: 'n-e-jyu5', han: '雨', jp: 'jyu5', def: 'rain', topic: 'nature', difficulty: 'easy' },
  { id: 'n-e-fung1', han: '風', jp: 'fung1', def: 'wind', topic: 'nature', difficulty: 'easy' },
  { id: 'n-e-syu6', han: '樹', jp: 'syu6', def: 'tree', topic: 'nature', difficulty: 'easy' },
  { id: 'n-e-faa1', han: '花', jp: 'faa1', def: 'flower', topic: 'nature', difficulty: 'easy' },
  { id: 'n-e-saan1', han: '山', jp: 'saan1', def: 'mountain', topic: 'nature', difficulty: 'easy' },
  { id: 'n-e-ho4', han: '河', jp: 'ho4', def: 'river', topic: 'nature', difficulty: 'easy' },
  { id: 'n-e-hoi2', han: '海', jp: 'hoi2', def: 'sea', topic: 'nature', difficulty: 'easy' },
  { id: 'n-e-jyut6', han: '月', jp: 'jyut6', def: 'moon / month', topic: 'nature', difficulty: 'easy' },
  { id: 'n-e-sing1', han: '星', jp: 'sing1', def: 'star', topic: 'nature', difficulty: 'easy' },

  { id: 'n-m-lok6jyu5', han: '落雨', jp: 'lok6 jyu5', def: 'to rain / raining', topic: 'nature', difficulty: 'medium' },
  { id: 'n-m-cou2', han: '草地', jp: 'cou2 dei6', def: 'grass / lawn', topic: 'nature', difficulty: 'medium' },
  { id: 'n-m-baak6wan4', han: '白雲', jp: 'baak6 wan4', def: 'white cloud', topic: 'nature', difficulty: 'medium' },
  { id: 'n-m-taai3joeng4', han: '太陽', jp: 'taai3 joeng4', def: 'the sun', topic: 'nature', difficulty: 'medium' },
  { id: 'n-m-cing1tin1', han: '晴天', jp: 'cing4 tin1', def: 'sunny day', topic: 'nature', difficulty: 'medium' },
  { id: 'n-m-jung4syu6', han: '榕樹', jp: 'jung4 syu6', def: 'banyan tree', topic: 'nature', difficulty: 'medium' },
  { id: 'n-m-zuk1lam4', han: '竹林', jp: 'zuk1 lam4', def: 'bamboo grove', topic: 'nature', difficulty: 'medium' },
  { id: 'n-m-seoi2zing2', han: '水井', jp: 'seoi2 zeng2', def: 'water well', topic: 'nature', difficulty: 'medium' },
  { id: 'n-m-saa1taan1', han: '沙灘', jp: 'saa1 taan1', def: 'beach', topic: 'nature', difficulty: 'medium' },
  { id: 'n-m-jim4', han: '岩石', jp: 'ngaam4 sek6', def: 'rock / boulder', topic: 'nature', difficulty: 'medium' },

  {
    id: 'n-h-tin1hei3',
    han: '今日天氣好好。',
    jp: 'gam1 jat6 tin1 hei3 hou2 hou2',
    def: 'The weather is really nice today.',
    topic: 'nature',
    difficulty: 'hard',
  },
  {
    id: 'n-h-lok6jyu5',
    han: '聽日可能會落雨。',
    jp: 'ting1 jat6 ho2 nang4 wui5 lok6 jyu5',
    def: 'It might rain tomorrow.',
    topic: 'nature',
    difficulty: 'hard',
  },
  {
    id: 'n-h-saan1',
    han: '我哋一齊去爬山啦。',
    jp: 'ngo5 dei6 jat1 cai4 heoi3 paa4 saan1 laa1',
    def: 'Let’s go hiking together.',
    topic: 'nature',
    difficulty: 'hard',
  },
  {
    id: 'n-h-faa1',
    han: '春天開咗好多花。',
    jp: 'ceon1 tin1 hoi1 zo2 hou2 do1 faa1',
    def: 'Lots of flowers bloomed in spring.',
    topic: 'nature',
    difficulty: 'hard',
  },
  {
    id: 'n-h-ho4',
    han: '河水清澈又涼。',
    jp: 'ho4 seoi2 cing1 cit3 jau6 loeng4',
    def: 'The river water is clear and cool.',
    topic: 'nature',
    difficulty: 'hard',
  },
  {
    id: 'n-h-sing1',
    han: '夜晚望到好多星星。',
    jp: 'je6 maan5 mong6 dou2 hou2 do1 sing1 sing1',
    def: 'At night you can see lots of stars.',
    topic: 'nature',
    difficulty: 'hard',
  },
  {
    id: 'n-h-fung1',
    han: '外面風好大，小心啲。',
    jp: 'ngoi6 min6 fung1 hou2 daai6, siu2 sam1 di1',
    def: 'It’s very windy outside — be careful.',
    topic: 'nature',
    difficulty: 'hard',
  },
  {
    id: 'n-h-zuk1',
    han: '竹林裏面好清幽。',
    jp: 'zuk1 lam4 leoi5 min6 hou2 cing1 jau1',
    def: 'It’s peaceful inside the bamboo grove.',
    topic: 'nature',
    difficulty: 'hard',
  },

  // ════════ Food ════════
  { id: 'f-e-faa6', han: '飯', jp: 'faan6', def: 'rice / a meal', topic: 'food', difficulty: 'easy' },
  { id: 'f-e-min6', han: '麵', jp: 'min6', def: 'noodles', topic: 'food', difficulty: 'easy' },
  { id: 'f-e-caa4', han: '茶', jp: 'caa4', def: 'tea', topic: 'food', difficulty: 'easy' },
  { id: 'f-e-seoi2', han: '水', jp: 'seoi2', def: 'water', topic: 'food', difficulty: 'easy' },
  { id: 'f-e-tong4', han: '糖', jp: 'tong4', def: 'sugar / candy', topic: 'food', difficulty: 'easy' },
  { id: 'f-e-jim4', han: '鹽', jp: 'jim4', def: 'salt', topic: 'food', difficulty: 'easy' },
  { id: 'f-e-jyuk6', han: '肉', jp: 'juk6', def: 'meat', topic: 'food', difficulty: 'easy' },
  { id: 'f-e-coi3', han: '菜', jp: 'coi3', def: 'vegetables / dish', topic: 'food', difficulty: 'easy' },
  { id: 'f-e-gwo2', han: '果', jp: 'gwo2', def: 'fruit', topic: 'food', difficulty: 'easy' },
  { id: 'f-e-dang1', han: '蛋', jp: 'daan2', def: 'egg', topic: 'food', difficulty: 'easy' },

  { id: 'f-m-jam2caa4', han: '飲茶', jp: 'jam2 caa4', def: 'to drink tea / yum cha', topic: 'food', difficulty: 'medium' },
  { id: 'f-m-hou2sik6', han: '好食', jp: 'hou2 sik6', def: 'delicious', topic: 'food', difficulty: 'medium' },
  { id: 'f-m-sik6faan6', han: '食飯', jp: 'sik6 faan6', def: 'to eat a meal', topic: 'food', difficulty: 'medium' },
  { id: 'f-m-baa1si2', han: '叉燒', jp: 'caa1 siu1', def: 'char siu (roast pork)', topic: 'food', difficulty: 'medium' },
  { id: 'f-m-dim2sam1', han: '點心', jp: 'dim2 sam1', def: 'dim sum', topic: 'food', difficulty: 'medium' },
  { id: 'f-m-kuk1kei4', han: '曲奇餅', jp: 'kuk1 kei4 beng2', def: 'cookie', topic: 'food', difficulty: 'medium' },
  { id: 'f-m-ping4gwo2', han: '蘋果', jp: 'ping4 gwo2', def: 'apple', topic: 'food', difficulty: 'medium' },
  { id: 'f-m-hoeng1ziu1', han: '香蕉', jp: 'hoeng1 ziu1', def: 'banana', topic: 'food', difficulty: 'medium' },
  { id: 'f-m-gei2do1', han: '幾多錢？', jp: 'gei2 do1 cin2', def: 'how much does it cost?', topic: 'food', difficulty: 'medium' },
  { id: 'f-m-m4goi1', han: '唔該', jp: 'm4 goi1', def: 'thanks (for service)', topic: 'food', difficulty: 'medium' },

  {
    id: 'f-h-sik6',
    han: '我去食飯喇。',
    jp: 'ngo5 heoi3 sik6 faan6 laa3',
    def: 'I’m going to eat (a meal) now.',
    topic: 'food',
    difficulty: 'hard',
  },
  {
    id: 'f-h-jam2',
    han: '你想飲咩呀？',
    jp: 'nei5 soeng2 jam2 me1 aa3',
    def: 'What would you like to drink?',
    topic: 'food',
    difficulty: 'hard',
  },
  {
    id: 'f-h-maai4',
    han: '唔該，埋單。',
    jp: 'm4 goi1, maai4 daan1',
    def: 'Excuse me — the bill, please.',
    topic: 'food',
    difficulty: 'hard',
  },
  {
    id: 'f-h-dim2sam1',
    han: '星期日一齊去飲茶啦。',
    jp: 'sing1 kei4 jat6 jat1 cai4 heoi3 jam2 caa4 laa1',
    def: 'Let’s go for yum cha on Sunday.',
    topic: 'food',
    difficulty: 'hard',
  },
  {
    id: 'f-h-hou2sik6',
    han: '呢碟叉燒好食到不得了。',
    jp: 'ni1 dip6 caa1 siu1 hou2 sik6 dou3 bat1 dak1 liu5',
    def: 'This plate of char siu is incredibly tasty.',
    topic: 'food',
    difficulty: 'hard',
  },
  {
    id: 'f-h-teng1',
    han: '我想叫一碗雲吞麵。',
    jp: 'ngo5 soeng2 giu3 jat1 wun2 wan4 tan1 min6',
    def: 'I’d like to order a bowl of wonton noodles.',
    topic: 'food',
    difficulty: 'hard',
  },
  {
    id: 'f-h-tong4',
    han: '細路仔唔好食太多糖。',
    jp: 'sai3 lou6 zai2 m4 hou2 sik6 taai3 do1 tong4',
    def: 'Kids shouldn’t eat too much candy.',
    topic: 'food',
    difficulty: 'hard',
  },
  {
    id: 'f-h-coi3',
    han: '今日晚餐有魚同青菜。',
    jp: 'gam1 jat6 maan5 caan1 jau5 jyu2 tung4 ceng1 coi3',
    def: 'Dinner tonight has fish and greens.',
    topic: 'food',
    difficulty: 'hard',
  },

  // ════════ Harbor ════════
  { id: 'h-e-syun4', han: '船', jp: 'syun4', def: 'boat / ship', topic: 'harbor', difficulty: 'easy' },
  { id: 'h-e-seoi2', han: '水', jp: 'seoi2', def: 'water', topic: 'harbor', difficulty: 'easy' },
  { id: 'h-e-fung1', han: '風', jp: 'fung1', def: 'wind', topic: 'harbor', difficulty: 'easy' },
  { id: 'h-e-dang1', han: '燈', jp: 'dang1', def: 'lamp / light', topic: 'harbor', difficulty: 'easy' },
  { id: 'h-e-mun4', han: '門', jp: 'mun4', def: 'door / gate', topic: 'harbor', difficulty: 'easy' },
  { id: 'h-e-lou5', han: '路', jp: 'lou6', def: 'road / path', topic: 'harbor', difficulty: 'easy' },
  { id: 'h-e-gau2', han: '橋', jp: 'kiu4', def: 'bridge', topic: 'harbor', difficulty: 'easy' },
  { id: 'h-e-ngaan5', han: '岸', jp: 'ngon6', def: 'shore / bank', topic: 'harbor', difficulty: 'easy' },
  { id: 'h-e-fung1faan4', han: '帆', jp: 'faan4', def: 'sail', topic: 'harbor', difficulty: 'easy' },
  { id: 'h-e-seoi2sau2', han: '槳', jp: 'zoeng2', def: 'oar / paddle', topic: 'harbor', difficulty: 'easy' },

  { id: 'h-m-maa5tau4', han: '碼頭', jp: 'maa5 tau4', def: 'pier / jetty', topic: 'harbor', difficulty: 'medium' },
  { id: 'h-m-syun4jyun4', han: '船員', jp: 'syun4 jyun4', def: 'crew / sailor', topic: 'harbor', difficulty: 'medium' },
  { id: 'h-m-dang1taap3', han: '燈塔', jp: 'dang1 taap3', def: 'lighthouse', topic: 'harbor', difficulty: 'medium' },
  { id: 'h-m-seoi2lou6', han: '水路', jp: 'seoi2 lou6', def: 'waterway', topic: 'harbor', difficulty: 'medium' },
  { id: 'h-m-ceot1hoi2', han: '出海', jp: 'ceot1 hoi2', def: 'to set out to sea', topic: 'harbor', difficulty: 'medium' },
  { id: 'h-m-kau4jyu4', han: '靠岸', jp: 'kaau3 ngon6', def: 'to dock / come ashore', topic: 'harbor', difficulty: 'medium' },
  { id: 'h-m-baa1si2', han: '帆船', jp: 'faan4 syun4', def: 'sailboat', topic: 'harbor', difficulty: 'medium' },
  { id: 'h-m-lung4zau1', han: '龍舟', jp: 'lung4 zau1', def: 'dragon boat', topic: 'harbor', difficulty: 'medium' },
  { id: 'h-m-lei4toi4', han: '擂台', jp: 'leoi4 toi4', def: 'arena / fighting stage', topic: 'harbor', difficulty: 'medium' },
  { id: 'h-m-gam1cin2', han: '金幣', jp: 'gam1 bai6', def: 'gold coin', topic: 'harbor', difficulty: 'medium' },

  {
    id: 'h-h-syun4',
    han: '我哋坐船去對面碼頭。',
    jp: 'ngo5 dei6 co5 syun4 heoi3 deoi3 min6 maa5 tau4',
    def: 'We’re taking a boat to the pier across the way.',
    topic: 'harbor',
    difficulty: 'hard',
  },
  {
    id: 'h-h-fung1',
    han: '今日風平浪靜，適合出海。',
    jp: 'gam1 jat6 fung1 ping4 long6 zing6, sik1 hap6 ceot1 hoi2',
    def: 'The sea is calm today — good for going out.',
    topic: 'harbor',
    difficulty: 'hard',
  },
  {
    id: 'h-h-dang1',
    han: '夜晚燈塔會閃光。',
    jp: 'je6 maan5 dang1 taap3 wui5 sim2 gwong1',
    def: 'At night the lighthouse flashes.',
    topic: 'harbor',
    difficulty: 'hard',
  },
  {
    id: 'h-h-leoi4',
    han: '一齊去擂台比試啦！',
    jp: 'jat1 cai4 heoi3 leoi4 toi4 bei2 si3 laa1',
    def: 'Let’s go compete at the arena!',
    topic: 'harbor',
    difficulty: 'hard',
  },
  {
    id: 'h-h-zau1',
    han: '龍舟比賽好熱鬧。',
    jp: 'lung4 zau1 bei2 coi3 hou2 jit6 naau6',
    def: 'The dragon boat race is lively.',
    topic: 'harbor',
    difficulty: 'hard',
  },
  {
    id: 'h-h-kaau3',
    han: '船慢慢靠岸喇。',
    jp: 'syun4 maan6 maan2 kaau3 ngon6 laa3',
    def: 'The boat is slowly docking.',
    topic: 'harbor',
    difficulty: 'hard',
  },
  {
    id: 'h-h-gam1',
    han: '擂台贏咗可以換金幣。',
    jp: 'leoi4 toi4 jeng4 zo2 ho2 ji5 wun6 gam1 bai6',
    def: 'Winning in the arena earns gold you can exchange.',
    topic: 'harbor',
    difficulty: 'hard',
  },
  {
    id: 'h-h-hang4',
    han: '沿住河岸划過去。',
    jp: 'jyun4 zyu6 ho4 ngon6 waak6 gwo3 heoi3',
    def: 'Paddle along the riverbank.',
    topic: 'harbor',
    difficulty: 'hard',
  },
]

/** @deprecated Prefer MATCH_DIFFICULTY.easy — kept for older smoke imports. */
export const MATCH_ROUND_SECONDS = MATCH_DIFFICULTY.easy.seconds
/** @deprecated Prefer MATCH_DIFFICULTY.easy — kept for older smoke imports. */
export const MATCH_GOLD_PER_HIT = MATCH_DIFFICULTY.easy.goldPerHit

/** Ferry coins granted per 1 arena gold exchanged. */
export const HARBOR_GOLD_TO_COINS = 1

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

export function matchBankFor(topic: MatchTopic, difficulty: MatchDifficulty): MatchWord[] {
  return MATCH_DEFINITION_BANK.filter((w) => w.topic === topic && w.difficulty === difficulty)
}

export type MatchRound = {
  word: MatchWord
  topic: MatchTopic
  difficulty: MatchDifficulty
  /** Three definitions; exactly one matches `word.def`. */
  choices: string[]
  correctIndex: number
  seconds: number
  goldPerHit: number
}

/** Build one timed round — distractors stay in the same topic + difficulty. */
export function buildMatchRound(
  topic: MatchTopic,
  difficulty: MatchDifficulty,
  excludeId?: string,
): MatchRound {
  const cfg = MATCH_DIFFICULTY[difficulty]
  const bank = matchBankFor(topic, difficulty)
  const pool = excludeId ? bank.filter((w) => w.id !== excludeId) : bank
  const source = pool.length > 0 ? pool : bank
  const word = source[Math.floor(Math.random() * source.length)]!
  const distractors = shuffle(bank.filter((w) => w.id !== word.id).map((w) => w.def)).slice(0, 2)
  // Pad from same topic other difficulties, then whole bank.
  while (distractors.length < 2) {
    const extra =
      MATCH_DEFINITION_BANK.find(
        (w) =>
          w.topic === topic &&
          w.id !== word.id &&
          !distractors.includes(w.def) &&
          w.def !== word.def,
      ) ??
      MATCH_DEFINITION_BANK.find(
        (w) => w.id !== word.id && !distractors.includes(w.def) && w.def !== word.def,
      )
    if (!extra) break
    distractors.push(extra.def)
  }
  const choices = shuffle([word.def, ...distractors])
  return {
    word,
    topic,
    difficulty,
    choices,
    correctIndex: choices.indexOf(word.def),
    seconds: cfg.seconds,
    goldPerHit: cfg.goldPerHit,
  }
}
