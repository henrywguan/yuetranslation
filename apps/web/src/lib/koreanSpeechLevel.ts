/**
 * Detect Korean hearer-honorific speech level from sentence endings.
 * Labels are learner-facing; detection is heuristic (endings only).
 */

export type KoreanSpeechLevel = 'hamnida' | 'haeyo' | 'hae' | 'hara'

export const KOREAN_HONESTY_NOTE =
  'Spoken Korean links and assimilates finals (batchim); Hangul keeps the spelling. Seoul speech often merges 에 ≈ 애.'

const LEVEL_LABEL: Record<KoreanSpeechLevel, string> = {
  hamnida: '합니다',
  haeyo: '해요',
  hae: '해',
  hara: '하라',
}

const LEVEL_CHIP: Record<KoreanSpeechLevel, string> = {
  hamnida: '합니다',
  haeyo: '해요',
  hae: '해',
  hara: '하라',
}

/** Formal polite (합니다체). */
const HAMNIDA =
  /(습니다|습니까|십니다|십니까|합니다|합니까|입니다|입니까|하십시오|합시다)([.!?…」』】)]*)\s*$/u

/** Informal polite (해요체) — default colloquial target. */
const HAEYO =
  /(세요|셔요|셔요|예요|이에요|에요|해요|와요|가요|줘요|네요|군요|죠|아요|어요|여요|예요)([.!?…」』】)]*)\s*$/u

/** Plain / intimate (해체). */
const HAE =
  /(야|이야|자|네|군|다|어|아|지|래|게)([.!?…」』】)]*)\s*$/u

/** Imperative / plain command band (하라체 cue). */
const HARA = /(아라|어라|여라|으라|하라|거라|너라)([.!?…」』】)]*)\s*$/u

export function koreanSpeechLevelLabel(level: KoreanSpeechLevel): string {
  return LEVEL_LABEL[level]
}

export function koreanSpeechLevelChip(level: KoreanSpeechLevel): string {
  return LEVEL_CHIP[level]
}

/** Best-effort ending detection; null when the line has no clear sentence ending. */
export function detectKoreanSpeechLevel(text: string): KoreanSpeechLevel | null {
  const t = text.trim()
  if (!t || !/[\uAC00-\uD7A3]/.test(t)) return null
  // Prefer the most specific / polite formal cues first.
  if (HAMNIDA.test(t)) return 'hamnida'
  if (HARA.test(t)) return 'hara'
  if (HAEYO.test(t)) return 'haeyo'
  if (HAE.test(t)) return 'hae'
  return null
}
