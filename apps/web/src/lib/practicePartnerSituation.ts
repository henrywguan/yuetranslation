/**
 * Situations the learner picks. They sit beside the path and do not score it.
 */

export const PRACTICE_PARTNER_SITUATIONS = [
  {
    id: 'cafe',
    placeEn: 'Cha chaan teng',
    placeZh: '茶餐廳',
    blurb: 'Order, taste, and the bill.',
  },
  {
    id: 'mtr',
    placeEn: 'MTR',
    placeZh: '地鐵',
    blurb: 'Which way, which stop, a seat.',
  },
  {
    id: 'favor',
    placeEn: 'A favor',
    placeZh: '幫下手',
    blurb: 'Ask someone to help.',
  },
  {
    id: 'disagree',
    placeEn: 'Disagreeing',
    placeZh: '唔同意',
    blurb: 'Push back, and stay polite.',
  },
] as const

export type PracticePartnerSituationId = (typeof PRACTICE_PARTNER_SITUATIONS)[number]['id']

export function practicePartnerSituation(id: string | null | undefined) {
  return PRACTICE_PARTNER_SITUATIONS.find((row) => row.id === id) ?? null
}
