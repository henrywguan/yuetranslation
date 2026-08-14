/** Normalize English or short keys for phrase-memory lookup. */
export function normalizeLookupKey(text: string) {
  return text
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[’']/g, "'")
    .replace(/[?!.,;:。？！，、…]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function uniqStrings(primary: string, alts: string[], max = 3): string[] {
  const seen = new Set<string>([primary.trim()])
  const out: string[] = []
  for (const raw of alts) {
    const v = raw.trim()
    if (!v || seen.has(v)) continue
    seen.add(v)
    out.push(v)
    if (out.length >= max) break
  }
  return out
}
