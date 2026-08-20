import { useEffect, useState, type ReactNode } from 'react'
import { ensureJyutpingSegs, hasHan, rubyJpSyllable, type JyutSeg } from '../lib/jyutping'

type JyutRubyProps = {
  han: string
  segs?: JyutSeg[]
  size?: 'md' | 'lg'
  className?: string
  /** Popup tips reuse the same cell markup with `.jp-pop-*` classes. */
  variant?: 'inline' | 'pop'
  renderChar?: (seg: JyutSeg, index: number) => ReactNode
}

/** YuetYam-style ruby: compact Jyutping (digit + tone mark) above each Han character. */
export function JyutRuby({
  han,
  segs: segsProp,
  size = 'md',
  className = '',
  variant = 'inline',
  renderChar,
}: JyutRubyProps) {
  const phrase = han.trim()
  const [segs, setSegs] = useState<JyutSeg[]>(segsProp || [])
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
    void ensureJyutpingSegs(phrase).then((next) => {
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
        lang="zh-HK"
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
            {seg.jp ? rubyJpSyllable(seg.jp) : '\u00a0'}
          </span>
          <span className={hanClass} lang="zh-HK">
            {renderChar ? renderChar(seg, i) : seg.char}
          </span>
        </span>
      ))}
    </span>
  )
}

/** Single syllable with tone digit + Chao letter (compact metadata rows). */
export function JyutSyllable({ jp, className = '' }: { jp: string; className?: string }) {
  return (
    <span className={`jyut-syllable ${className}`.trim()} lang="en">
      {rubyJpSyllable(jp)}
    </span>
  )
}
