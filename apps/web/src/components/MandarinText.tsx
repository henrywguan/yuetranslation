import { useEffect, useState, type ReactNode } from 'react'
import {
  ensurePinyinSegs,
  hasHan,
  toPinyinCached,
  type PinyinSeg,
} from '../lib/pinyin'
import { PinyinRuby } from './PinyinRuby'

/** Mandarin line: ruby pinyin (tone marks) above Han. */
export function MandarinText({
  text,
  definitions,
  className,
  placeholder,
  onActivate,
  activateLabel,
}: {
  text: string
  definition?: string
  definitions?: string[]
  className?: string
  placeholder?: ReactNode
  onActivate?: (text: string) => void
  activateLabel?: string
}) {
  const trimmed = text.trim()
  const [py, setPy] = useState(() => toPinyinCached(trimmed))
  const [segs, setSegs] = useState<PinyinSeg[]>([])
  const multiDefs = (definitions || []).map((d) => d.trim()).filter(Boolean)
  const hasMultiDef = multiDefs.length > 1

  useEffect(() => {
    let cancelled = false
    if (!trimmed || !hasHan(trimmed)) {
      setPy('')
      setSegs([])
      return
    }
    const cached = toPinyinCached(trimmed)
    if (cached) setPy(cached)
    void ensurePinyinSegs(trimmed).then((nextSegs) => {
      if (cancelled) return
      setSegs(nextSegs)
      setPy(toPinyinCached(trimmed))
    })
    return () => {
      cancelled = true
    }
  }, [trimmed])

  if (!trimmed) return placeholder ? <>{placeholder}</> : null

  const phraseActivate = Boolean(onActivate)
  const hanClass = [className || '', hasMultiDef ? 'cantonese-multi-def' : '']
    .filter(Boolean)
    .join(' ')

  const inlineHan =
    py || segs.length ? (
      <span className={hanClass || undefined}>
        <PinyinRuby
          han={trimmed}
          segs={segs}
          size="lg"
          className="jyut-ruby--hint"
        />
      </span>
    ) : (
      <span className={hanClass || undefined} lang="zh-CN">
        {trimmed}
      </span>
    )

  const body = (
    <span
      className={`cantonese-block${hasMultiDef ? ' cantonese-block--multi-def' : ''}${py || segs.length ? ' cantonese-block--ruby' : ''}`}
    >
      {inlineHan}
    </span>
  )

  if (!phraseActivate) return body

  return (
    <button
      type="button"
      className={`cantonese-activate${hasMultiDef ? ' cantonese-activate--multi-def' : ''}`}
      onClick={() => onActivate?.(trimmed)}
      aria-label={
        activateLabel ||
        (hasMultiDef
          ? `Open definitions for ${trimmed}`
          : `Open character breakdown for ${trimmed}`)
      }
    >
      {body}
    </button>
  )
}
