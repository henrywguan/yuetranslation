/**
 * Plain-text document translation.
 */
import { translateSegments, type DocLang } from './shared.js'

export async function translateTxtFile(
  input: Buffer,
  from: DocLang,
  to: DocLang,
): Promise<Buffer> {
  const text = input.toString('utf8')
  const parts = text.split(/(\n\s*\n)/)
  const toTranslate: { index: number; text: string }[] = []
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]!
    if (/^\n\s*\n$/.test(p)) continue
    if (p.trim()) toTranslate.push({ index: i, text: p })
  }
  const translated = await translateSegments(
    toTranslate.map((t) => t.text),
    from,
    to,
  )
  toTranslate.forEach((t, j) => {
    parts[t.index] = translated[j] ?? t.text
  })
  return Buffer.from(parts.join(''), 'utf8')
}
