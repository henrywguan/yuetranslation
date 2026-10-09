import { CantoneseText } from './CantoneseText'
import { MandarinText } from './MandarinText'
import { ShanghaineseText } from './ShanghaineseText'
import { SichuaneseText } from './SichuaneseText'
import { TagalogText } from './TagalogText'
import { MexicanSpanishText } from './MexicanSpanishText'
import { PeninsularSpanishText } from './PeninsularSpanishText'
import { PeninsularSpanishRegisterPanel } from './PeninsularSpanishRegisterPanel'
import { MexicanSpanishRegisterPanel } from './MexicanSpanishRegisterPanel'
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
import { BiText } from './BiText'
import { StarPhraseButton } from './StarPhraseButton'
import type { ConversationTurn, Lang } from '../lib/types'
import { biPlain, ui } from '../lib/uiCopy'

export function langShort(lang: Lang): string {
  if (lang === 'en') return 'EN'
  if (lang === 'cmn') return '普'
  if (lang === 'wuu') return '沪'
  if (lang === 'sichuan') return '川'
  if (lang === 'tl') return 'TL'
  if (lang === 'es') return 'Mx'
  if (lang === 'eses') return 'Es'
  if (lang === 'vi') return 'Vi'
  if (lang === 'th') return 'Th'
  if (lang === 'lo') return 'Lo'
  if (lang === 'ko') return 'Ko'
  if (lang === 'ja') return 'Ja'
  if (lang === 'id') return 'Id'
  if (lang === 'ms') return 'Ms'
  if (lang === 'pt') return 'Pt'
  if (lang === 'fr') return 'Fr'
  if (lang === 'hi') return 'Hi'
  if (lang === 'km') return 'Km'
  if (lang === 'my') return 'My'
  if (lang === 'jv') return 'Jv'
  if (lang === 'it') return 'It'
  if (lang === 'de') return 'De'
  if (lang === 'nl') return 'Nl'
  if (lang === 'ar') return 'Ar'
  if (lang === 'arsa') return 'Ar'
  if (lang === 'ceb') return 'Cb'
  if (lang === 'ilo') return 'Il'
  if (lang === 'bcl') return 'Bc'
  return '粵'
}

export function LangLine({
  lang,
  text,
  definition,
  definitions,
  romanization,
  onBreakdown,
}: {
  lang: ConversationTurn['from']
  text: string
  definition?: string
  definitions?: string[]
  romanization?: string
  onBreakdown?: (phrase: string) => void
}) {
  if (lang === 'yue') {
    return (
      <CantoneseText
        text={text}
        definition={definition}
        definitions={definitions}
        className="history-card-line"
        jpMode="popup"
      />
    )
  }
  if (lang === 'cmn') {
    return (
      <MandarinText
        text={text}
        definition={definition}
        definitions={definitions}
        className="history-card-line"
        onActivate={onBreakdown}
      />
    )
  }
  if (lang === 'wuu') {
    return (
      <ShanghaineseText
        text={text}
        romanization={romanization}
        className="history-card-line"
        onActivate={onBreakdown}
      />
    )
  }
  if (lang === 'sichuan') {
    return (
      <SichuaneseText
        text={text}
        romanization={romanization}
        className="history-card-line"
        onActivate={onBreakdown}
      />
    )
  }
  if (lang === 'tl') {
    return (
      <TagalogText
        text={text}
        definition={definition}
        definitions={definitions}
        className="history-card-line"
        onActivate={onBreakdown}
      />
    )
  }
  if (lang === 'es') {
    return (
      <MexicanSpanishText
        text={text}
        definition={definition}
        definitions={definitions}
        className="history-card-line"
        onActivate={onBreakdown}
      />
    )
  }
  if (lang === 'eses') {
    return (
      <PeninsularSpanishText
        text={text}
        definition={definition}
        definitions={definitions}
        className="history-card-line"
        onActivate={onBreakdown}
      />
    )
  }
  if (lang === 'vi') {
    return (
      <VietnameseText
        text={text}
        definition={definition}
        definitions={definitions}
        className="history-card-line"
        onActivate={onBreakdown}
      />
    )
  }
  if (lang === 'th') {
    return <ThaiText text={text} className="history-card-line" onActivate={onBreakdown} />
  }
  if (lang === 'lo') {
    return <LaoText text={text} className="history-card-line" onActivate={onBreakdown} />
  }
  if (lang === 'ko') {
    return <KoreanText text={text} className="history-card-line" onActivate={onBreakdown} />
  }
  if (lang === 'ja') {
    return <JaText text={text} className="history-card-line" onActivate={onBreakdown} />
  }
  if (lang === 'id') {
    return <IdText text={text} className="history-card-line" onActivate={onBreakdown} />
  }
  if (lang === 'ms') {
    return <MsText text={text} className="history-card-line" onActivate={onBreakdown} />
  }
  if (lang === 'pt') {
    return <PtText text={text} className="history-card-line" onActivate={onBreakdown} />
  }
  if (lang === 'fr') {
    return <FrText text={text} className="history-card-line" onActivate={onBreakdown} />
  }
  if (lang === 'hi') {
    return <HiText text={text} className="history-card-line" onActivate={onBreakdown} />
  }
  if (lang === 'km') {
    return <KmText text={text} className="history-card-line" onActivate={onBreakdown} />
  }
  if (lang === 'my') {
    return <MyText text={text} className="history-card-line" onActivate={onBreakdown} />
  }
  if (lang === 'jv') {
    return <JvText text={text} className="history-card-line" onActivate={onBreakdown} />
  }
  if (lang === 'it') {
    return <ItText text={text} className="history-card-line" onActivate={onBreakdown} />
  }
  if (lang === 'de') {
    return <DeText text={text} className="history-card-line" onActivate={onBreakdown} />
  }
  if (lang === 'nl') {
    return <NlText text={text} className="history-card-line" onActivate={onBreakdown} />
  }
  if (lang === 'ar') {
    return <ArText variant="ar" text={text} className="history-card-line" onActivate={onBreakdown} />
  }
  if (lang === 'arsa') {
    return <ArText variant="arsa" text={text} className="history-card-line" onActivate={onBreakdown} />
  }
  if (lang === 'ceb' || lang === 'ilo' || lang === 'bcl') {
    if (onBreakdown) {
      return (
        <button
          type="button"
          className="history-card-line history-card-en spoken-line-text--action"
          lang={lang}
          onClick={() => onBreakdown(text)}
          aria-label="Open translation details"
        >
          {text}
        </button>
      )
    }
    return (
      <p className="history-card-line history-card-en" lang={lang}>
        {text}
      </p>
    )
  }
  if (onBreakdown) {
    return (
      <button
        type="button"
        className="history-card-line history-card-en spoken-line-text--action"
        onClick={() => onBreakdown(text)}
        aria-label="Open translation details"
      >
        {text}
      </button>
    )
  }
  return <p className="history-card-line history-card-en">{text}</p>
}

function langLabel(lang: Lang) {
  if (lang === 'en') return <BiText copy={ui.english} size="sm" only="en" />
  if (lang === 'cmn') return <BiText copy={ui.dirMandarin} size="sm" only="zh" />
  if (lang === 'wuu') return <BiText copy={ui.dirShanghainese} size="sm" only="zh" />
  if (lang === 'sichuan') return <BiText copy={ui.dirSichuanese} size="sm" only="zh" />
  if (lang === 'tl') return <BiText copy={ui.dirTagalog} size="sm" />
  if (lang === 'es') return <BiText copy={ui.dirMexicanSpanish} size="sm" />
  if (lang === 'eses') return <BiText copy={ui.dirPeninsularSpanish} size="sm" />
  if (lang === 'vi') return <BiText copy={ui.dirVietnamese} size="sm" />
  if (lang === 'th') return <BiText copy={ui.dirThai} size="sm" />
  if (lang === 'lo') return <BiText copy={ui.dirLao} size="sm" />
  if (lang === 'ko') return <BiText copy={ui.dirKorean} size="sm" />
  if (lang === 'ja') return <BiText copy={ui.dirJapanese} size="sm" />
  if (lang === 'id') return <BiText copy={ui.dirIndonesian} size="sm" />
  if (lang === 'ms') return <BiText copy={ui.dirMalay} size="sm" />
  if (lang === 'pt') return <BiText copy={ui.dirPortuguese} size="sm" />
  if (lang === 'fr') return <BiText copy={ui.dirFrench} size="sm" />
  if (lang === 'hi') return <BiText copy={ui.dirHindi} size="sm" />
  if (lang === 'km') return <BiText copy={ui.dirKhmer} size="sm" />
  if (lang === 'my') return <BiText copy={ui.dirBurmese} size="sm" />
  if (lang === 'jv') return <BiText copy={ui.dirJavanese} size="sm" />
  if (lang === 'it') return <BiText copy={ui.dirItalian} size="sm" />
  if (lang === 'de') return <BiText copy={ui.dirGerman} size="sm" />
  if (lang === 'nl') return <BiText copy={ui.dirDutch} size="sm" />
  if (lang === 'ar') return <BiText copy={ui.dirEgyptianArabic} size="sm" />
  if (lang === 'arsa') return <BiText copy={ui.dirModernStandardArabic} size="sm" />
  if (lang === 'ceb') return <BiText copy={ui.dirCebuano} size="sm" />
  if (lang === 'ilo') return <BiText copy={ui.dirIlocano} size="sm" />
  if (lang === 'bcl') return <BiText copy={ui.dirBikol} size="sm" />
  return <BiText copy={ui.cantonese} size="sm" only="zh" />
}

export function HistoryCard({
  turn,
  expanded,
  onToggle,
  onBreakdown,
  isLatest = false,
}: {
  turn: ConversationTurn
  expanded: boolean
  onToggle: () => void
  onBreakdown: (phrase: string) => void
  isLatest?: boolean
}) {
  const zhPhrase =
    turn.to === 'yue' ||
    turn.to === 'cmn' ||
    turn.to === 'wuu' ||
    turn.to === 'sichuan' ||
    turn.to === 'tl' ||
    turn.to === 'es' ||
    turn.to === 'eses' ||
    turn.to === 'vi' ||
    turn.to === 'th' ||
    turn.to === 'lo'
      ? turn.translation
      : turn.from === 'yue' ||
          turn.from === 'cmn' ||
          turn.from === 'wuu' ||
          turn.from === 'sichuan' ||
          turn.from === 'tl' ||
          turn.from === 'es' ||
          turn.from === 'eses' ||
          turn.from === 'vi' ||
          turn.from === 'th' ||
          turn.from === 'lo'
        ? turn.source
        : ''
  const yueDefs = (turn.definitions || []).map((d) => d.trim()).filter(Boolean)
  const hasDrill = Boolean(zhPhrase.trim())
  const hasDetails =
    Boolean(turn.definition?.trim()) ||
    Boolean(turn.alternatives?.length) ||
    yueDefs.length > 0

  return (
    <article
      className={`history-card${expanded ? ' is-expanded' : ''}${isLatest ? ' is-latest' : ''}`}
      data-turn-id={turn.id}
    >
      <div className="history-card-top">
        <div className="history-card-meta">
          <span className="history-card-dir">
            {langShort(turn.from)} → {langShort(turn.to)}
          </span>
          {isLatest ? (
            <span className="history-card-badge">
              <BiText copy={ui.historyLatest} size="sm" layout="inline" />
            </span>
          ) : null}
        </div>
        <div className="history-card-top-actions">
          <StarPhraseButton
            className="history-card-star"
            source={turn.source}
            translation={turn.translation}
            from={turn.from}
            to={turn.to}
            romanization={turn.romanization}
            origin="solo"
          />
          <button
            type="button"
            className="history-card-expand"
            aria-expanded={expanded}
            aria-controls={`history-detail-${turn.id}`}
            onClick={onToggle}
          >
            <BiText copy={expanded ? ui.historyCollapse : ui.historyExpand} size="sm" layout="inline" />
            <span className="history-card-chevron" aria-hidden="true">
              {expanded ? '▾' : '▸'}
            </span>
          </button>
        </div>
      </div>

      <div
        className="history-card-body"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
      >
        <div className="history-card-pair">
          <div className="history-card-block">
            <p className="history-card-label">{langLabel(turn.from)}</p>
            <div
              className="history-card-line-wrap"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <LangLine
                lang={turn.from}
                text={turn.source}
                definition={turn.definition}
                definitions={
                  turn.from === 'yue' ||
                  turn.from === 'cmn' ||
                  turn.from === 'wuu' ||
                  turn.from === 'sichuan'
                    ? yueDefs
                    : undefined
                }
                romanization={
                  turn.from === 'wuu' || turn.from === 'sichuan' ? turn.romanization : undefined
                }
                onBreakdown={onBreakdown}
              />
            </div>
          </div>
          <div className="history-card-block">
            <p className="history-card-label">{langLabel(turn.to)}</p>
            <div
              className="history-card-line-wrap"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <LangLine
                lang={turn.to}
                text={turn.translation}
                definition={turn.definition}
                definitions={
                  turn.to === 'yue' ||
                  turn.to === 'cmn' ||
                  turn.to === 'wuu' ||
                  turn.to === 'sichuan'
                    ? yueDefs
                    : undefined
                }
                romanization={
                  turn.to === 'wuu' || turn.to === 'sichuan' ? turn.romanization : undefined
                }
                onBreakdown={onBreakdown}
              />
            </div>
          </div>
        </div>
      </div>

      {expanded ? (
        <div className="history-card-detail" id={`history-detail-${turn.id}`}>
          {yueDefs.length ? (
            <div className="history-card-defs">
              <p className="history-card-detail-label">
                <BiText copy={ui.definition} size="sm" layout="inline" />
              </p>
              <ul>
                {yueDefs.map((def, i) => (
                  <li key={`hist-def-${i}`}>{def}</li>
                ))}
              </ul>
            </div>
          ) : turn.definition?.trim() ? (
            <p className="history-card-def">
              <span className="history-card-detail-label">
                <BiText copy={ui.definition} size="sm" layout="inline" />
              </span>
              <span>{turn.definition.trim()}</span>
            </p>
          ) : null}

          {turn.alternatives?.length ? (
            <div className="history-card-alts">
              <p className="history-card-detail-label">
                <BiText copy={ui.historyVariations} size="sm" layout="inline" />
              </p>
              <ul>
                {turn.alternatives.map((alt, i) => (
                  <li key={alt}>
                    {turn.to === 'cmn' ? (
                      <MandarinText
                        text={alt}
                        className="history-card-line"
                        onActivate={onBreakdown}
                      />
                    ) : turn.to === 'wuu' ? (
                      <ShanghaineseText
                        text={alt}
                        romanization={turn.alternativeRomanizations?.[i]}
                        showSchemeLabel={false}
                        className="history-card-line"
                        onActivate={onBreakdown}
                      />
                    ) : turn.to === 'sichuan' ? (
                      <SichuaneseText
                        text={alt}
                        romanization={turn.alternativeRomanizations?.[i]}
                        showSchemeLabel={false}
                        className="history-card-line"
                        onActivate={onBreakdown}
                      />
                    ) : turn.to === 'yue' ? (
                      <CantoneseText
                        text={alt}
                        jpMode="popup"
                        onActivate={onBreakdown}
                        activateLabel={biPlain(ui.charDetail)}
                      />
                    ) : turn.to === 'tl' ? (
                      <TagalogText text={alt} className="history-card-line" onActivate={onBreakdown} />
                    ) : turn.to === 'es' ? (
                      <MexicanSpanishText
                        text={alt}
                        className="history-card-line"
                        onActivate={onBreakdown}
                      />
                    ) : turn.to === 'eses' ? (
                      <PeninsularSpanishText
                        text={alt}
                        className="history-card-line"
                        onActivate={onBreakdown}
                      />
                    ) : turn.to === 'vi' ? (
                      <VietnameseText
                        text={alt}
                        className="history-card-line"
                        onActivate={onBreakdown}
                      />
                    ) : turn.to === 'th' ? (
                      <ThaiText text={alt} className="history-card-line" onActivate={onBreakdown} />
                    ) : turn.to === 'lo' ? (
                      <LaoText text={alt} className="history-card-line" onActivate={onBreakdown} />
                    ) : turn.to === 'ko' ? (
                      <KoreanText text={alt} className="history-card-line" onActivate={onBreakdown} />
                    ) : turn.to === 'ja' ? (
                      <JaText text={alt} className="history-card-line" onActivate={onBreakdown} />
                    ) : turn.to === 'id' ? (
                      <IdText text={alt} className="history-card-line" onActivate={onBreakdown} />
                    ) : turn.to === 'ms' ? (
                      <MsText text={alt} className="history-card-line" onActivate={onBreakdown} />
                    ) : turn.to === 'pt' ? (
                      <PtText text={alt} className="history-card-line" onActivate={onBreakdown} />
                    ) : turn.to === 'fr' ? (
                      <FrText text={alt} className="history-card-line" onActivate={onBreakdown} />
                    ) : turn.to === 'hi' ? (
                      <HiText text={alt} className="history-card-line" onActivate={onBreakdown} />
                    ) : turn.to === 'km' ? (
                      <KmText text={alt} className="history-card-line" onActivate={onBreakdown} />
                    ) : turn.to === 'my' ? (
                      <MyText text={alt} className="history-card-line" onActivate={onBreakdown} />
                    ) : turn.to === 'jv' ? (
                      <JvText text={alt} className="history-card-line" onActivate={onBreakdown} />
                    ) : turn.to === 'it' ? (
                      <ItText text={alt} className="history-card-line" onActivate={onBreakdown} />
                    ) : turn.to === 'de' ? (
                      <DeText text={alt} className="history-card-line" onActivate={onBreakdown} />
                    ) : turn.to === 'nl' ? (
                      <NlText text={alt} className="history-card-line" onActivate={onBreakdown} />
                    ) : turn.to === 'ar' || turn.to === 'arsa' ? (
                      <ArText variant={turn.to} text={alt} className="history-card-line" onActivate={onBreakdown} />
                    ) : (
                      alt
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {turn.to === 'es' && zhPhrase ? (
            <MexicanSpanishRegisterPanel
              text={zhPhrase}
              sourceText={turn.from !== 'es' ? turn.source : turn.translation}
              sourceLang={turn.from !== 'es' ? turn.from : 'en'}
            />
          ) : null}

          {turn.to === 'eses' && zhPhrase ? (
            <PeninsularSpanishRegisterPanel
              text={zhPhrase}
              sourceText={turn.from !== 'eses' ? turn.source : turn.translation}
              sourceLang={turn.from !== 'eses' ? turn.from : 'en'}
            />
          ) : null}

          {hasDrill ? (
            <button
              type="button"
              className="history-card-drill"
              onClick={() => onBreakdown(zhPhrase)}
            >
              <BiText copy={ui.historyBreakdown} size="sm" layout="inline" />
            </button>
          ) : null}

          {!hasDetails && !hasDrill ? (
            <p className="history-card-empty-detail muted">
              <BiText copy={ui.historyNoDetails} size="sm" layout="inline" />
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
