import type { ElementType, ReactNode } from 'react'
import type { Bi } from '../lib/uiCopy'
import { biPlain } from '../lib/uiCopy'

type BiTextProps = {
  copy: Bi
  /** inline = EN beside ZH (default); stack = EN above ZH block */
  layout?: 'inline' | 'stack'
  /** compact shrinks Jyutping for tabs / chips */
  size?: 'sm' | 'md' | 'lg'
  className?: string
  as?: ElementType
  /** Extra content after the bilingual block (e.g. badge) */
  after?: ReactNode
  /** Hide Jyutping (rare — e.g. ultra-tight chrome) */
  hideJp?: boolean
}

/**
 * Bilingual UI label: English next to Chinese, Jyutping under the Chinese.
 */
export function BiText({
  copy,
  layout = 'inline',
  size = 'md',
  className = '',
  as: Tag = 'span',
  after,
  hideJp = false,
}: BiTextProps) {
  return (
    <Tag
      className={`bi bi--${layout} bi--${size} ${className}`.trim()}
      title={biPlain(copy)}
    >
      <span className="bi-en">{copy.en}</span>
      <span className="bi-zh-col" lang="zh-HK">
        <span className="bi-zh">{copy.zh}</span>
        {!hideJp && copy.jp ? (
          <span className="bi-jp" lang="en">
            {copy.jp}
          </span>
        ) : null}
      </span>
      {after}
    </Tag>
  )
}
