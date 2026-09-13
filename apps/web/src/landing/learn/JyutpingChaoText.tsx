import { Fragment, type ReactNode } from 'react'
import { JyutpingSylText } from '../../components/JyutpingSylText'
import { withChaoFace } from '../../lib/chaoFace'
import {
  chaoContourForTone,
  enrichJyutpingWithChao,
  parseJyutpingTone,
  type JyutTone,
} from '../../lib/jyutping'

/** Free-text line with Jyutping syllables showing tone digit + Chao (`si1˥`). */
export function JyutpingChaoText({ text }: { text: string }): ReactNode {
  return withChaoFace(enrichJyutpingWithChao(text))
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
