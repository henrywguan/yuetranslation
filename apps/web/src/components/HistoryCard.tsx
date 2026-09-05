import { CantoneseText } from './CantoneseText'
import { MandarinText } from './MandarinText'
import { ShanghaineseText } from './ShanghaineseText'
import { BiText } from './BiText'
import type { ConversationTurn, Lang } from '../lib/types'
import { biPlain, ui } from '../lib/uiCopy'

function langShort(lang: Lang): string {
  if (lang === 'en') return 'EN'
  if (lang === 'cmn') return '普'
  if (lang === 'wuu') return '沪'
  if (lang === 'tl') return 'TL'
  return '粵'
}

function LangLine({
  lang,
  text,
  definition,
  definitions,
  romanization,
  sandhiHint,
  onBreakdown,
}: {
  lang: ConversationTurn['from']
  text: string
  definition?: string
  definitions?: string[]
  romanization?: string
  sandhiHint?: string
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
        sandhiHint={sandhiHint}
        className="history-card-line"
        onActivate={onBreakdown}
      />
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
  if (lang === 'tl') return <BiText copy={ui.dirTagalog} size="sm" />
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
    turn.to === 'yue' || turn.to === 'cmn' || turn.to === 'wuu'
      ? turn.translation
      : turn.from === 'yue' || turn.from === 'cmn' || turn.from === 'wuu'
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
                definitions={turn.from === 'yue' || turn.from === 'cmn' || turn.from === 'wuu' ? yueDefs : undefined}
                romanization={turn.from === 'wuu' ? turn.romanization : undefined}
                sandhiHint={turn.from === 'wuu' ? turn.sandhiHint : undefined}
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
                definitions={turn.to === 'yue' || turn.to === 'cmn' || turn.to === 'wuu' ? yueDefs : undefined}
                romanization={turn.to === 'wuu' ? turn.romanization : undefined}
                sandhiHint={turn.to === 'wuu' ? turn.sandhiHint : undefined}
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
                {turn.alternatives.map((alt) => (
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
                    ) : (
                      alt
                    )}
                  </li>
                ))}
              </ul>
            </div>
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
