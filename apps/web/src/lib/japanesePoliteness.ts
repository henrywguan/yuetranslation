/**
 * Detect Japanese speech level / politeness from sentence endings.
 * Labels are learner-facing; detection is heuristic (endings only).
 */

export type JapanesePoliteness = 'desu-masu' | 'plain' | 'keigo'

export const JAPANESE_HONESTY_NOTE =
  'Compact lines stay natural Japanese (kanji + kana). Pitch accent is not shown. です・ます is polite; plain (dictionary / だ / た) is casual. Formal keigo (尊敬・謙譲) is rarer in everyday talk.'

const LEVEL_LABEL: Record<JapanesePoliteness, string> = {
  'desu-masu': 'です・ます (polite)',
  plain: '普通形 (plain / casual)',
  keigo: '敬語 (honorific / humble)',
}

const LEVEL_CHIP: Record<JapanesePoliteness, string> = {
  'desu-masu': 'です・ます',
  plain: '普通形',
  keigo: '敬語',
}

/** Honorific / humble cues (敬語). Avoid bare ございます — it suffixes everyday ありがとうございます. */
const KEIGO =
  /(いたします|いただきます|致します|でございます|いらっしゃいます|おっしゃいます|なさいます|くださいます|おります|申し上げます|拝見します|伺います|参ります)([。．.!?…」』）)]*)\s*$/u

/** Polite です・ます. */
const DESU_MASU =
  /(です|でした|でしょう|ます|ました|ません|ましょう|ませんでした)([。．.!?…」』）)]*)\s*$/u

/** Plain / casual endings (incl. dictionary-form verbs). */
const PLAIN =
  /(だ|だった|じゃない|ではない|である|た|ない|ぬ|ろ|よ|ね|な|か|ぞ|ぜ|さ|わ|っす|[うくぐすつぬぶむる])([。．.!?…」』）)]*)\s*$/u

export function japanesePolitenessLabel(level: JapanesePoliteness): string {
  return LEVEL_LABEL[level]
}

export function japanesePolitenessChip(level: JapanesePoliteness): string {
  return LEVEL_CHIP[level]
}

/** Best-effort ending detection; null when the line has no clear sentence ending. */
export function detectJapanesePoliteness(text: string): JapanesePoliteness | null {
  const t = text.trim()
  if (!t || !/[\u3040-\u30FF\u3400-\u9FFF]/.test(t)) return null
  if (KEIGO.test(t)) return 'keigo'
  if (DESU_MASU.test(t)) return 'desu-masu'
  if (PLAIN.test(t)) return 'plain'
  // Short polite stems without です (お願いします, ありがとう) — treat as polite band when ます-family mid-phrase.
  if (/ます([。．.!?…」』）)]*)\s*$/u.test(t) || /お願い/.test(t)) return 'desu-masu'
  return null
}
