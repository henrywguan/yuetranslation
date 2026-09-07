import { useEffect } from 'react'

const SITE = 'https://www.jyuttranslate.com'
const DEFAULT_TITLE = 'JyutTranslate — English ↔ Cantonese'
const DEFAULT_DESC =
  'Live English ↔ Cantonese translator with jyutping, voice, camera OCR, and document translation.'

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = content
}

/**
 * Per-route document title + description (and keeps OG/Twitter in sync when provided).
 */
export function useDocumentMeta(opts: {
  title?: string
  description?: string
  path?: string
}) {
  const title = opts.title?.trim() || DEFAULT_TITLE
  const description = opts.description?.trim() || DEFAULT_DESC
  const path = opts.path || '/'

  useEffect(() => {
    const prevTitle = document.title
    document.title = title
    upsertMeta('name', 'description', description)
    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', `${SITE}${path === '/' ? '/' : path}`)
    upsertMeta('name', 'twitter:title', title)
    upsertMeta('name', 'twitter:description', description)
    return () => {
      document.title = prevTitle
    }
  }, [title, description, path])
}

export const documentMetaDefaults = {
  site: SITE,
  title: DEFAULT_TITLE,
  description: DEFAULT_DESC,
}
