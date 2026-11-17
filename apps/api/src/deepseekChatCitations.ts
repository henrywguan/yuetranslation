/**
 * Map DeepSeek Completions `url_citation` annotations onto answer text.
 * Indices are Unicode code points (DeepSeek docs); content itself has no markers.
 */

export type UrlCitationAnnotation = {
  url: string
  title?: string
  startIndex: number
  endIndex: number
}

export type InlineCitation = {
  url: string
  title: string
  startIndex: number
  endIndex: number
  /** 1-based marker index in the rewritten answer. */
  index: number
}

/** Normalize Completions annotation objects into typed citations. */
export function parseUrlCitationAnnotations(raw: unknown): UrlCitationAnnotation[] {
  if (!Array.isArray(raw)) return []
  const out: UrlCitationAnnotation[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const cite = (row.url_citation && typeof row.url_citation === 'object'
      ? (row.url_citation as Record<string, unknown>)
      : row) as Record<string, unknown>
    const url = typeof cite.url === 'string' ? cite.url.trim() : ''
    if (!/^https?:\/\//i.test(url)) continue
    const startIndex = Number(cite.start_index)
    const endIndex = Number(cite.end_index)
    if (!Number.isFinite(startIndex) || !Number.isFinite(endIndex)) continue
    if (endIndex < startIndex) continue
    const title =
      typeof cite.title === 'string' && cite.title.trim() && cite.title.trim() !== url
        ? cite.title.trim()
        : undefined
    out.push({ url, title, startIndex, endIndex })
  }
  return out
}

/**
 * Insert `[n]` chips after each cited span (working backwards so earlier
 * code-point indices stay valid). Dedupes by URL for the chip number.
 */
export function applyInlineCitationMarkers(
  content: string,
  annotations: UrlCitationAnnotation[],
  knownTitles?: Map<string, string>,
): { text: string; citations: InlineCitation[] } {
  if (!content || !annotations.length) {
    return { text: content, citations: [] }
  }

  const chars = Array.from(content)

  // Assign chip numbers in document order (first appearance by end index).
  const byDoc = annotations
    .slice()
    .sort((a, b) => a.endIndex - b.endIndex || a.startIndex - b.startIndex)
  const urlToIndex = new Map<string, number>()
  const citations: InlineCitation[] = []
  const placements: Array<{ end: number; index: number }> = []

  for (const ann of byDoc) {
    const start = Math.max(0, Math.min(chars.length, Math.floor(ann.startIndex)))
    const end = Math.max(start, Math.min(chars.length, Math.floor(ann.endIndex)))
    let index = urlToIndex.get(ann.url)
    if (index == null) {
      index = urlToIndex.size + 1
      urlToIndex.set(ann.url, index)
      citations.push({
        url: ann.url,
        title: ann.title || knownTitles?.get(ann.url) || ann.url,
        startIndex: start,
        endIndex: end,
        index,
      })
    }
    placements.push({ end, index })
  }

  // Insert markers from the end so earlier code-point indices stay stable.
  placements.sort((a, b) => b.end - a.end)
  for (const p of placements) {
    chars.splice(p.end, 0, ...Array.from(`[${p.index}]`))
  }

  citations.sort((a, b) => a.index - b.index)
  return { text: chars.join(''), citations }
}

/** Build ordered source list from inline citations (stable URL order). */
export function sourcesFromInlineCitations(
  citations: InlineCitation[],
): { url: string; title: string }[] {
  const out: { url: string; title: string }[] = []
  const seen = new Set<string>()
  for (const c of citations) {
    if (seen.has(c.url)) continue
    seen.add(c.url)
    out.push({ url: c.url, title: c.title || c.url })
  }
  return out
}
