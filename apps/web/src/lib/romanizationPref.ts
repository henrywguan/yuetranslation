/** Display romanization for Cantonese results: Jyutping (default) or Yale. */

export type CantoneseRomanization = 'jyutping' | 'yale'

const KEY = 'yue-canto-romanization-v1'

export function readLocalCantoneseRomanization(): CantoneseRomanization {
  if (typeof window === 'undefined') return 'jyutping'
  try {
    const v = window.localStorage.getItem(KEY)
    return v === 'yale' ? 'yale' : 'jyutping'
  } catch {
    return 'jyutping'
  }
}

export function writeLocalCantoneseRomanization(mode: CantoneseRomanization) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, mode)
  } catch {
    /* ignore */
  }
}
