import type { Lang } from '../lib/types'
import { CopyButton } from './CopyButton'
import { CopyJyutpingButton } from './CopyJyutpingButton'
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

  return (
    <div className={`result-actions ${className}`.trim()}>
      <SpeakButton text={trimmed} lang={lang} />
      {(lang === 'yue' || lang === 'cmn') && showCopy ? (
        <CopyButton text={trimmed} lang={lang} />
      ) : null}
      {lang === 'yue' && showJyutpingCopy ? <CopyJyutpingButton text={trimmed} /> : null}
    </div>
  )
}
