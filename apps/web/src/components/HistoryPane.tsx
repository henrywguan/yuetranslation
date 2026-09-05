import { useEffect, useState } from 'react'
import { HistoryCard } from './HistoryCard'
import { BiText } from './BiText'
import { useYueStore } from '../lib/store'
import type { ConversationTurn } from '../lib/types'
import { ui } from '../lib/uiCopy'

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

  useEffect(() => {
    if (latestId) setExpandedId(latestId)
  }, [latestId])

  const handleBreakdown = (phrase: string, turn: ConversationTurn) => {
    const canto =
      turn.to === 'yue' ? turn.translation : turn.from === 'yue' ? turn.source : phrase
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
        lang: 'yue',
        translation: english.trim() || undefined,
        definition: turn.definition || undefined,
        definitions: turn.definitions,
        alternatives: turn.alternatives,
      })
    }
    onOpenBreakdown?.()
  }

  if (!turns.length) {
    return (
      <div className={`history-pane history-pane--empty ${className}`.trim()}>
        <p className="history-empty">
          <BiText copy={ui.historyEmpty} size="sm" layout="inline" />
        </p>
      </div>
    )
  }

  return (
    <div className={`history-pane ${className}`.trim()}>
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
  )
}
