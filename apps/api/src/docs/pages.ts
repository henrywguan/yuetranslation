/**
 * Estimate billable document pages for metering (separate from camera).
 * PDF pages are counted exactly by the client after a successful hybrid job.
 */
import JSZip from 'jszip'

const CHARS_PER_PAGE = 1800

function pagesFromChars(chars: number): number {
  return Math.max(1, Math.ceil(Math.max(0, chars) / CHARS_PER_PAGE))
}

function stripXml(xml: string): string {
  return xml
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-zA-Z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function ooxmlTextChars(buf: Buffer, pathPrefix: string): Promise<number> {
  const zip = await JSZip.loadAsync(buf)
  let chars = 0
  const files = Object.keys(zip.files).filter(
    (p) => p.startsWith(pathPrefix) && p.endsWith('.xml') && !zip.files[p]?.dir,
  )
  for (const path of files) {
    const xml = await zip.files[path]!.async('string')
    chars += stripXml(xml).length
  }
  return chars
}

async function pptxSlideCount(buf: Buffer): Promise<number> {
  const zip = await JSZip.loadAsync(buf)
  const slides = Object.keys(zip.files).filter((p) =>
    /^ppt\/slides\/slide\d+\.xml$/i.test(p),
  )
  return Math.max(1, slides.length)
}

async function xlsxSheetCount(buf: Buffer): Promise<number> {
  const zip = await JSZip.loadAsync(buf)
  const sheets = Object.keys(zip.files).filter((p) =>
    /^xl\/worksheets\/sheet\d+\.xml$/i.test(p),
  )
  return Math.max(1, sheets.length)
}

/** Billable pages for Office / TXT (never PDF — client reports exact page count). */
export async function estimateDocPages(ext: string, buf: Buffer): Promise<number> {
  const e = ext.toLowerCase()
  if (e === 'txt' || e === 'md' || e === 'csv') {
    return pagesFromChars(buf.toString('utf8').length)
  }
  if (e === 'docx') {
    try {
      return pagesFromChars(await ooxmlTextChars(buf, 'word/'))
    } catch {
      return Math.max(1, Math.ceil(buf.byteLength / 40_000))
    }
  }
  if (e === 'pptx') {
    try {
      return await pptxSlideCount(buf)
    } catch {
      return Math.max(1, Math.ceil(buf.byteLength / 80_000))
    }
  }
  if (e === 'xlsx') {
    try {
      const sheets = await xlsxSheetCount(buf)
      const chars = await ooxmlTextChars(buf, 'xl/')
      return Math.max(sheets, pagesFromChars(chars))
    } catch {
      return Math.max(1, Math.ceil(buf.byteLength / 50_000))
    }
  }
  return 1
}
