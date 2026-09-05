import type { Entitlement } from './types'
import { getAccessToken } from './auth'
import { resolveApiBase } from './api'

export type DocLang = 'en' | 'yue' | 'cmn'

export type DocFileResult = {
  filename: string
  mime: string
  dataBase64: string
  engine: 'txt' | 'docx' | 'pptx' | 'xlsx'
  segments: number
  pages: number
  entitlement?: Entitlement
}

async function docsFetch(path: string, body: unknown) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = await getAccessToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${resolveApiBase()}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw Object.assign(new Error((data as { message?: string }).message || 'Document request failed'), {
      code: res.status,
      entitlement: (data as { entitlement?: Entitlement }).entitlement,
    })
  }
  return data
}

export async function translateDocumentFile(input: {
  filename: string
  data: string
  from: DocLang
  to: DocLang
}): Promise<DocFileResult> {
  return (await docsFetch('/docs/translate', input)) as DocFileResult
}

export async function translateDocSegments(input: {
  segments: string[]
  from: DocLang
  to: DocLang
}): Promise<{ translations: string[]; entitlement?: Entitlement }> {
  return (await docsFetch('/docs/segments', input)) as {
    translations: string[]
    entitlement?: Entitlement
  }
}

/** Bill PDF pages only after a successful hybrid job. */
export async function commitDocPages(pages: number): Promise<{
  ok: boolean
  pages: number
  entitlement?: Entitlement
}> {
  return (await docsFetch('/docs/commit', { pages })) as {
    ok: boolean
    pages: number
    entitlement?: Entitlement
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export function downloadBase64File(filename: string, mime: string, dataBase64: string) {
  const bin = atob(dataBase64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const blob = new Blob([bytes], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
