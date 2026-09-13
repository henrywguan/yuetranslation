import { Fragment, type ReactNode } from 'react'
import { JyutpingSylText } from '../../components/JyutpingSylText'
import { withChaoFace } from '../../lib/chaoFace'
import {
  chaoContourForTone,
  enrichJyutpingWithChao,
  parseJyutpingTone,
  type JyutTone,
} from '../../lib/jyutping'

/**
 * Free-text line with Jyutping syllables showing tone digit + Chao (`si1˥`).
 * Syllables use the same `JyutpingSylText` path as hear chips so Chao always
 * paints with Noto Sans (not Syne / Noto Sans HK fallbacks).
 */
export function JyutpingChaoText({ text }: { text: string }): ReactNode {
  const parts: ReactNode[] = []
  // Bare Jyutping syllables — leave already-Chao-enriched runs alone.
  const re = /[A-Za-z]+[1-6](?![\u02E5-\u02E9])/g
  let last = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(
        <Fragment key={key++}>{withChaoFace(enrichJyutpingWithChao(text.slice(last, match.index)))}</Fragment>,
      )
    }
    const syl = match[0]
    if (parseJyutpingTone(syl)) {
      parts.push(<JyutpingSylText key={key++} jp={syl} />)
    } else {
      parts.push(<Fragment key={key++}>{withChaoFace(enrichJyutpingWithChao(syl))}</Fragment>)
    }
    last = match.index + syl.length
  }
  if (last < text.length) {
    parts.push(<Fragment key={key++}>{withChaoFace(enrichJyutpingWithChao(text.slice(last)))}</Fragment>)
  }
  if (!parts.length) return withChaoFace(enrichJyutpingWithChao(text))
  return <>{parts}</>
}

/** Space-separated Jyutping phrase (`nei5 hou2`) with Chao next to each digit. */
export function JyutpingChaoPhrase({
  jp,
  className,
}: {
  jp: string
  className?: string
}): ReactNode {
  const parts = jp.trim().split(/(\s+)/)
  if (!parts.length) return null
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (!part) return null
        if (/^\s+$/.test(part)) return <Fragment key={i}>{part}</Fragment>
        if (parseJyutpingTone(part)) {
          return <JyutpingSylText key={i} jp={part} />
        }
        return <Fragment key={i}>{withChaoFace(enrichJyutpingWithChao(part))}</Fragment>
      })}
    </span>
  )
}

/** Tone tile `1`…`6` — digit with Chao contour beside it. */
export function ToneDigitWithChao({ digit }: { digit: string }): ReactNode {
  if (!/^[1-6]$/.test(digit)) return digit
  return (
    <>
      {digit}
      <span className="chao-face" aria-hidden="true">
        {chaoContourForTone(digit as JyutTone)}
      </span>
    </>
  )
}
