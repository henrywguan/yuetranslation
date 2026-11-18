/** Shared address-chip shape + word matcher for Batch 2 family pedagogy helpers. */

export type AddressHit = {
  /** Stable CSS modifier (ASCII). */
  kind: string
  /** Native pronoun shown in the chip. */
  chip: string
  /** Chip tooltip, e.g. `Вы (formal / plural)`. */
  label: string
}

export type AddressRule = AddressHit & { forms: string[] }

/** Whole-word match that treats combining marks as part of the word (Indic / Hebrew / Arabic). */
export function wordRe(forms: string[], flags = 'u'): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{M}])(?:${forms.join('|')})(?![\\p{L}\\p{M}])`, flags)
}

/** First matching rule wins; two different matches report a combined `mixed` chip. */
export function detectAddress(
  text: string,
  rules: AddressRule[],
  opts: { caseInsensitive?: boolean; script?: RegExp } = {},
): AddressHit | null {
  const t = text.normalize('NFC').trim()
  if (!t) return null
  if (opts.script && !opts.script.test(t)) return null
  const flags = opts.caseInsensitive ? 'iu' : 'u'
  const hits = rules.filter((r) => wordRe(r.forms, flags).test(t))
  if (hits.length === 0) return null
  if (hits.length === 1) {
    const { kind, chip, label } = hits[0]!
    return { kind, chip, label }
  }
  return {
    kind: 'mixed',
    chip: hits.map((h) => h.chip).join(' / '),
    label: hits.map((h) => h.label).join(' + '),
  }
}
