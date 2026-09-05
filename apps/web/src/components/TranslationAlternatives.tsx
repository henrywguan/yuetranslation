import { CantoneseText } from './CantoneseText'
import { CopyButton } from './CopyButton'
import { SpeakButton } from './SpeakButton'
import { BiText } from './BiText'
import { ui } from '../lib/uiCopy'

/** Secondary colloquial variants when the API found meaningful alternatives. */
export function TranslationAlternatives({
  alternatives,
  className = '',
  onSelect,
  showCopy = true,
  showSpeak = false,
  lang = 'yue',
}: {
  alternatives: string[]
  className?: string
  /** Selecting a variation promotes it and opens its breakdown. */
  onSelect: (phrase: string) => void
  showCopy?: boolean
  showSpeak?: boolean
  /** Yue variants use Cantonese ruby; English variants stay plain. */
  lang?: 'en' | 'yue'
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
              {lang === 'yue' ? (
                <CantoneseText
                  text={alt}
                  onActivate={onSelect}
                  activateLabel={`Use variation ${alt} and open breakdown`}
                />
              ) : (
                <button
                  type="button"
                  className="translation-alt-en"
                  onClick={() => onSelect(alt)}
                  aria-label={`Use variation ${alt} and open details`}
                >
                  {alt}
                </button>
              )}
              {showSpeak ? (
                <SpeakButton text={alt} lang={lang} className="translation-alt-speak" />
              ) : null}
              {showCopy ? (
                <CopyButton text={alt} lang={lang} className="translation-alt-copy" />
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
