import { useId, useState, type ReactNode } from 'react'
import { BiText } from './BiText'
import { ui, type Bi } from '../lib/uiCopy'

type Props = {
  title: Bi
  children: ReactNode
  /** Start expanded (default true). */
  defaultOpen?: boolean
  className?: string
  /** Optional muted meta line in the header (e.g. provenance). */
  meta?: ReactNode
  headingLevel?: 'h3' | 'h4'
}

/** Disclosure section for Details panels — chevron + aria-expanded. */
export function DetailCollapsible({
  title,
  children,
  defaultOpen = true,
  className = '',
  meta,
  headingLevel = 'h3',
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()
  const Heading = headingLevel

  return (
    <section className={`detail-collapse${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className="detail-collapse-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="detail-collapse-heading">
          <Heading className="detail-collapse-title">
            <BiText copy={title} size="sm" />
          </Heading>
          {meta ? <span className="detail-collapse-meta muted">{meta}</span> : null}
        </span>
        <span className="detail-collapse-chevron" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
        <span className="visually-hidden">
          <BiText copy={open ? ui.historyCollapse : ui.historyExpand} size="sm" layout="inline" />
        </span>
      </button>
      {open ? (
        <div id={panelId} className="detail-collapse-body">
          {children}
        </div>
      ) : null}
    </section>
  )
}
