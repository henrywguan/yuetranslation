import { CantoneseText } from './CantoneseText'

/** Secondary colloquial EN→粵 renderings when the API found meaningful variants. */
export function TranslationAlternatives({
  alternatives,
  className = '',
  onSelect,
}: {
  alternatives: string[]
  className?: string
  /** Selecting a variation promotes it and opens its character breakdown. */
  onSelect?: (phrase: string) => void
}) {
  if (!alternatives.length) return null
  return (
    <div className={['translation-alts', className].filter(Boolean).join(' ')}>
      <p className="translation-alts-label">Other variations</p>
      <ul className="translation-alts-list">
        {alternatives.map((alt) => (
          <li key={alt}>
            {onSelect ? (
              <CantoneseText
                text={alt}
                onActivate={onSelect}
                activateLabel={`Use variation ${alt} and open breakdown`}
              />
            ) : (
              <CantoneseText text={alt} />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
