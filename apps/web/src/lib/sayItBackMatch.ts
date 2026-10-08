/** Loose Han comparison for "Say it back" pronunciation practice (no paid APIs). */

function hanOnly(text: string): string {
  return [...text.normalize('NFKC')]
    .filter((ch) => /[\p{Script=Han}]/u.test(ch))
    .join('')
}

function lcsLength(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0
  const prev = new Array<number>(b.length + 1).fill(0)
  for (let i = 1; i <= a.length; i += 1) {
    let diag = 0
    for (let j = 1; j <= b.length; j += 1) {
      const up = prev[j]
      prev[j] = a[i - 1] === b[j - 1] ? diag + 1 : Math.max(prev[j], prev[j - 1])
      diag = up
    }
  }
  return prev[b.length]
}

/** 0–1 overlap of Han characters (order-aware, punctuation ignored). */
export function sayItBackScore(expected: string, heard: string): number {
  const a = [...hanOnly(expected)]
  const b = [...hanOnly(heard)]
  if (!a.length || !b.length) return 0
  return lcsLength(a, b) / Math.max(a.length, b.length)
}

export function sayItBackMatches(expected: string, heard: string, threshold = 0.75): boolean {
  return sayItBackScore(expected, heard) >= threshold
}
