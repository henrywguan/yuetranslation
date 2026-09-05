import type { ReactNode } from 'react'
import { normalizeEnglishApostrophes } from './typography'

/** Escape HTML, then restore a tiny safe markdown subset for legal pages. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function rewriteLegalHref(href: string): string {
  const t = href.trim()
  if (/privacy-policy\.md$/i.test(t) || t === './privacy-policy.md') return '#/privacy'
  if (/terms-of-service\.md$/i.test(t) || t === './terms-of-service.md') return '#/terms'
  if (/account-deletion\.md$/i.test(t) || t === './account-deletion.md') return '#/delete-account'
  return t
}

function inlineFormat(raw: string): string {
  let s = escapeHtml(normalizeEnglishApostrophes(raw))
  // Links: [label](url)
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, href: string) => {
    const resolved = rewriteLegalHref(href)
    const safeHref = escapeHtml(resolved)
    const isExternal = /^https?:/i.test(resolved)
    const rel = isExternal ? ' rel="noopener noreferrer"' : ''
    const target = isExternal ? ' target="_blank"' : ''
    return `<a href="${safeHref}"${target}${rel}>${label}</a>`
  })
  // Bold **text**
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // Italic *text* (after bold)
  s = s.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>')
  // Inline code
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
  return s
}

type Block =
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'hr' }

function parseBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      i += 1
      continue
    }

    if (trimmed === '---') {
      blocks.push({ type: 'hr' })
      i += 1
      continue
    }

    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'h1', text: trimmed.slice(2).trim() })
      i += 1
      continue
    }
    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'h2', text: trimmed.slice(3).trim() })
      i += 1
      continue
    }
    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'h3', text: trimmed.slice(4).trim() })
      i += 1
      continue
    }

    if (trimmed.startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim())
        i += 1
      }
      const splitRow = (row: string) =>
        row
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim())
      const headers = splitRow(tableLines[0] || '')
      const body = tableLines.slice(2).map(splitRow) // skip alignment row
      blocks.push({ type: 'table', headers, rows: body })
      continue
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const items: string[] = []
      while (i < lines.length) {
        const t = lines[i].trim()
        if (t.startsWith('- ') || t.startsWith('* ')) {
          items.push(t.slice(2).trim())
          i += 1
        } else if (!t) {
          i += 1
          break
        } else {
          break
        }
      }
      blocks.push({ type: 'ul', items })
      continue
    }

    // Paragraph — gather until blank line or next block marker
    const para: string[] = []
    while (i < lines.length) {
      const t = lines[i].trim()
      if (!t) {
        i += 1
        break
      }
      if (
        t === '---' ||
        t.startsWith('#') ||
        t.startsWith('|') ||
        t.startsWith('- ') ||
        t.startsWith('* ')
      ) {
        break
      }
      para.push(t)
      i += 1
    }
    if (para.length) blocks.push({ type: 'p', text: para.join(' ') })
  }

  return blocks
}

/** Render a constrained markdown subset used by Privacy / Terms drafts. */
export function renderLegalMarkdown(md: string): ReactNode {
  // Skip the leading H1 — page chrome already shows the title.
  const blocks = parseBlocks(md).filter((b, idx) => !(idx === 0 && b.type === 'h1'))

  return blocks.map((block, idx) => {
    const key = `${block.type}-${idx}`
    switch (block.type) {
      case 'h2':
        return (
          <h2 key={key} className="legal-h2" dangerouslySetInnerHTML={{ __html: inlineFormat(block.text) }} />
        )
      case 'h3':
        return (
          <h3 key={key} className="legal-h3" dangerouslySetInnerHTML={{ __html: inlineFormat(block.text) }} />
        )
      case 'p':
        return (
          <p key={key} className="legal-p" dangerouslySetInnerHTML={{ __html: inlineFormat(block.text) }} />
        )
      case 'ul':
        return (
          <ul key={key} className="legal-ul">
            {block.items.map((item, j) => (
              <li key={j} dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
            ))}
          </ul>
        )
      case 'table':
        return (
          <div key={key} className="legal-table-wrap">
            <table className="legal-table">
              <thead>
                <tr>
                  {block.headers.map((h, j) => (
                    <th key={j} dangerouslySetInnerHTML={{ __html: inlineFormat(h) }} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <td key={c} dangerouslySetInnerHTML={{ __html: inlineFormat(cell) }} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      case 'hr':
        return <hr key={key} className="legal-hr" />
      case 'h1':
        return (
          <h1 key={key} className="legal-h1" dangerouslySetInnerHTML={{ __html: inlineFormat(block.text) }} />
        )
      default:
        return null
    }
  })
}
