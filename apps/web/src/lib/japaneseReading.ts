/**
 * Optional Japanese reading help for Details.
 * Compact Solo / Conversation lines stay Japanese orthography only — no romaji dump.
 *
 * Strategy:
 * 1. Exact phrase map for common seeds (Hepburn).
 * 2. Else Hepburn from kana-only strings.
 * 3. Mixed kanji + kana without a known phrase → null (needs a morphological reader).
 */

const PHRASE_ROMAJI: Record<string, string> = {
  こんにちは: 'konnichiwa',
  こんばんは: 'konbanwa',
  おはよう: 'ohayou',
  おはようございます: 'ohayou gozaimasu',
  ありがとう: 'arigatou',
  ありがとうございます: 'arigatou gozaimasu',
  すみません: 'sumimasen',
  ごめんなさい: 'gomen nasai',
  はい: 'hai',
  いいえ: 'iie',
  さようなら: 'sayounara',
  じゃあね: 'jaa ne',
  お願いします: 'onegaishimasu',
  お願い: 'onegai',
  どうぞ: 'douzo',
  大丈夫: 'daijoubu',
  わかりました: 'wakarimashita',
  分かりました: 'wakarimashita',
  はじめまして: 'hajimemashite',
  よろしく: 'yoroshiku',
  よろしくお願いします: 'yoroshiku onegaishimasu',
}

/** Digraphs / special mora before single-kana map (longest match). */
const DIGRAPHS: Array<[string, string]> = [
  ['きゃ', 'kya'],
  ['きゅ', 'kyu'],
  ['きょ', 'kyo'],
  ['しゃ', 'sha'],
  ['しゅ', 'shu'],
  ['しょ', 'sho'],
  ['ちゃ', 'cha'],
  ['ちゅ', 'chu'],
  ['ちょ', 'cho'],
  ['にゃ', 'nya'],
  ['にゅ', 'nyu'],
  ['にょ', 'nyo'],
  ['ひゃ', 'hya'],
  ['ひゅ', 'hyu'],
  ['ひょ', 'hyo'],
  ['みゃ', 'mya'],
  ['みゅ', 'myu'],
  ['みょ', 'myo'],
  ['りゃ', 'rya'],
  ['りゅ', 'ryu'],
  ['りょ', 'ryo'],
  ['ぎゃ', 'gya'],
  ['ぎゅ', 'gyu'],
  ['ぎょ', 'gyo'],
  ['じゃ', 'ja'],
  ['じゅ', 'ju'],
  ['じょ', 'jo'],
  ['びゃ', 'bya'],
  ['びゅ', 'byu'],
  ['びょ', 'byo'],
  ['ぴゃ', 'pya'],
  ['ぴゅ', 'pyu'],
  ['ぴょ', 'pyo'],
]

const HIRA: Record<string, string> = {
  あ: 'a',
  い: 'i',
  う: 'u',
  え: 'e',
  お: 'o',
  か: 'ka',
  き: 'ki',
  く: 'ku',
  け: 'ke',
  こ: 'ko',
  さ: 'sa',
  し: 'shi',
  す: 'su',
  せ: 'se',
  そ: 'so',
  た: 'ta',
  ち: 'chi',
  つ: 'tsu',
  て: 'te',
  と: 'to',
  な: 'na',
  に: 'ni',
  ぬ: 'nu',
  ね: 'ne',
  の: 'no',
  は: 'ha',
  ひ: 'hi',
  ふ: 'fu',
  へ: 'he',
  ほ: 'ho',
  ま: 'ma',
  み: 'mi',
  む: 'mu',
  め: 'me',
  も: 'mo',
  や: 'ya',
  ゆ: 'yu',
  よ: 'yo',
  ら: 'ra',
  り: 'ri',
  る: 'ru',
  れ: 're',
  ろ: 'ro',
  わ: 'wa',
  ゐ: 'wi',
  ゑ: 'we',
  を: 'o',
  ん: 'n',
  が: 'ga',
  ぎ: 'gi',
  ぐ: 'gu',
  げ: 'ge',
  ご: 'go',
  ざ: 'za',
  じ: 'ji',
  ず: 'zu',
  ぜ: 'ze',
  ぞ: 'zo',
  だ: 'da',
  ぢ: 'ji',
  づ: 'zu',
  で: 'de',
  ど: 'do',
  ば: 'ba',
  び: 'bi',
  ぶ: 'bu',
  べ: 'be',
  ぼ: 'bo',
  ぱ: 'pa',
  ぴ: 'pi',
  ぷ: 'pu',
  ぺ: 'pe',
  ぽ: 'po',
  ぁ: 'a',
  ぃ: 'i',
  ぅ: 'u',
  ぇ: 'e',
  ぉ: 'o',
  ゃ: 'ya',
  ゅ: 'yu',
  ょ: 'yo',
  っ: '',
  ー: '',
}

function kataToHiraChar(ch: string): string {
  const code = ch.codePointAt(0)
  if (code == null) return ch
  if (code >= 0x30a1 && code <= 0x30f6) return String.fromCodePoint(code - 0x60)
  return ch
}

function toHiragana(s: string): string {
  let out = ''
  for (const ch of s) out += kataToHiraChar(ch)
  return out
}

const KANA_OR_PUNCT = /^[\u3040-\u309F\u30A0-\u30FF\s\-・、。．.!?,，]+$/u

/** Hepburn romanization for a hiragana/katakana string (no kanji). */
export function kanaToRomaji(input: string): string | null {
  const raw = input.trim()
  if (!raw || !KANA_OR_PUNCT.test(raw)) return null
  const s = toHiragana(raw)
  let i = 0
  let out = ''
  while (i < s.length) {
    const ch = s[i]!
    if (/[\s\-・、。．.!?,，]/u.test(ch)) {
      if (ch === '・' || ch === '、' || ch === '，') out += ' '
      else if (ch === '。' || ch === '．') out += '.'
      else out += ch
      i += 1
      continue
    }
    if (ch === 'っ' && i + 1 < s.length) {
      let nextRomaji = ''
      for (const [dig, rom] of DIGRAPHS) {
        if (s.startsWith(dig, i + 1)) {
          nextRomaji = rom
          break
        }
      }
      if (!nextRomaji) nextRomaji = HIRA[s[i + 1]!] || ''
      const cons = nextRomaji.match(/^[bcdfghjklmnpqrstvwxyz]/i)?.[0]
      if (cons) out += cons
      i += 1
      continue
    }
    if (ch === 'ー' && out.length) {
      const last = out[out.length - 1]!
      if ('aeiou'.includes(last)) out += last
      i += 1
      continue
    }
    let matched = false
    for (const [dig, rom] of DIGRAPHS) {
      if (s.startsWith(dig, i)) {
        out += rom
        i += dig.length
        matched = true
        break
      }
    }
    if (matched) continue
    const rom = HIRA[ch]
    if (rom == null) return null
    if (ch === 'ん' && i + 1 < s.length) {
      const peek = HIRA[s[i + 1]!] || ''
      if (/^[bmp]/i.test(peek)) {
        out += 'm'
        i += 1
        continue
      }
    }
    // Particle readings: word-final は→wa, へ→e (へよ etc. keep mid-word ha/he).
    const atEnd =
      i === s.length - 1 || (i + 1 < s.length && /[\s。．.!?,，、]/u.test(s[i + 1]!))
    if (atEnd && ch === 'は') {
      out += 'wa'
      i += 1
      continue
    }
    if (atEnd && ch === 'へ') {
      out += 'e'
      i += 1
      continue
    }
    out += rom
    i += 1
  }
  const cleaned = out.replace(/\s+/g, ' ').trim()
  return cleaned || null
}

function hasKanji(s: string): boolean {
  return /[\u3400-\u9FFF\uF900-\uFAFF]/.test(s)
}

function hasKana(s: string): boolean {
  return /[\u3040-\u309F\u30A0-\u30FF]/.test(s)
}

/**
 * Details reading hint (Hepburn). Null when we cannot help without a kanji dictionary.
 * Never used on compact Solo / Conversation lines.
 */
export function detailReadingJapanese(text: string): string | null {
  const t = text.trim()
  if (!t) return null
  const mapped = PHRASE_ROMAJI[t]
  if (mapped) return mapped
  if (!hasKana(t) && !hasKanji(t)) return null
  if (hasKanji(t)) return null
  return kanaToRomaji(t)
}
