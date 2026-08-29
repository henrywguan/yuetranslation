/**
 * Document translation entry — Office/TXT layout-keep; batch text for PDF hybrid.
 */
import { z } from 'zod'
import {
  decodeDataUrlOrBase64,
  extOf,
  toBase64,
  translateSegments,
  type DocLang,
} from './shared.js'
import { translateTxtFile } from './txtEngine.js'
import { translateDocx, translatePptx, translateXlsx } from './ooxmlEngine.js'
import { estimateDocPages } from './pages.js'

const Lang = z.enum(['en', 'yue'])

const FileBody = z.object({
  filename: z.string().min(1).max(240),
  /** data URL or raw base64 */
  data: z.string().min(8).max(14_000_000),
  from: Lang.default('en'),
  to: Lang.default('yue'),
})

const BatchBody = z.object({
  segments: z.array(z.string().max(4000)).min(1).max(400),
  from: Lang.default('en'),
  to: Lang.default('yue'),
})

const MAX_BYTES = 8 * 1024 * 1024

export type DocTranslateResult = {
  filename: string
  mime: string
  dataBase64: string
  engine: 'txt' | 'docx' | 'pptx' | 'xlsx'
  segments: number
  /** Billable pages (estimated for Office/TXT). */
  pages: number
}

function mimeFor(ext: string): string {
  switch (ext) {
    case 'txt':
      return 'text/plain; charset=utf-8'
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    default:
      return 'application/octet-stream'
  }
}

function outName(filename: string, to: DocLang): string {
  const ext = extOf(filename)
  const base = filename.replace(/\.[^.]+$/, '') || 'document'
  return `${base}.${to}.${ext || 'txt'}`
}

export async function translateDocumentFile(input: unknown): Promise<DocTranslateResult> {
  const parsed = FileBody.parse(input)
  if (parsed.from === parsed.to) {
    throw new Error('Choose different source and target languages.')
  }
  const buf = decodeDataUrlOrBase64(parsed.data)
  if (buf.byteLength > MAX_BYTES) {
    throw new Error('File too large (max 8 MB).')
  }
  const ext = extOf(parsed.filename)
  let out: Buffer
  let engine: DocTranslateResult['engine']
  let segments = 0
  const pages = await estimateDocPages(ext || 'txt', buf)

  if (ext === 'txt' || ext === 'md' || ext === 'csv') {
    out = await translateTxtFile(buf, parsed.from, parsed.to)
    engine = 'txt'
    segments = Math.max(1, out.toString('utf8').split(/\n\s*\n/).length)
  } else if (ext === 'docx') {
    out = await translateDocx(buf, parsed.from, parsed.to)
    engine = 'docx'
    segments = 1
  } else if (ext === 'pptx') {
    out = await translatePptx(buf, parsed.from, parsed.to)
    engine = 'pptx'
    segments = 1
  } else if (ext === 'xlsx') {
    out = await translateXlsx(buf, parsed.from, parsed.to)
    engine = 'xlsx'
    segments = 1
  } else if (ext === 'pdf') {
    throw new Error(
      'PDF uses the hybrid client path (layout render + text/vision). Send pages from the Documents UI.',
    )
  } else {
    throw new Error('Unsupported type. Use PDF, DOCX, PPTX, XLSX, or TXT.')
  }

  return {
    filename: outName(parsed.filename, parsed.to),
    mime: mimeFor(engine === 'txt' ? ext || 'txt' : engine),
    dataBase64: toBase64(out),
    engine,
    segments,
    pages,
  }
}

/** Peek billable pages before running a translate (quota pre-check). */
export async function peekDocPages(input: unknown): Promise<{ pages: number; ext: string }> {
  const parsed = FileBody.parse(input)
  const buf = decodeDataUrlOrBase64(parsed.data)
  if (buf.byteLength > MAX_BYTES) {
    throw new Error('File too large (max 8 MB).')
  }
  const ext = extOf(parsed.filename) || 'txt'
  if (ext === 'pdf') {
    throw new Error('PDF page count comes from the client after a successful hybrid job.')
  }
  return { pages: await estimateDocPages(ext, buf), ext }
}

export async function translateDocSegments(input: unknown): Promise<{
  translations: string[]
  from: DocLang
  to: DocLang
}> {
  const parsed = BatchBody.parse(input)
  if (parsed.from === parsed.to) {
    return { translations: parsed.segments, from: parsed.from, to: parsed.to }
  }
  const translations = await translateSegments(parsed.segments, parsed.from, parsed.to, 3)
  return { translations, from: parsed.from, to: parsed.to }
}
