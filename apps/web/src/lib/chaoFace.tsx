import { Fragment, type ReactNode } from 'react'

/** Chao tone letters (U+02E5–U+02E9) — Noto Sans HK does not cover these. */
export const CHAO_TONE_CHAR_RE = /[\u02E5-\u02E9]/g

export function textContainsChaoToneLetters(text: string): boolean {
  CHAO_TONE_CHAR_RE.lastIndex = 0
  return CHAO_TONE_CHAR_RE.test(text)
}

/** Split mixed Han/Latin/Jyutping copy so Chao runs use `.chao-face` (Noto Sans). */
export function withChaoFace(text: string): ReactNode {
  if (!textContainsChaoToneLetters(text)) return text

  CHAO_TONE_CHAR_RE.lastIndex = 0
  const parts: ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = CHAO_TONE_CHAR_RE.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    parts.push(
      <span key={key++} className="chao-face">
        {match[0]}
      </span>,
    )
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return <Fragment>{parts}</Fragment>
}
