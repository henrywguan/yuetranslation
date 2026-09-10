/**
 * Dictionary license gate for non-commercial lexicons (e.g. words.hk).
 *
 * CC-Canto (CC-BY-SA) is always eligible.
 * words.hk Non-Commercial Open Data License is only loaded when
 * YUE_ALLOW_NONCOMMERCIAL_DICTS=1 AND YUE_ENABLE_WORDSHK=1.
 */
import { env } from '../env.js'

export function wordshkEnabled() {
  return env.enableWordshk && env.allowNoncommercialDicts
}

