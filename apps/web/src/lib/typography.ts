/** Curly/smart apostrophes used as ASCII apostrophes (U+2019, etc.). */
const SMART_APOSTROPHE_RE = /[\u2018\u2019\u201A\u201B\u2032\u02BC\uFF07]/g

/**
 * Use straight ASCII apostrophes in English UI copy.
 * Typographic quotes plus our body font stack can look like an extra space
 * before the next letter (e.g. "don' t", "Service' s").
 */
export function normalizeEnglishApostrophes(text: string): string {
  return text.replace(SMART_APOSTROPHE_RE, "'")
}
