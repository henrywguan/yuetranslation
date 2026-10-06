/** Shared translate helpers for scaffold + future extract. */
export type TranslateStage = 'final' | 'interim'

export type TranslateResult = {
  text: string
  definition: string
  alternatives: string[]
  engine: string
  from: string
  to: string
  stage: TranslateStage
  meta: {
    dictionaryHit: boolean
    scrubbed: boolean
    colloquialScore: number
    rewritten: boolean
    notes: string[]
  }
  romanization?: string
  sandhiHint?: string
  ipa?: string
  alternativeRomanizations?: string[]
}

export function emptyMeta(notes: string[] = []) {
  return {
    dictionaryHit: false,
    scrubbed: false,
    colloquialScore: 0,
    rewritten: false,
    notes,
  }
}

export function parsePayload(
  raw: string,
  fallbackText: string,
  fallbackDefinition: string,
  _preferHan: boolean,
): { text: string; definition: string } {
  try {
    const j = JSON.parse(raw) as { translation?: string; definition?: string; primary?: string }
    const text = (j.translation || j.primary || '').trim() || fallbackText
    const definition = (j.definition || '').trim() || fallbackDefinition
    return { text, definition }
  } catch {
    return { text: fallbackText, definition: fallbackDefinition }
  }
}

export function parseYuePayload(
  raw: string,
  fallbackText: string,
  _preferHan: boolean,
): { text: string; alternatives: string[]; definition: string } {
  try {
    const j = JSON.parse(raw) as {
      primary?: string
      translation?: string
      alternatives?: string[]
      definition?: string
    }
    const text = (j.primary || j.translation || '').trim() || fallbackText
    const alternatives = Array.isArray(j.alternatives)
      ? j.alternatives.map((a) => String(a || '').trim()).filter(Boolean)
      : []
    return { text, alternatives, definition: (j.definition || '').trim() }
  } catch {
    return { text: fallbackText, alternatives: [], definition: '' }
  }
}
