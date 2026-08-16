export type DetailLayer =
  | {
      kind: 'phrase'
      /** Cantonese (or source) phrase under study. */
      phrase: string
      translation?: string
      definition?: string
      /** Multiple English senses listed in the details pane / drawer. */
      definitions?: string[]
      /** Other Cantonese renderings when known. */
      alternatives?: string[]
    }
  | {
      kind: 'char'
      char: string
      jp: string | null
      phrase: string
      definition?: string
      /** Sense for this character when known. */
      sense?: string
    }

export function detailTitle(layer: DetailLayer): string {
  if (layer.kind === 'phrase') return layer.phrase
  return layer.char
}
