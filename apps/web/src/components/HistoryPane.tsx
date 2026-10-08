import { useEffect, useState } from 'react'
import { HistoryCard } from './HistoryCard'
import { BiText } from './BiText'
import { PhrasebookPane } from './PhrasebookPane'
import { useYueStore } from '../lib/store'
import type { ConversationTurn } from '../lib/types'
import { biPlain, ui } from '../lib/uiCopy'

export function HistoryPane({
  turns,
  className = '',
  onOpenBreakdown,
}: {
  turns: ConversationTurn[]
  className?: string
  /** Optional hook when a breakdown opens (e.g. close mobile sheet). */
  onOpenBreakdown?: () => void
}) {
  const openBreakdown = useYueStore((s) => s.openBreakdown)
  const latestId = turns[0]?.id ?? null
  const [expandedId, setExpandedId] = useState<string | null>(latestId)
  const [tab, setTab] = useState<'history' | 'phrasebook'>('history')
  const phrasebookCount = useYueStore((s) => s.phrasebook.length)

  useEffect(() => {
    if (latestId) setExpandedId(latestId)
  }, [latestId])

  const handleBreakdown = (phrase: string, turn: ConversationTurn) => {
    const zhLang =
      turn.to === 'cmn' || turn.from === 'cmn'
        ? 'cmn'
        : turn.to === 'wuu' || turn.from === 'wuu'
          ? 'wuu'
          : turn.to === 'sichuan' || turn.from === 'sichuan'
            ? 'sichuan'
            : turn.to === 'tl' || turn.from === 'tl'
              ? 'tl'
              : turn.to === 'es' || turn.from === 'es'
                ? 'es'
                : turn.to === 'eses' || turn.from === 'eses'
                  ? 'eses'
                  : turn.to === 'vi' || turn.from === 'vi'
                    ? 'vi'
                    : turn.to === 'th' || turn.from === 'th'
                      ? 'th'
                      : turn.to === 'lo' || turn.from === 'lo'
                        ? 'lo'
                        : turn.to === 'ko' || turn.from === 'ko'
                          ? 'ko'
                        : 'yue'
    const canto =
      turn.to === 'yue' ||
      turn.to === 'cmn' ||
      turn.to === 'wuu' ||
      turn.to === 'sichuan' ||
      turn.to === 'tl' ||
      turn.to === 'es' ||
      turn.to === 'eses' ||
      turn.to === 'vi' ||
      turn.to === 'th' ||
      turn.to === 'lo' ||
      turn.to === 'ko'
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
            turn.from === 'lo' ||
            turn.from === 'ko'
          ? turn.source
          : phrase
    const english =
      turn.from === 'en' ? turn.source : turn.to === 'en' ? turn.translation : ''
    const tappedEn = Boolean(english && phrase.trim() === english.trim())
    if (tappedEn || (turn.to === 'en' && !canto.trim())) {
      openBreakdown((english || phrase).trim(), {
        lang: 'en',
        translation: canto.trim() || undefined,
        definition: turn.definition || undefined,
        definitions: turn.definitions,
        alternatives: turn.alternatives,
      })
    } else {
      openBreakdown(canto.trim() || phrase, {
        lang: zhLang,
        translation: english.trim() || undefined,
        definition: turn.definition || undefined,
        definitions: turn.definitions,
        alternatives: turn.alternatives,
        romanization:
          zhLang === 'wuu' || zhLang === 'sichuan' ? turn.romanization : undefined,
        sandhiHint: zhLang === 'wuu' ? turn.sandhiHint : undefined,
        ipa: zhLang === 'wuu' ? turn.ipa : undefined,
        alternativeRomanizations:
          zhLang === 'wuu' || zhLang === 'sichuan'
            ? turn.alternativeRomanizations
            : undefined,
      })
    }
    onOpenBreakdown?.()
  }

  const tabBar = (
    <div className="history-tabs" role="tablist" aria-label={biPlain(ui.historyTitle)}>
      <button
        type="button"
        role="tab"
        aria-selected={tab === 'history'}
        className={`history-tab${tab === 'history' ? ' is-active' : ''}`}
        onClick={() => setTab('history')}
      >
        <BiText copy={ui.historyTitle} size="sm" layout="inline" hideJp />
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === 'phrasebook'}
        className={`history-tab${tab === 'phrasebook' ? ' is-active' : ''}`}
        onClick={() => setTab('phrasebook')}
      >
        <BiText copy={ui.phrasebook} size="sm" layout="inline" hideJp />
        {phrasebookCount ? <span className="history-tab-count">{phrasebookCount}</span> : null}
      </button>
    </div>
  )

  if (tab === 'phrasebook') {
    return (
      <div className={`history-pane-shell ${className}`.trim()}>
        {tabBar}
        <PhrasebookPane onOpenBreakdown={onOpenBreakdown} />
      </div>
    )
  }

  if (!turns.length) {
    return (
      <div className={`history-pane-shell ${className}`.trim()}>
        {tabBar}
        <div className="history-pane history-pane--empty">
          <p className="history-empty">
            <BiText copy={ui.historyEmpty} size="sm" layout="inline" />
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`history-pane-shell ${className}`.trim()}>
      {tabBar}
      <div className="history-pane">
        <div className="history-card-list" role="list">
          {turns.map((turn, i) => (
            <div key={turn.id} role="listitem">
              <HistoryCard
                turn={turn}
                isLatest={i === 0}
                expanded={expandedId === turn.id}
                onToggle={() => setExpandedId((id) => (id === turn.id ? null : turn.id))}
                onBreakdown={(phrase) => handleBreakdown(phrase, turn)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
