import { CantoneseText } from './CantoneseText'
import { CopyButton } from './CopyButton'
import { BiText } from './BiText'
import { ui } from '../lib/uiCopy'

/** Secondary colloquial EN→粵 renderings when the API found meaningful variants. */
export function TranslationAlternatives({
  alternatives,
  className = '',
  onSelect,
}: {
  alternatives: string[]
  className?: string
  /** Selecting a variation promotes it and opens its character breakdown. */
  onSelect: (phrase: string) => void
}) {
  if (!alternatives.length) return null
  return (
    <div className={['translation-alts', className].filter(Boolean).join(' ')}>
      <p className="translation-alts-label">
        <BiText copy={ui.historyVariations} size="sm" />
      </p>
      <ul className="translation-alts-list">
        {alternatives.map((alt) => (
          <li key={alt}>
            <div className="translation-alt-row">
              <CantoneseText
                text={alt}
                onActivate={onSelect}
                activateLabel={`Use variation ${alt} and open breakdown`}
              />
              <CopyButton text={alt} lang="yue" className="translation-alt-copy" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
