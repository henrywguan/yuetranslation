import { CantoneseText } from './CantoneseText'
import { BiText } from './BiText'
import type { ConversationTurn } from '../lib/types'
import { biPlain, ui } from '../lib/uiCopy'

function LangLine({
  lang,
  text,
  definition,
  definitions,
  onBreakdown,
}: {
  lang: ConversationTurn['from']
  text: string
  definition?: string
  definitions?: string[]
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
  const yuePhrase = turn.to === 'yue' ? turn.translation : turn.from === 'yue' ? turn.source : ''
  const yueDefs = (turn.definitions || []).map((d) => d.trim()).filter(Boolean)
  const hasDrill = Boolean(yuePhrase.trim())
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
            {turn.from === 'en' ? 'EN' : '粵'} → {turn.to === 'en' ? 'EN' : '粵'}
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
            <p className="history-card-label">
              {turn.from === 'en' ? (
                <BiText copy={ui.english} size="sm" only="en" />
              ) : (
                <BiText copy={ui.cantonese} size="sm" only="zh" />
              )}
            </p>
            <div
              className="history-card-line-wrap"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <LangLine
                lang={turn.from}
                text={turn.source}
                definition={turn.definition}
                definitions={turn.from === 'yue' ? yueDefs : undefined}
                onBreakdown={onBreakdown}
              />
            </div>
          </div>
          <div className="history-card-block">
            <p className="history-card-label">
              {turn.to === 'en' ? (
                <BiText copy={ui.english} size="sm" only="en" />
              ) : (
                <BiText copy={ui.cantonese} size="sm" only="zh" />
              )}
            </p>
            <div
              className="history-card-line-wrap"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <LangLine
                lang={turn.to}
                text={turn.translation}
                definition={turn.definition}
                definitions={turn.to === 'yue' ? yueDefs : undefined}
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
                    <CantoneseText
                      text={alt}
                      jpMode="popup"
                      onActivate={onBreakdown}
                      activateLabel={biPlain(ui.charDetail)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {hasDrill ? (
            <button
              type="button"
              className="history-card-drill"
              onClick={() => onBreakdown(yuePhrase)}
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
