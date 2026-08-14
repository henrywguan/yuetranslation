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
}

/** English above Chinese; Jyutping on hover / focus / tap. */
export function BiText({
  copy,
  size = 'md',
  className = '',
  as: Tag = 'span',
  hideJp = false,
}: BiTextProps) {
  const canJp = !hideJp && Boolean(copy.jp)
  const { tipId, show, bind } = useJpPopup(canJp)

  return (
    <Tag className={`bi bi--${size} ${className}`.trim()}>
      <span className="bi-en">{copy.en}</span>
      <span
        {...bind}
        className={`bi-zh-wrap${canJp ? ' bi-zh-wrap--hint' : ''}`}
        lang="zh-HK"
      >
        <span className="bi-zh">{copy.zh}</span>
        {canJp ? <JpPop show={show} id={tipId} text={copy.jp} /> : null}
      </span>
    </Tag>
  )
}
