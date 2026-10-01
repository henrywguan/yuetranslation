/**
 * Situations the learner picks. They sit beside the path and do not score it.
 * Ids match `PRACTICE_PARTNER_SITUATION_META` in apps/api/src/practicePartnerAi.ts.
 * Difficulty stays the existing level (New Learner / ABC / Mainlander).
 */

export const PRACTICE_PARTNER_SITUATION_GROUPS = [
  { id: 'food', labelEn: 'Food', labelZh: '食' },
  { id: 'around', labelEn: 'Getting around', labelZh: '出行' },
  { id: 'shopping', labelEn: 'Shopping', labelZh: '買嘢' },
  { id: 'people', labelEn: 'People', labelZh: '人相處' },
  { id: 'city', labelEn: 'The city', labelZh: '城市' },
] as const

export type PracticePartnerSituationGroupId =
  (typeof PRACTICE_PARTNER_SITUATION_GROUPS)[number]['id']

export const PRACTICE_PARTNER_SITUATIONS = [
  {
    id: 'cafe',
    group: 'food',
    placeEn: 'Cha chaan teng',
    placeZh: '茶餐廳',
    blurb: 'Order, taste, and the bill.',
  },
  {
    id: 'dimsum',
    group: 'food',
    placeEn: 'Dim sum',
    placeZh: '飲茶',
    blurb: 'Tea, the carts, and the table.',
  },
  {
    id: 'coffee',
    group: 'food',
    placeEn: 'Coffee shop',
    placeZh: '咖啡店',
    blurb: 'A drink, a seat, and a short chat.',
  },
  {
    id: 'mtr',
    group: 'around',
    placeEn: 'MTR',
    placeZh: '地鐵',
    blurb: 'Which way, which stop, a seat.',
  },
  {
    id: 'taxi',
    group: 'around',
    placeEn: 'Red taxi',
    placeZh: '的士',
    blurb: 'Where to, the tunnel, and the fare.',
  },
  {
    id: 'directions',
    group: 'around',
    placeEn: 'Directions',
    placeZh: '問路',
    blurb: 'On the street. Which way from here.',
  },
  {
    id: 'grocery',
    group: 'shopping',
    placeEn: 'Grocery',
    placeZh: '超市',
    blurb: 'Find it, ask, and pay.',
  },
  {
    id: 'market',
    group: 'shopping',
    placeEn: 'Wet market',
    placeZh: '街市',
    blurb: 'Fish, greens, and a price.',
  },
  {
    id: 'negotiate',
    group: 'shopping',
    placeEn: 'The price',
    placeZh: '講價',
    blurb: 'Ask, push a little, stay polite.',
  },
  {
    id: 'intro',
    group: 'people',
    placeEn: 'Introduce yourself',
    placeZh: '自我介紹',
    blurb: 'Your name, where you are from, a hello.',
  },
  {
    id: 'smalltalk',
    group: 'people',
    placeEn: 'Small talk',
    placeZh: '傾兩句',
    blurb: 'The day, the weather, something light.',
  },
  {
    id: 'friends',
    group: 'people',
    placeEn: 'Meeting friends',
    placeZh: '見朋友',
    blurb: 'A greeting, then catching up.',
  },
  {
    id: 'plans',
    group: 'people',
    placeEn: 'Making plans',
    placeZh: '約出嚟',
    blurb: 'When, where, and what.',
  },
  {
    id: 'family',
    group: 'people',
    placeEn: 'Family dinner',
    placeZh: '家庭晚飯',
    blurb: 'The table, relatives, and the food.',
  },
  {
    id: 'favor',
    group: 'people',
    placeEn: 'A favor',
    placeZh: '幫下手',
    blurb: 'Ask someone to help.',
  },
  {
    id: 'disagree',
    group: 'people',
    placeEn: 'Disagreeing',
    placeZh: '唔同意',
    blurb: 'Push back, and stay polite.',
  },
  {
    id: 'doctor',
    group: 'city',
    placeEn: 'Doctor',
    placeZh: '睇醫生',
    blurb: 'What hurts, and what to do next.',
  },
  {
    id: 'apartment',
    group: 'city',
    placeEn: 'Apartment',
    placeZh: '睇樓',
    blurb: 'Rent, the room, and moving in.',
  },
  {
    id: 'service',
    group: 'city',
    placeEn: 'Customer service',
    placeZh: '客戶服務',
    blurb: 'A problem on the phone, and a fix.',
  },
  {
    id: 'workplace',
    group: 'city',
    placeEn: 'At work',
    placeZh: '返工',
    blurb: 'A question, a hand, a status.',
  },
  {
    id: 'interview',
    group: 'city',
    placeEn: 'Job interview',
    placeZh: '面試',
    blurb: 'Who you are, and why this job.',
  },
  {
    id: 'occasion',
    group: 'city',
    placeEn: 'A Hong Kong occasion',
    placeZh: '香港節日',
    blurb: 'Lunar New Year, a greeting, a gathering.',
  },
] as const

export type PracticePartnerSituationId = (typeof PRACTICE_PARTNER_SITUATIONS)[number]['id']

export const PRACTICE_PARTNER_PERSONALITIES = [
  { id: 'friendly', labelEn: 'Friendly', labelZh: '親切' },
  { id: 'formal', labelEn: 'Formal', labelZh: '正式' },
  { id: 'busy', labelEn: 'Busy', labelZh: '趕時間' },
  { id: 'elder', labelEn: 'Elder', labelZh: '長輩' },
  { id: 'counter', labelEn: 'At the counter', labelZh: '店員' },
] as const

export type PracticePartnerPersonalityId = (typeof PRACTICE_PARTNER_PERSONALITIES)[number]['id']

export const PRACTICE_PARTNER_GOALS = [
  { id: 'task', labelEn: 'Finish the task', labelZh: '搞掂' },
  { id: 'casual', labelEn: 'Just talk', labelZh: '傾偈' },
  { id: 'fluency', labelEn: 'Get fluent', labelZh: '講得順' },
  { id: 'slang', labelEn: 'Local color', labelZh: '口語' },
] as const

export type PracticePartnerGoalId = (typeof PRACTICE_PARTNER_GOALS)[number]['id']

export function practicePartnerSituation(id: string | null | undefined) {
  return PRACTICE_PARTNER_SITUATIONS.find((row) => row.id === id) ?? null
}

export function practicePartnerPersonality(id: string | null | undefined) {
  return PRACTICE_PARTNER_PERSONALITIES.find((row) => row.id === id) ?? null
}

export function practicePartnerGoal(id: string | null | undefined) {
  return PRACTICE_PARTNER_GOALS.find((row) => row.id === id) ?? null
}

export function situationsInGroup(group: PracticePartnerSituationGroupId) {
  return PRACTICE_PARTNER_SITUATIONS.filter((row) => row.group === group)
}
