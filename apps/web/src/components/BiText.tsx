import type { ElementType } from 'react'
import type { Bi } from '../lib/uiCopy'
import { useJpPopup } from '../lib/useJpPopup'
import { JpPop } from './JpPop'

type BiTextProps = {
  copy: Bi
  size?: 'sm' | 'md' | 'lg'
  className?: string
  as?: ElementType
  /** Skip Jyutping popup entirely */
  hideJp?: boolean
  /** Language-pure: English only, or Chinese (+ Jyutping) only. */
  only?: 'en' | 'zh'
  /**
   * `stack` (default): English above Chinese.
   * `inline`: English and Chinese on one line (panel chrome / compact labels).
   */
  layout?: 'stack' | 'inline'
}

/** Bilingual UI copy; Jyutping on hover / focus / tap for Chinese. */
export function BiText({
  copy,
  size = 'md',
  className = '',
  as: Tag = 'span',
  hideJp = false,
  only,
  layout = 'stack',
}: BiTextProps) {
  const canJp = !hideJp && only !== 'en' && Boolean(copy.jp)
  const { tipId, show, bind, wrapRef } = useJpPopup(canJp)
  const inline = layout === 'inline' && !only
  const zh = (
    <span
      {...bind}
      className={`bi-zh-wrap${canJp ? ' bi-zh-wrap--hint' : ''}`}
      lang="zh-HK"
    >
      <span className="bi-zh">{copy.zh}</span>
      {canJp ? (
        <JpPop show={show} id={tipId} text={copy.jp} han={copy.zh} anchorRef={wrapRef} />
      ) : null}
    </span>
  )

  return (
    <Tag
      className={`bi bi--${size}${only ? ` bi--${only}` : ''}${inline ? ' bi--inline' : ''} ${className}`.trim()}
    >
      {only === 'zh' ? zh : <span className="bi-en">{copy.en}</span>}
      {only ? null : zh}
    </Tag>
  )
}
