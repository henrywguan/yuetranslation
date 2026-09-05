import { useEffect, useState, type ReactNode } from 'react'
import { ensurePinyinSegs, hasHan, type PinyinSeg } from '../lib/pinyin'

type PinyinRubyProps = {
  han: string
  segs?: PinyinSeg[]
  size?: 'md' | 'lg'
  className?: string
  variant?: 'inline' | 'pop'
  renderChar?: (seg: PinyinSeg, index: number) => ReactNode
}

/** Pinyin ruby with tone marks above each Han character (reuses jyut-ruby CSS). */
export function PinyinRuby({
  han,
  segs: segsProp,
  size = 'md',
  className = '',
  variant = 'inline',
  renderChar,
}: PinyinRubyProps) {
  const phrase = han.trim()
  const [segs, setSegs] = useState<PinyinSeg[]>(segsProp || [])
  const pop = variant === 'pop'
  const rootClass = pop ? 'jp-pop-ruby' : 'jyut-ruby'
  const cellClass = pop ? 'jp-pop-cell' : 'jyut-ruby-cell'
  const sylClass = pop ? 'jp-pop-syl' : 'jyut-ruby-syl'
  const hanClass = pop ? 'jp-pop-han' : 'jyut-ruby-han'

  useEffect(() => {
    if (segsProp?.length) {
      setSegs(segsProp)
      return
    }
    if (!phrase || !hasHan(phrase)) {
      setSegs([])
      return
    }
    let cancelled = false
    void ensurePinyinSegs(phrase).then((next) => {
      if (!cancelled) setSegs(next)
    })
    return () => {
      cancelled = true
    }
  }, [phrase, segsProp])

  if (!phrase) return null

  if (!segs.length) {
    return (
      <span
        className={`${rootClass} ${rootClass}--${size}${className ? ` ${className}` : ''}`.trim()}
        lang="zh-CN"
      >
        {phrase}
      </span>
    )
  }

  return (
    <span
      className={`${rootClass} ${rootClass}--${size}${className ? ` ${className}` : ''}`.trim()}
    >
      {segs.map((seg, i) => (
        <span key={`${seg.char}-${i}`} className={cellClass}>
          <span className={sylClass} lang="en">
            {seg.py || '\u00a0'}
          </span>
          <span className={hanClass} lang="zh-CN">
            {renderChar ? renderChar(seg, i) : seg.char}
          </span>
        </span>
      ))}
    </span>
  )
}

/** Plain tone-mark pinyin syllable for details rows. */
export function PinyinSyllable({ py, className = '' }: { py: string; className?: string }) {
  return (
    <span className={`jyut-syllable ${className}`.trim()} lang="en">
      {py.trim() || '\u00a0'}
    </span>
  )
}
