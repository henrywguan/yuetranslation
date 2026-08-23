import type { Lang } from '../lib/types'
import { CopyButton } from './CopyButton'
import { SpeakButton } from './SpeakButton'

/** Speak + copy controls stacked beside a translation result. */
export function ResultActions({
  text,
  lang,
  className = '',
  showCopy = true,
}: {
  text: string
  lang: Lang
  className?: string
  showCopy?: boolean
}) {
  const trimmed = text.trim()
  if (!trimmed) return null

  return (
    <div className={`result-actions ${className}`.trim()}>
      <SpeakButton text={trimmed} lang={lang} />
      {lang === 'yue' && showCopy ? <CopyButton text={trimmed} lang={lang} /> : null}
    </div>
  )
}
