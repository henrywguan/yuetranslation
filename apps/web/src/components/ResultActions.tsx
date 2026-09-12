import { hasHan } from '../lib/jyutping'
import type { Lang } from '../lib/types'
import { CopyButton } from './CopyButton'
import { CopyJyutpingButton } from './CopyJyutpingButton'
import { JyutpingFontTip } from './JyutpingFontTip'
import { SpeakButton } from './SpeakButton'

/** Speak + copy controls stacked beside a translation result. */
export function ResultActions({
  text,
  lang,
  className = '',
  showCopy = true,
  /** Second copy control: Jyutping + Chao tone letters (Details / Cantonese creators). */
  showJyutpingCopy = false,
}: {
  text: string
  lang: Lang
  className?: string
  showCopy?: boolean
  showJyutpingCopy?: boolean
}) {
  const trimmed = text.trim()
  if (!trimmed) return null

  const showJyutping = lang === 'yue' && showJyutpingCopy && hasHan(trimmed)

  return (
    <div className={`result-actions ${className}`.trim()}>
      <div className="result-actions-stack">
        <SpeakButton text={trimmed} lang={lang} />
        {(lang === 'yue' || lang === 'cmn') && showCopy ? (
          <CopyButton text={trimmed} lang={lang} />
        ) : null}
        {showJyutping ? <CopyJyutpingButton text={trimmed} /> : null}
      </div>
      {showJyutping ? <JyutpingFontTip /> : null}
    </div>
  )
}
