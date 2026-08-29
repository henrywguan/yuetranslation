/**
 * OOXML layout-preserving translation for DOCX / PPTX / XLSX.
 * Translates paragraph-level text in place; leaves structure, images, charts.
 */
import JSZip from 'jszip'
import { translateSegments, type DocLang } from './shared.js'

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function encodeXmlText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function translateXmlByParagraphs(
  xml: string,
  paraTag: string,
  textTag: string,
  translations: string[],
): { xml: string; jobCount: number } {
  const paraRe = new RegExp(`<${paraTag}\\b[^>]*>[\\s\\S]*?<\\/${paraTag}>`, 'g')
  const textRe = new RegExp(`<${textTag}([^>]*)>([\\s\\S]*?)<\\/${textTag}>`, 'g')

  const sources: string[] = []
  xml.replace(paraRe, (para) => {
    const parts: string[] = []
    let m: RegExpExecArray | null
    textRe.lastIndex = 0
    while ((m = textRe.exec(para))) {
      parts.push(decodeXmlEntities(m[2] || ''))
    }
    const joined = parts.join('')
    if (joined.trim()) sources.push(joined)
    return para
  })

  // Caller supplies translations aligned to sources; if empty, just count.
  let si = 0
  const next = xml.replace(paraRe, (para) => {
    const parts: string[] = []
    let m: RegExpExecArray | null
    textRe.lastIndex = 0
    while ((m = textRe.exec(para))) {
      parts.push(decodeXmlEntities(m[2] || ''))
    }
    const joined = parts.join('')
    if (!joined.trim()) return para
    const translated = translations[si] ?? joined
    si++
    let first = true
    return para.replace(textRe, (_all, attrs: string) => {
      if (first) {
        first = false
        const needSpace = /^\s|\s$/.test(translated) || /xml:space=/.test(attrs)
        const a =
          needSpace && !/xml:space=/.test(attrs) ? `${attrs} xml:space="preserve"` : attrs
        return `<${textTag}${a}>${encodeXmlText(translated)}</${textTag}>`
      }
      return `<${textTag}${attrs}></${textTag}>`
    })
  })

  return { xml: next, jobCount: sources.length }
}

function collectSources(xml: string, paraTag: string, textTag: string): string[] {
  const paraRe = new RegExp(`<${paraTag}\\b[^>]*>[\\s\\S]*?<\\/${paraTag}>`, 'g')
  const textRe = new RegExp(`<${textTag}([^>]*)>([\\s\\S]*?)<\\/${textTag}>`, 'g')
  const sources: string[] = []
  xml.replace(paraRe, (para) => {
    const parts: string[] = []
    let m: RegExpExecArray | null
    textRe.lastIndex = 0
    while ((m = textRe.exec(para))) {
      parts.push(decodeXmlEntities(m[2] || ''))
    }
    const joined = parts.join('')
    if (joined.trim()) sources.push(joined)
    return para
  })
  return sources
}

async function translateZipXmlFiles(
  zip: JSZip,
  paths: string[],
  paraTag: string,
  textTag: string,
  from: DocLang,
  to: DocLang,
): Promise<number> {
  let total = 0
  for (const path of paths) {
    const file = zip.file(path)
    if (!file) continue
    const xml = await file.async('string')
    const sources = collectSources(xml, paraTag, textTag)
    if (!sources.length) continue
    const translations = await translateSegments(sources, from, to)
    const { xml: next, jobCount } = translateXmlByParagraphs(xml, paraTag, textTag, translations)
    zip.file(path, next)
    total += jobCount
  }
  return total
}

function listPaths(zip: JSZip, pred: (name: string) => boolean): string[] {
  return Object.keys(zip.files).filter((n) => !zip.files[n]?.dir && pred(n))
}

export async function translateDocx(input: Buffer, from: DocLang, to: DocLang): Promise<Buffer> {
  const zip = await JSZip.loadAsync(input)
  const paths = listPaths(
    zip,
    (n) =>
      n === 'word/document.xml' ||
      /^word\/header\d*\.xml$/i.test(n) ||
      /^word\/footer\d*\.xml$/i.test(n) ||
      n === 'word/footnotes.xml' ||
      n === 'word/endnotes.xml',
  )
  await translateZipXmlFiles(zip, paths, 'w:p', 'w:t', from, to)
  return Buffer.from(await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }))
}

export async function translatePptx(input: Buffer, from: DocLang, to: DocLang): Promise<Buffer> {
  const zip = await JSZip.loadAsync(input)
  const paths = listPaths(
    zip,
    (n) =>
      /^ppt\/slides\/slide\d+\.xml$/i.test(n) || /^ppt\/notesSlides\/notesSlide\d+\.xml$/i.test(n),
  )
  await translateZipXmlFiles(zip, paths, 'a:p', 'a:t', from, to)
  return Buffer.from(await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }))
}

export async function translateXlsx(input: Buffer, from: DocLang, to: DocLang): Promise<Buffer> {
  const zip = await JSZip.loadAsync(input)
  const ss = zip.file('xl/sharedStrings.xml')
  if (ss) {
    const original = await ss.async('string')
    const sources: string[] = []
    original.replace(/<si>[\s\S]*?<\/si>/g, (si) => {
      const parts: string[] = []
      si.replace(/<t([^>]*)>([\s\S]*?)<\/t>/g, (_a, _attrs, inner: string) => {
        parts.push(decodeXmlEntities(inner || ''))
        return ''
      })
      sources.push(parts.join(''))
      return si
    })
    const translations = await translateSegments(sources, from, to)
    let i = 0
    const next = original.replace(/<si>[\s\S]*?<\/si>/g, (si) => {
      const translated = translations[i] ?? sources[i] ?? ''
      i++
      let first = true
      return si.replace(/<t([^>]*)>([\s\S]*?)<\/t>/g, (_a, attrs: string) => {
        if (first) {
          first = false
          const needSpace = /^\s|\s$/.test(translated) || /xml:space=/.test(attrs)
          const a =
            needSpace && !/xml:space=/.test(attrs) ? `${attrs} xml:space="preserve"` : attrs
          return `<t${a}>${encodeXmlText(translated)}</t>`
        }
        return `<t${attrs}></t>`
      })
    })
    zip.file('xl/sharedStrings.xml', next)
  }
  return Buffer.from(await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }))
}
