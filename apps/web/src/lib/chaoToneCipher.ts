import type { JyutTone } from './jyutping'

/**
 * Layer 1 — opaque tone → codepoint packing (no Chao literals in this file).
 * Casual View Source / search-for-˥ will not find the glyphs here.
 * Dedicated reverse-engineering can still recover them — that is expected.
 */
const KEY = 0x5a3c

/** XOR-packed Chao tone letter codepoints (LSHK §4), keyed by Jyutping tone digit. */
const PACKED: Record<JyutTone, number[]> = {
  '1': [0x02e5 ^ KEY],
  '2': [0x02e7 ^ KEY, 0x02e5 ^ KEY],
  '3': [0x02e7 ^ KEY],
  '4': [0x02e8 ^ KEY, 0x02e9 ^ KEY],
  '5': [0x02e9 ^ KEY, 0x02e7 ^ KEY],
  '6': [0x02e8 ^ KEY],
}

/** Decode a tone digit into Chao tone letter string (for paint / clipboard helpers). */
export function decodeChaoToneGlyph(tone: JyutTone): string {
  return String.fromCodePoint(...PACKED[tone].map((n) => n ^ KEY))
}
