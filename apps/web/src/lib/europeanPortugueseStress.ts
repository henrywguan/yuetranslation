/**
 * European Portuguese (pt-PT) stress helpers — lexical stress via orthographic accent.
 * Not a tone language. Portugal and Brazil share the stress-default rules, so the
 * syllable / class logic reuses `brazilianPortugueseStress`; Portugal-specific
 * spellings (género, António, facto) carry an acute where Brazil writes a circumflex,
 * which the shared STRESS_MARK already covers. Never maps `ptpt` onto `pt`.
 */
import {
  brazilianStressChipShort,
  brazilianStressClass,
  brazilianStressLabel,
  portugueseBareWord,
  portugueseSyllables,
  type BrazilianStressClass,
} from './brazilianPortugueseStress'

export type EuropeanStressClass = BrazilianStressClass

export { portugueseBareWord, portugueseSyllables }

export const EUROPEAN_PORTUGUESE_HONESTY_NOTE =
  'European Portuguese reduces or drops unstressed vowels (telefone ≈ “tlfon”), so speech sounds more clipped than the spelling. Stress follows the written accent; Portuguese is not tonal.'

export function europeanStressClass(word: string): EuropeanStressClass | null {
  return brazilianStressClass(word)
}

export function europeanStressLabel(kind: EuropeanStressClass): string {
  return brazilianStressLabel(kind)
}

export function europeanStressChipShort(kind: EuropeanStressClass): string {
  return brazilianStressChipShort(kind)
}

/** Per-word stress chips for Details (words without a letter are skipped). */
export function europeanStressChips(text: string): Array<{ w: string; kind: EuropeanStressClass }> {
  return text
    .split(/\s+/)
    .map((raw) => {
      const bare = portugueseBareWord(raw)
      const kind = bare ? europeanStressClass(bare) : null
      return bare && kind ? { w: bare, kind } : null
    })
    .filter((x): x is { w: string; kind: EuropeanStressClass } => Boolean(x))
}
