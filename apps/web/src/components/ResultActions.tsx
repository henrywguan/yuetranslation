import type { Lang } from '../lib/types'
import { CopyButton } from './CopyButton'
import { SpeakButton } from './SpeakButton'

/** Speak + copy controls stacked beside a translation result. */
export function ResultActions({
  text,
  lang,
  className = '',
}: {
  text: string
  lang: Lang
  className?: string
}) {
  const trimmed = text.trim()
  if (!trimmed) return null

  return (
    <div className={`result-actions ${className}`.trim()}>
      <SpeakButton text={trimmed} lang={lang} />
      <CopyButton text={trimmed} lang={lang} />
    </div>
  )
}
