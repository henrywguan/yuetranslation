import { Link } from '@react-email/components'
import type { ReactNode } from 'react'
import { emailStyles } from './brand.js'

const TOKEN =
  /(\*\*[^*]+?\*\*|\*[^*\n]+?\*|_[^_\n]+?_|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\))/g

/**
 * Lightweight inline markers for campaign body copy.
 * Supported: **bold**, *italic*, _italic_, [label](https://…).
 * No raw HTML — keeps Resend/React Email output predictable.
 */
export function renderInlineFormat(text: string): ReactNode {
  if (!text) return text
  const nodes: ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  const re = new RegExp(TOKEN.source, 'g')
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    const raw = match[0]
    if (raw.startsWith('**') && raw.endsWith('**')) {
      nodes.push(<strong key={`b-${match.index}`}>{raw.slice(2, -2)}</strong>)
    } else if (
      (raw.startsWith('*') && raw.endsWith('*') && !raw.startsWith('**')) ||
      (raw.startsWith('_') && raw.endsWith('_'))
    ) {
      nodes.push(<em key={`i-${match.index}`}>{raw.slice(1, -1)}</em>)
    } else if (match[2] && match[3]) {
      nodes.push(
        <Link key={`a-${match.index}`} href={match[3]} style={emailStyles.footerLink}>
          {match[2]}
        </Link>,
      )
    } else {
      nodes.push(raw)
    }
    last = match.index + raw.length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes.length === 1 ? nodes[0] : nodes
}

/** Strip a leading bullet marker so product-update SoftBlock can draw its own. */
export function stripLeadingBullet(line: string): string {
  return line.replace(/^[•\-–—]\s+/, '').replace(/^\*\s+/, '')
}
