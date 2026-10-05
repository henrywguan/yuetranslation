/**
 * Pronunciation-based Revised Romanization (NIKL) for Korean Details.
 * Compact UI stays Hangul-only — this reading is Details secondary aid only.
 */

const CHO = [
  'ㄱ',
  'ㄲ',
  'ㄴ',
  'ㄷ',
  'ㄸ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅃ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅉ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
] as const

const JUNG = [
  'ㅏ',
  'ㅐ',
  'ㅑ',
  'ㅒ',
  'ㅓ',
  'ㅔ',
  'ㅕ',
  'ㅖ',
  'ㅗ',
  'ㅘ',
  'ㅙ',
  'ㅚ',
  'ㅛ',
  'ㅜ',
  'ㅝ',
  'ㅞ',
  'ㅟ',
  'ㅠ',
  'ㅡ',
  'ㅢ',
  'ㅣ',
] as const

const JONG = [
  '',
  'ㄱ',
  'ㄲ',
  'ㄳ',
  'ㄴ',
  'ㄵ',
  'ㄶ',
  'ㄷ',
  'ㄹ',
  'ㄺ',
  'ㄻ',
  'ㄼ',
  'ㄽ',
  'ㄾ',
  'ㄿ',
  'ㅀ',
  'ㅁ',
  'ㅂ',
  'ㅄ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
] as const

const VOWEL_RR: Record<(typeof JUNG)[number], string> = {
  ㅏ: 'a',
  ㅐ: 'ae',
  ㅑ: 'ya',
  ㅒ: 'yae',
  ㅓ: 'eo',
  ㅔ: 'e',
  ㅕ: 'yeo',
  ㅖ: 'ye',
  ㅗ: 'o',
  ㅘ: 'wa',
  ㅙ: 'wae',
  ㅚ: 'oe',
  ㅛ: 'yo',
  ㅜ: 'u',
  ㅝ: 'wo',
  ㅞ: 'we',
  ㅟ: 'wi',
  ㅠ: 'yu',
  ㅡ: 'eu',
  ㅢ: 'ui',
  ㅣ: 'i',
}

type Syl = { cho: number; jung: number; jong: number; raw: string }

function decomposeHangul(ch: string): Syl | null {
  const code = ch.codePointAt(0)
  if (code == null || code < 0xac00 || code > 0xd7a3) return null
  const s = code - 0xac00
  const jong = s % 28
  const jung = ((s - jong) / 28) % 21
  const cho = (((s - jong) / 28) - jung) / 21
  return { cho, jung, jong, raw: ch }
}

/** Surface coda letter after complex-jong simplification (before neutralization). */
function surfaceJong(jong: number): string {
  return JONG[jong] || ''
}

/** Neutralized coda for pause / before consonant (7-way). */
function neutralizeCoda(jongLetter: string): string {
  if (!jongLetter) return ''
  if ('ㄱㄲㅋㄳ'.includes(jongLetter) || jongLetter === 'ㄺ') return 'k'
  if (jongLetter === 'ㄴ' || jongLetter === 'ㄵ' || jongLetter === 'ㄶ') return 'n'
  if ('ㄷㅅㅆㅈㅊㅌㅎ'.includes(jongLetter)) return 't'
  if (jongLetter === 'ㄹ' || 'ㄼㄽㄾㅀ'.includes(jongLetter)) return 'l'
  if (jongLetter === 'ㅁ' || jongLetter === 'ㄻ') return 'm'
  if (jongLetter === 'ㅂ' || jongLetter === 'ㅍ' || jongLetter === 'ㅄ' || jongLetter === 'ㄿ') return 'p'
  if (jongLetter === 'ㅇ') return 'ng'
  // ㄺ before pause often k; already handled. Remaining clusters:
  if (jongLetter.startsWith('ㄹ')) return 'l'
  if (jongLetter.startsWith('ㄱ') || jongLetter.endsWith('ㄱ')) return 'k'
  return ''
}

function onsetRr(cho: number, afterCoda?: string): string {
  // Linking: previous coda moved into empty onset.
  if (afterCoda) return afterCoda
  const c = CHO[cho]
  if (c === 'ㅇ') return ''
  if (c === 'ㄱ') return 'g'
  if (c === 'ㄲ') return 'kk'
  if (c === 'ㄴ') return 'n'
  if (c === 'ㄷ') return 'd'
  if (c === 'ㄸ') return 'tt'
  if (c === 'ㄹ') return 'r'
  if (c === 'ㅁ') return 'm'
  if (c === 'ㅂ') return 'b'
  if (c === 'ㅃ') return 'pp'
  if (c === 'ㅅ') return 's'
  if (c === 'ㅆ') return 'ss'
  if (c === 'ㅈ') return 'j'
  if (c === 'ㅉ') return 'jj'
  if (c === 'ㅊ') return 'ch'
  if (c === 'ㅋ') return 'k'
  if (c === 'ㅌ') return 't'
  if (c === 'ㅍ') return 'p'
  if (c === 'ㅎ') return 'h'
  return ''
}

function linkedOnsetFromCoda(jongLetter: string): string {
  // When next onset is ㅇ, coda surfaces as onset (pronunciation).
  const map: Record<string, string> = {
    ㄱ: 'g',
    ㄲ: 'kk',
    ㄳ: 'g',
    ㄴ: 'n',
    ㄵ: 'j',
    ㄶ: 'n',
    ㄷ: 'd',
    ㄹ: 'r',
    ㄺ: 'g',
    ㄻ: 'm',
    ㄼ: 'b',
    ㄽ: 's',
    ㄾ: 't',
    ㄿ: 'p',
    ㅀ: 'r',
    ㅁ: 'm',
    ㅂ: 'b',
    ㅄ: 's',
    ㅅ: 's',
    ㅆ: 'ss',
    ㅇ: 'ng',
    ㅈ: 'j',
    ㅊ: 'ch',
    ㅋ: 'k',
    ㅌ: 't',
    ㅍ: 'p',
    ㅎ: 'h',
  }
  return map[jongLetter] || neutralizeCoda(jongLetter)
}

function tensifyOnset(cho: number): string | null {
  const c = CHO[cho]
  if (c === 'ㄱ') return 'kk'
  if (c === 'ㄷ') return 'tt'
  if (c === 'ㅂ') return 'pp'
  if (c === 'ㅅ') return 'ss'
  if (c === 'ㅈ') return 'jj'
  return null
}

function shouldTensify(prevJong: string, nextCho: number): boolean {
  if (!prevJong) return false
  const next = CHO[nextCho]
  if (!next || !'ㄱㄷㅂㅅㅈ'.includes(next)) return false
  // Common fortition environments: obstruent coda + lax stop/affricate/s.
  if ('ㄱㄲㅋㄳㄷㅅㅆㅈㅊㅌㅎㅂㅍㅄ'.includes(prevJong) || prevJong === 'ㄺ') return true
  // ㄹ + ㄷ etc. often tensifies in compounds; keep 학교-style via ㄱ coda.
  return false
}

function nasalizeCodaBeforeNasal(jongLetter: string, nextCho: number): string | null {
  const next = CHO[nextCho]
  if (next !== 'ㄴ' && next !== 'ㅁ') return null
  if ('ㄱㄲㅋㄳ'.includes(jongLetter) || jongLetter === 'ㄺ') return 'ng'
  if ('ㄷㅅㅆㅈㅊㅌㅎ'.includes(jongLetter)) return 'n'
  if ('ㅂㅍㅄㄿ'.includes(jongLetter)) return 'm'
  return null
}

function applyNextOnsetAdjustments(syls: Syl[]): string {
  // Re-walk to inject linked onsets / tensification into the next piece.
  const out: string[] = []
  for (let i = 0; i < syls.length; i++) {
    const cur = syls[i]!
    const next = syls[i + 1] || null
    const jung = JUNG[cur.jung]
    const vowel = VOWEL_RR[jung]
    const jongLetter = surfaceJong(cur.jong)

    let linkedForNext: string | null = null
    let coda = ''
    let onset = onsetRr(cur.cho)

    // If previous syllable linked into us, override onset.
    if (i > 0) {
      const prev = syls[i - 1]!
      const prevJong = surfaceJong(prev.jong)
      if (prevJong && CHO[cur.cho] === 'ㅇ') {
        onset = linkedOnsetFromCoda(prevJong)
      } else if (prevJong && shouldTensify(prevJong, cur.cho)) {
        const t = tensifyOnset(cur.cho)
        if (t) {
          onset = t
          // Coda is absorbed into the tensed onset (학교 [학꾜] → hakkyo).
          if (out.length) {
            const prevPiece = out[out.length - 1]!
            const stripped = prevPiece.replace(/(k|t|p|n|m|l|ng)$/u, '')
            if (stripped !== prevPiece) out[out.length - 1] = stripped
          }
        }
      } else if (prevJong === 'ㄹ' && CHO[cur.cho] === 'ㄹ') {
        onset = 'l'
      } else if (prevJong === 'ㄴ' && CHO[cur.cho] === 'ㄹ') {
        // ㄴ+ㄹ → ll
        onset = 'l'
        // previous coda should become l — patch previous piece if needed
        if (out.length) {
          const prevPiece = out[out.length - 1]!
          if (prevPiece.endsWith('n')) {
            out[out.length - 1] = prevPiece.slice(0, -1) + 'l'
          }
        }
      } else if (
        (surfaceJong(prev.jong) === 'ㄹ' || neutralizeCoda(surfaceJong(prev.jong)) === 'l') &&
        CHO[cur.cho] === 'ㄴ'
      ) {
        // ㄹ+ㄴ → ll
        onset = 'l'
        if (out.length) {
          const prevPiece = out[out.length - 1]!
          if (prevPiece.endsWith('l')) {
            /* keep */
          }
        }
      }
    }

    if (next) {
      const nextEmpty = CHO[next.cho] === 'ㅇ'
      if (jongLetter && nextEmpty) {
        linkedForNext = linkedOnsetFromCoda(jongLetter)
        coda = ''
      } else if (jongLetter) {
        const nasal = nasalizeCodaBeforeNasal(jongLetter, next.cho)
        if (nasal) coda = nasal
        else coda = neutralizeCoda(jongLetter)
      }
    } else if (jongLetter) {
      coda = neutralizeCoda(jongLetter)
    }

    void linkedForNext
    out.push(onset + vowel + coda)
  }
  return out.join('')
}

function romanizeHangulRun(run: string): string {
  const syls: Syl[] = []
  for (const ch of run) {
    const d = decomposeHangul(ch)
    if (!d) return run // mixed unexpected — leave as-is
    syls.push(d)
  }
  if (!syls.length) return run
  return applyNextOnsetAdjustments(syls)
}

/**
 * Pronunciation-based RR for a Korean phrase.
 * Returns null when the string has no Hangul (caller shows Hangul only).
 */
export function romanizeKorean(text: string): string | null {
  const trimmed = text.trim()
  if (!trimmed || !/[\uAC00-\uD7A3]/.test(trimmed)) return null

  let out = ''
  let buf = ''
  const flush = () => {
    if (buf) {
      out += romanizeHangulRun(buf)
      buf = ''
    }
  }
  for (const ch of trimmed) {
    if (/[\uAC00-\uD7A3]/.test(ch)) {
      buf += ch
    } else {
      flush()
      out += ch
    }
  }
  flush()
  return out.trim() || null
}
