import { useEffect, useState } from 'react'
import { CharacterBreakdownFrame } from './CharacterBreakdownFrame'
import { fetchBreakdown } from '../lib/api'
import { buildLocalBreakdown, type CharBreakdown } from '../lib/jyutping'
import { useYueStore } from '../lib/store'

function mergeMeanings(local: CharBreakdown[], remote: CharBreakdown[]): CharBreakdown[] {
  if (!remote.length) return local
  return local.map((row, i) => {
    const hit =
      remote[i]?.char === row.char
        ? remote[i]
        : remote.find((r) => r.char === row.char && r.meaning)
    if (!hit) return row
    return {
      char: row.char,
      jyutping: row.jyutping || hit.jyutping,
      meaning: hit.meaning?.trim() || row.meaning,
    }
  })
}

/** Global closable frame for the active Cantonese phrase breakdown. */
export function CharacterBreakdownHost() {
  const phrase = useYueStore((s) => s.breakdownPhrase)
  const closeBreakdown = useYueStore((s) => s.closeBreakdown)
  const [rows, setRows] = useState<CharBreakdown[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!phrase) {
      setRows([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setRows([])
    void (async () => {
      const local = await buildLocalBreakdown(phrase)
      if (cancelled) return
      setRows(local)
      try {
        const remote = await fetchBreakdown(phrase)
        if (cancelled) return
        setRows(mergeMeanings(local, remote.characters || []))
      } catch {
        // Local gloss / Jyutping is enough offline.
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [phrase])

  if (!phrase) return null

  return (
    <CharacterBreakdownFrame
      phrase={phrase}
      rows={rows}
      loading={loading}
      onClose={closeBreakdown}
    />
  )
}
