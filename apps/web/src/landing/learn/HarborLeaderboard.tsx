import { useEffect, useState } from 'react'
import {
  fetchHarborQuestLeaderboard,
  type HarborLeaderboardEntry,
  type HarborLeaderboardPayload,
} from '../../lib/api'
import { getSession } from '../../lib/auth'

/** Global Harbor Quest ranks — Supabase-backed via `/api/harbor-quest/leaderboard`. */
export function HarborLeaderboard() {
  const [board, setBoard] = useState<HarborLeaderboardPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const session = await getSession()
        if (!cancelled) setSignedIn(Boolean(session))
        const data = await fetchHarborQuestLeaderboard(25)
        if (!cancelled) setBoard(data)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Leaderboard unavailable')
          setBoard(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="hq-board" aria-labelledby="hq-board-title">
      <header className="hq-board-head">
        <p className="hq-board-kicker">Global · 排行榜</p>
        <h2 id="hq-board-title" className="hq-board-title">
          Harbor leaderboard
        </h2>
        <p className="hq-board-sub">
          Ranked by XP, then gold, then correct casts, then piers. First clear = full XP; repeats =
          50%. Sign in to sync.
        </p>
      </header>

      {loading ? <p className="hq-board-status">Loading ranks…</p> : null}
      {error ? <p className="hq-board-status hq-board-status--err">{error}</p> : null}

      {!loading && !error && board && board.entries.length === 0 ? (
        <p className="hq-board-status">
          {signedIn
            ? 'No sailors on the board yet — clear a pier for XP or win arena gold to claim a spot.'
            : 'No sailors on the board yet. Sign in and play to appear here.'}
        </p>
      ) : null}

      {!loading && board && board.entries.length > 0 ? (
        <ol className="hq-board-list">
          {board.entries.map((row) => (
            <LeaderRow key={row.userId} row={row} />
          ))}
        </ol>
      ) : null}

      {board?.me && !board.entries.some((e) => e.userId === board.me!.userId) ? (
        <div className="hq-board-me" aria-label="Your rank">
          <p className="hq-board-me-label">Your standing</p>
          <ol className="hq-board-list hq-board-list--me">
            <LeaderRow row={board.me} />
          </ol>
        </div>
      ) : null}

      {!signedIn && !loading ? (
        <p className="hq-board-hint">Guests can browse the board; signed-in play syncs XP + gold to Supabase.</p>
      ) : null}
    </section>
  )
}

function LeaderRow({ row }: { row: HarborLeaderboardEntry }) {
  return (
    <li className={`hq-board-row${row.isYou ? ' is-you' : ''}${row.rank <= 3 ? ` is-top-${row.rank}` : ''}`}>
      <span className="hq-board-rank" aria-label={`Rank ${row.rank}`}>
        {row.rank}
      </span>
      <span className="hq-board-name">
        {row.displayName}
        {row.isYou ? <span className="hq-board-you">you</span> : null}
      </span>
      <span className="hq-board-stats">
        <span className="hq-board-xp" title="Experience">
          {row.xp} XP
        </span>
        <span className="hq-board-gold" title="Gold">
          <span aria-hidden="true">金</span> {row.gold}
        </span>
        <span className="hq-board-meta" title="Correct casts">
          {row.correctCount} hits
        </span>
        <span className="hq-board-meta" title="Piers cleared">
          {row.clearedCount} piers
        </span>
      </span>
    </li>
  )
}
