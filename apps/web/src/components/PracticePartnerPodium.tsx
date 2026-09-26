import type { PracticePartnerLeaderboardEntry } from '../lib/api'

const MEDALS = [
  { rank: 1, metal: 'gold', label: 'Gold' },
  { rank: 2, metal: 'silver', label: 'Silver' },
  { rank: 3, metal: 'bronze', label: 'Bronze' },
] as const

/**
 * Global Practice Partner podium.
 * Rank 1 gold, rank 2 silver, rank 3 bronze — each medal and name animates.
 */
export function PracticePartnerPodium({
  entries,
  me,
  loading = false,
  error = '',
  signedIn = false,
  compact = false,
}: {
  entries: PracticePartnerLeaderboardEntry[]
  me?: PracticePartnerLeaderboardEntry | null
  loading?: boolean
  error?: string
  signedIn?: boolean
  compact?: boolean
}) {
  const byRank = new Map(entries.map((row) => [row.rank, row]))
  const rest = entries.filter((row) => row.rank > 3).slice(0, compact ? 0 : 7)
  const you = me && !entries.some((row) => row.userId === me.userId) ? me : null

  return (
    <section
      className={`partner-podium${compact ? ' is-compact' : ''}`}
      aria-label="Global Practice Partner leaderboard"
    >
      <header className="partner-podium-head">
        <p className="partner-podium-kicker">Global · 排行榜</p>
        {compact ? null : (
          <p className="partner-podium-sub">Ranked by XP, then best streak, then passes.</p>
        )}
      </header>

      {loading ? <p className="partner-podium-status">Loading ranks…</p> : null}
      {error ? <p className="partner-podium-status is-err">{error}</p> : null}

      <ol className="partner-podium-medals">
        {MEDALS.map((medal) => {
          const row = byRank.get(medal.rank)
          return (
            <li
              key={medal.metal}
              className={`partner-medal is-${medal.metal}${row?.isYou ? ' is-you' : ''}${
                row ? '' : ' is-open'
              }`}
              aria-label={
                row
                  ? `Rank ${medal.rank}, ${row.displayName}, ${row.xp} XP`
                  : `Rank ${medal.rank} open`
              }
            >
              <span className="partner-medal-disc" aria-hidden="true">
                <span className="partner-medal-rim" />
                <span className="partner-medal-face">{medal.rank}</span>
                <span className="partner-medal-ribbon" />
              </span>
              <span className="partner-medal-name">
                {row ? row.displayName : 'Open'}
                {row?.isYou ? <span className="partner-medal-you">you</span> : null}
              </span>
              <span className="partner-medal-meta">
                {row ? `${row.xp} XP` : medal.label}
              </span>
            </li>
          )
        })}
      </ol>

      {!compact && rest.length > 0 ? (
        <ol className="partner-podium-rest" start={4}>
          {rest.map((row) => (
            <li key={row.userId} className={row.isYou ? 'is-you' : undefined}>
              <span className="partner-podium-rest-rank">{row.rank}</span>
              <span className="partner-podium-rest-name">
                {row.displayName}
                {row.isYou ? <span className="partner-medal-you">you</span> : null}
              </span>
              <span className="partner-podium-rest-xp">{row.xp} XP</span>
            </li>
          ))}
        </ol>
      ) : null}

      {you ? (
        <p className="partner-podium-you">
          You · #{you.rank} · {you.displayName} · {you.xp} XP
        </p>
      ) : null}

      {!compact && !loading && !error && entries.length === 0 ? (
        <p className="partner-podium-status">
          {signedIn
            ? 'No names on the board yet. Clear a phrase to claim gold.'
            : 'No names on the board yet. Sign in and clear a phrase to claim gold.'}
        </p>
      ) : null}

      {!compact && !signedIn && !loading ? (
        <p className="partner-podium-hint">Sign in to put your name on the board.</p>
      ) : null}
    </section>
  )
}
