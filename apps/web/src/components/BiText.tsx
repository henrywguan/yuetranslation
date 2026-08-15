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
}

/** English above Chinese; Jyutping on hover / focus / tap. */
export function BiText({
  copy,
  size = 'md',
  className = '',
  as: Tag = 'span',
  hideJp = false,
  only,
}: BiTextProps) {
  const canJp = !hideJp && only !== 'en' && Boolean(copy.jp)
  const { tipId, show, bind } = useJpPopup(canJp)
  const zh = (
    <span
      {...bind}
      className={`bi-zh-wrap${canJp ? ' bi-zh-wrap--hint' : ''}`}
      lang="zh-HK"
    >
      <span className="bi-zh">{copy.zh}</span>
      {canJp ? <JpPop show={show} id={tipId} text={copy.jp} han={copy.zh} /> : null}
    </span>
  )

  return (
    <Tag className={`bi bi--${size}${only ? ` bi--${only}` : ''} ${className}`.trim()}>
      {only === 'zh' ? zh : <span className="bi-en">{copy.en}</span>}
      {only ? null : zh}
    </Tag>
  )
}
