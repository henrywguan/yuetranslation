import type { InboxFilter } from '../../../lib/chatInbox'

const TILES: Array<{ id: InboxFilter; label: string }> = [
  { id: 'all', label: 'All Agents' },
  { id: 'needs_attention', label: 'Needs Attention' },
  { id: 'working', label: 'Working' },
  { id: 'in_review', label: 'In Review' },
]

export function FilterTiles({
  filter,
  counts,
  onChange,
}: {
  filter: InboxFilter
  counts: Record<InboxFilter, number>
  onChange: (next: InboxFilter) => void
}) {
  return (
    <div className="inbox-tiles" role="group" aria-label="Agent filters">
      {TILES.map((tile) => {
        const active = filter === tile.id
        return (
          <button
            key={tile.id}
            type="button"
            className={`inbox-tile${active ? ' is-active' : ''}`}
            aria-pressed={active}
            onClick={() => onChange(tile.id)}
          >
            <span className="inbox-tile-label">{tile.label}</span>
            <span className="inbox-tile-count">{counts[tile.id]}</span>
          </button>
        )
      })}
    </div>
  )
}
