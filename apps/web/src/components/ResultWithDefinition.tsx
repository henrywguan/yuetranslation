import { CantoneseText } from './CantoneseText'
import { MandarinText } from './MandarinText'
import { ShanghaineseText } from './ShanghaineseText'
import { SichuaneseText } from './SichuaneseText'
import { TopolectHanText, topolectHtmlLang, topolectSchemeLabel } from './TopolectHanText'
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
import { ArText } from './ArText'
import { TaText } from './TaText'
import { PtptText } from './PtptText'
import { TrText } from './TrText'
import { BnText } from './BnText'
import { LangFamilyText } from './LangFamilyText'
import { isLangFamilyLang } from '../lib/langFamily'
import { ResultActions } from './ResultActions'
import { CopyButton } from './CopyButton'
import { SpeakButton } from './SpeakButton'
import { normalizeEnglishApostrophes } from '../lib/typography'
import type { Lang } from '../lib/types'

/** Translation line only — gloss definitions stay out of the pane (details/drill-down only). */
export function ResultWithDefinition({
  text,
  definition,
  definitions,
  cantonese = true,
  chineseLang = 'yue',
  romanization,
  className = '',
  textClassName = '',
  onActivate,
  speakLang,
  showCopy = true,
}: {
  text: string
  /** Kept for character-detail drill-down; not rendered in the pane. */
  definition?: string
  /** Multiple English senses — triggers dotted underline + details open. */
  definitions?: string[]
  cantonese?: boolean
  /** When cantonese/display, which variety for ruby / Tagalog / Mexican Spanish + copy. */
  chineseLang?: Lang
  /** Wugniu when chineseLang is wuu; Sichuanese Pinyin when sichuan; Pha̍k-fa-sṳ / Peng’im / Tâi-lô for hak/teo/nan. */
  romanization?: string
  className?: string
  textClassName?: string
  onActivate?: (text: string) => void
  /** When set, show a tap-to-speak control for this line. */
  speakLang?: Lang
  /** Show copy beside speak (Chinese / Tagalog / Mexican Spanish). */
  showCopy?: boolean
}) {
  const trimmed = text.trim()
  const def = definition?.trim() || ''
  if (!trimmed) return null
  // Keep copy / metadata on the pane language (incl. ar / arsa / scaffold VoiceLangs).
  const displayLang: Lang = chineseLang

  return (
    <div className={`result-with-def ${className}`.trim()}>
      <div className="result-with-def-main">
        <div className="result-with-def-line">
          {cantonese ? (
            chineseLang === 'tl' ? (
              <TagalogText
                text={trimmed}
                definition={def}
                definitions={definitions}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
              />
            ) : chineseLang === 'es' ? (
              <MexicanSpanishText
                text={trimmed}
                definition={def}
                definitions={definitions}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
              />
            ) : chineseLang === 'eses' ? (
              <PeninsularSpanishText
                text={trimmed}
                definition={def}
                definitions={definitions}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
              />
            ) : chineseLang === 'vi' ? (
              <VietnameseText
                text={trimmed}
                definition={def}
                definitions={definitions}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
              />
            ) : chineseLang === 'th' ? (
              <ThaiText
                text={trimmed}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
              />
            ) : chineseLang === 'lo' ? (
              <LaoText
                text={trimmed}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
              />
            ) : chineseLang === 'ko' ? (
              <KoreanText
                text={trimmed}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
              />
            ) : chineseLang === 'ja' ? (
              <JaText
                text={trimmed}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
              />
            ) : chineseLang === 'id' ? (
              <IdText
                text={trimmed}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
              />
            ) : chineseLang === 'ms' ? (
              <MsText
                text={trimmed}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
              />
            ) : chineseLang === 'pt' ? (
              <PtText
                text={trimmed}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
              />
            ) : chineseLang === 'fr' ? (
              <FrText
                text={trimmed}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
              />
            ) : chineseLang === 'hi' ? (
              <HiText
                text={trimmed}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
              />
            ) : chineseLang === 'km' ? (
              <KmText
                text={trimmed}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
              />
            ) : chineseLang === 'my' ? (
              <MyText
                text={trimmed}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
              />
            ) : chineseLang === 'jv' ? (
              <JvText
                text={trimmed}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
              />
            ) : chineseLang === 'it' ? (
              <ItText
                text={trimmed}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
              />
            ) : chineseLang === 'de' ? (
              <DeText
                text={trimmed}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
              />
            ) : chineseLang === 'nl' ? (
              <NlText
                text={trimmed}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
              />
            ) : chineseLang === 'ar' || chineseLang === 'arsa' ? (
              <ArText
                variant={chineseLang}
                text={trimmed}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
              />
            ) : chineseLang === 'ta' ? (
              <TaText
                text={trimmed}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
              />
            ) : chineseLang === 'ptpt' ? (
              <PtptText
                text={trimmed}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
              />
            ) : chineseLang === 'tr' ? (
              <TrText
                text={trimmed}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
              />
            ) : chineseLang === 'bn' ? (
              <BnText
                text={trimmed}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
              />
            ) : isLangFamilyLang(chineseLang) ? (
              <LangFamilyText
                lang={chineseLang}
                text={trimmed}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
              />
            ) : chineseLang === 'hak' || chineseLang === 'teo' || chineseLang === 'nan' ? (
              <TopolectHanText
                text={trimmed}
                romanization={romanization}
                schemeLabel={topolectSchemeLabel(chineseLang)}
                htmlLang={topolectHtmlLang(chineseLang)}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
              />
            ) : chineseLang === 'ceb' || chineseLang === 'ilo' || chineseLang === 'bcl' ? (
              onActivate ? (
                <button
                  type="button"
                  className={`${textClassName || 'result-text'} spoken-line-text--action`}
                  lang={chineseLang === 'ceb' ? 'ceb' : chineseLang === 'ilo' ? 'ilo' : 'bcl'}
                  onClick={() => onActivate(trimmed)}
                >
                  {trimmed}
                </button>
              ) : (
                <p className={textClassName || 'result-text'} lang={chineseLang === 'ceb' ? 'ceb' : chineseLang === 'ilo' ? 'ilo' : 'bcl'}>
                  {trimmed}
                </p>
              )
            ) : chineseLang === 'cmn' ? (
              <MandarinText
                text={trimmed}
                definition={def}
                definitions={definitions}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
              />
            ) : chineseLang === 'wuu' ? (
              <ShanghaineseText
                text={trimmed}
                romanization={romanization}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
              />
            ) : chineseLang === 'sichuan' ? (
              <SichuaneseText
                text={trimmed}
                romanization={romanization}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
              />
            ) : (
              <CantoneseText
                text={trimmed}
                definition={def}
                definitions={definitions}
                className={textClassName || 'result-text'}
                onActivate={onActivate}
              />
            )
          ) : onActivate ? (
            <button
              type="button"
              className={`${textClassName || 'result-text'} spoken-line-text--action`}
              lang="en"
              onClick={() => onActivate(trimmed)}
            >
              {normalizeEnglishApostrophes(trimmed)}
            </button>
          ) : (
            <p className={textClassName || 'result-text'} lang="en">
              {normalizeEnglishApostrophes(trimmed)}
            </p>
          )}
          {speakLang && trimmed ? (
            speakLang === 'yue' ||
            speakLang === 'cmn' ||
            speakLang === 'wuu' ||
            speakLang === 'sichuan' ? (
              <ResultActions text={trimmed} lang={speakLang} showCopy={showCopy} />
            ) : (
              <SpeakButton text={trimmed} lang={speakLang} />
            )
          ) : showCopy && cantonese && trimmed ? (
            <CopyButton text={trimmed} lang={displayLang} />
          ) : null}
        </div>
      </div>
    </div>
  )
}
