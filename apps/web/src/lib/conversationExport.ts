/** Plain-text export of the current Conversation (face) panes for copy / share. */

import type { Lang } from './types'

const LANG_NAMES: Partial<Record<Lang, string>> = {
  en: 'English',
  yue: 'Cantonese',
  cmn: 'Mandarin',
  wuu: 'Shanghainese',
  sichuan: 'Sichuanese',
  tl: 'Tagalog',
  es: 'Spanish (MX)',
  eses: 'Spanish (ES)',
  vi: 'Vietnamese',
  th: 'Thai',
  lo: 'Lao',
  ko: 'Korean',
  ja: 'Japanese',
  id: 'Indonesian',
  ms: 'Malay',
  pt: 'Portuguese (BR)',
  fr: 'French',
  hi: 'Hindi',
  km: 'Khmer',
  my: 'Burmese',
  jv: 'Javanese',
  it: 'Italian',
  de: 'German',
  nl: 'Dutch',
  ceb: 'Cebuano',
  ilo: 'Ilocano',
  bcl: 'Bikol',
}

export function conversationLangName(lang: Lang): string {
  return LANG_NAMES[lang] || lang.toUpperCase()
}

export type ConversationExportFace = {
  enTranslation: string
  yueTranslation: string
  enInterim?: string
  yueInterim?: string
  romanization?: string
}

/**
 * Face panes hold one exchange: the "you" pane (`en*` fields) and the partner
 * pane (`yue*` fields). Export both finished lines; interim text is only used
 * when no translation has landed yet.
 */
export function formatConversationTranscript(opts: {
  face: ConversationExportFace
  youLang: Lang
  partnerLang: Lang
}): string {
  const { face, youLang, partnerLang } = opts
  const you = (face.enTranslation || face.enInterim || '').trim()
  const partner = (face.yueTranslation || face.yueInterim || '').trim()
  const lines: string[] = []
  if (partner) {
    lines.push(`${conversationLangName(partnerLang)}: ${partner}`)
    const rom = face.romanization?.trim()
    if (rom && (partnerLang === 'wuu' || partnerLang === 'sichuan')) lines.push(rom)
  }
  if (you) lines.push(`${conversationLangName(youLang)}: ${you}`)
  return lines.join('\n')
}
