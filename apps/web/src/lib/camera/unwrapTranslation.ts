/** Unwrap model JSON accidentally returned/stored as the visible translation. */

export function unwrapTranslationText(raw: string): string {
  let trimmed = raw.trim()
  if (!trimmed) return ''
  trimmed = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

  if (trimmed.startsWith('{') && /translation|text/i.test(trimmed)) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const parsed = JSON.parse(trimmed) as unknown
        if (typeof parsed === 'string') {
          trimmed = parsed.trim()
          continue
        }
        if (parsed && typeof parsed === 'object') {
          const obj = parsed as { translation?: unknown; text?: unknown }
          const t =
            (typeof obj.translation === 'string' && obj.translation.trim()) ||
            (typeof obj.text === 'string' && obj.text.trim()) ||
            ''
          if (t) return t
        }
        break
      } catch {
        break
      }
    }
    const m = trimmed.match(/"translation"\s*:\s*"((?:\\.|[^"\\])*)"/)
    if (m?.[1]) {
      try {
        return JSON.parse(`"${m[1]}"`) as string
      } catch {
        return m[1]
      }
    }
  }
  return trimmed
}
