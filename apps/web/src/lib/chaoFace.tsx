import { createElement, type ReactNode } from 'react'

/** Chao tone letters (Zhao Yuanren) — Spacing Modifier Letters U+02E5–U+02E9. */
const CHAO_RE = /([\u02E5-\u02E9]+)/g

/**
 * Wrap Chao tone letter runs in `.chao-face` so they paint with Noto Sans
 * (Noto Sans HK does not include these glyphs — they otherwise tofu / mis-fallback).
 * Chinese / other text is left unchanged for Noto Sans HK / body stack.
 */
export function withChaoFace(text: string): ReactNode {
  if (!text || !/[\u02E5-\u02E9]/.test(text)) return text
  const parts = text.split(CHAO_RE)
  return parts.map((part, i) => {
    if (!part) return null
    if (/^[\u02E5-\u02E9]+$/.test(part)) {
      return createElement(
        'span',
        { key: `chao-${i}`, className: 'chao-face', lang: 'und' },
        part,
      )
    }
    return part
  })
}
