import { CantoneseText } from './CantoneseText'

/** Secondary colloquial EN→粵 renderings when the API found meaningful variants. */
export function TranslationAlternatives({
  alternatives,
  className = '',
}: {
  alternatives: string[]
  className?: string
}) {
  if (!alternatives.length) return null
  return (
    <div className={['translation-alts', className].filter(Boolean).join(' ')}>
      <p className="translation-alts-label">Other variations</p>
      <ul className="translation-alts-list">
        {alternatives.map((alt) => (
          <li key={alt}>
            <CantoneseText text={alt} />
          </li>
        ))}
      </ul>
    </div>
  )
}
