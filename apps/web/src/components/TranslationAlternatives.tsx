import { CantoneseText } from './CantoneseText'
import { MandarinText } from './MandarinText'
import { ShanghaineseText } from './ShanghaineseText'
import { SichuaneseText } from './SichuaneseText'
import { TagalogText } from './TagalogText'
import { MexicanSpanishText } from './MexicanSpanishText'
import { PeninsularSpanishText } from './PeninsularSpanishText'
import { VietnameseText } from './VietnameseText'
import { ThaiText } from './ThaiText'
import { LaoText } from './LaoText'
import { KoreanText } from './KoreanText'
import { JaText } from './JaText'
import { IdText } from './IdText'
import { MsText } from './MsText'
import { PtText } from './PtText'
import { FrText } from './FrText'
import { HiText } from './HiText'
import { KmText } from './KmText'
import { MyText } from './MyText'
import { JvText } from './JvText'
import { ItText } from './ItText'
import { DeText } from './DeText'
import { NlText } from './NlText'
import { CopyButton } from './CopyButton'
import { SpeakButton } from './SpeakButton'
import { BiText } from './BiText'
import { ui } from '../lib/uiCopy'
import type { Lang } from '../lib/types'

/** Secondary colloquial variants when the API found meaningful alternatives. */
export function TranslationAlternatives({
  alternatives,
  alternativeRomanizations,
  className = '',
  onSelect,
  showCopy = true,
  showSpeak = false,
  lang = 'yue',
  hideLabel = false,
}: {
  alternatives: string[]
  /** Wugniu / Sichuanese Pinyin for each alternative (same order). */
  alternativeRomanizations?: string[]
  className?: string
  /** Selecting a variation promotes it and opens its breakdown. */
  onSelect: (phrase: string) => void
  showCopy?: boolean
  showSpeak?: boolean
  /** Yue/cmn variants use ruby; English variants stay plain. */
  lang?: Lang
  /** When Details wraps this in DetailCollapsible, skip the duplicate label. */
  hideLabel?: boolean
}) {
  if (!alternatives.length) return null
  return (
    <div className={['translation-alts', className].filter(Boolean).join(' ')}>
      {hideLabel ? null : (
        <p className="translation-alts-label">
          <BiText copy={ui.historyVariations} size="sm" />
        </p>
      )}
      <ul className="translation-alts-list">
        {alternatives.map((alt, i) => (
          <li key={alt}>
            <div className="translation-alt-row">
              {lang === 'yue' ? (
                <CantoneseText
                  text={alt}
                  onActivate={onSelect}
                  activateLabel={`Use variation ${alt} and open breakdown`}
                />
              ) : lang === 'cmn' ? (
                <MandarinText
                  text={alt}
                  onActivate={onSelect}
                  activateLabel={`Use variation ${alt} and open breakdown`}
                />
              ) : lang === 'wuu' ? (
                <ShanghaineseText
                  text={alt}
                  romanization={alternativeRomanizations?.[i]}
                  showSchemeLabel={false}
                  onActivate={onSelect}
                  activateLabel={`Use variation ${alt} and open details`}
                />
              ) : lang === 'sichuan' ? (
                <SichuaneseText
                  text={alt}
                  romanization={alternativeRomanizations?.[i]}
                  showSchemeLabel={false}
                  onActivate={onSelect}
                  activateLabel={`Use variation ${alt} and open details`}
                />
              ) : lang === 'tl' ? (
                <TagalogText
                  text={alt}
                  onActivate={onSelect}
                  activateLabel={`Use variation ${alt} and open details`}
                />
              ) : lang === 'es' ? (
                <MexicanSpanishText
                  text={alt}
                  onActivate={onSelect}
                  activateLabel={`Use variation ${alt} and open details`}
                />
              ) : lang === 'eses' ? (
                <PeninsularSpanishText
                  text={alt}
                  onActivate={onSelect}
                  activateLabel={`Use variation ${alt} and open details`}
                />
              ) : lang === 'vi' ? (
                <VietnameseText
                  text={alt}
                  onActivate={onSelect}
                  activateLabel={`Use variation ${alt} and open details`}
                />
              ) : lang === 'th' ? (
                <ThaiText
                  text={alt}
                  onActivate={onSelect}
                  activateLabel={`Use variation ${alt} and open details`}
                />
              ) : lang === 'lo' ? (
                <LaoText
                  text={alt}
                  onActivate={onSelect}
                  activateLabel={`Use variation ${alt} and open details`}
                />
              ) : lang === 'ko' ? (
                <KoreanText
                  text={alt}
                  onActivate={onSelect}
                  activateLabel={`Use variation ${alt} and open details`}
                />
              ) : lang === 'ja' ? (
                <JaText
                  text={alt}
                  className="result-text"
                  onActivate={onSelect}
                />
              ) : lang === 'id' ? (
                <IdText
                  text={alt}
                  className="result-text"
                  onActivate={onSelect}
                />
              ) : lang === 'ms' ? (
                <MsText
                  text={alt}
                  className="result-text"
                  onActivate={onSelect}
                />
              ) : lang === 'pt' ? (
                <PtText
                  text={alt}
                  className="result-text"
                  onActivate={onSelect}
                />
              ) : lang === 'fr' ? (
                <FrText
                  text={alt}
                  className="result-text"
                  onActivate={onSelect}
                />
              ) : lang === 'hi' ? (
                <HiText
                  text={alt}
                  className="result-text"
                  onActivate={onSelect}
                />
              ) : lang === 'km' ? (
                <KmText
                  text={alt}
                  className="result-text"
                  onActivate={onSelect}
                />
              ) : lang === 'my' ? (
                <MyText
                  text={alt}
                  className="result-text"
                  onActivate={onSelect}
                />
              ) : lang === 'jv' ? (
                <JvText
                  text={alt}
                  className="result-text"
                  onActivate={onSelect}
                />
              ) : lang === 'it' ? (
                <ItText
                  text={alt}
                  className="result-text"
                  onActivate={onSelect}
                />
              ) : lang === 'de' ? (
                <DeText
                  text={alt}
                  className="result-text"
                  onActivate={onSelect}
                />
              ) : lang === 'nl' ? (
                <NlText
                  text={alt}
                  className="result-text"
                  onActivate={onSelect}
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
                <SpeakButton text={alt} lang={lang} className="translation-alt-speak" warm={false} />
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
