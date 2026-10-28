import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { ChatSource } from './chatHistory'

/** Escape HTML for a tiny safe markdown subset (chat answers). */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function citationChipHtml(n: number, href?: string): string {
  const label = String(n)
  if (href) {
    return `<a class="ds-md-cite" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">[${label}]</a>`
  }
  return `<span class="ds-md-cite">[${label}]</span>`
}

function inlineFormat(raw: string, sources?: ChatSource[]): string {
  let s = escapeHtml(raw)
  s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, (_m, label: string, href: string) => {
    return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`
  })
  // Bare [n] citation chips → source links when available.
  s = s.replace(/\[(\d{1,2})\]/g, (_m, num: string) => {
    const n = Number(num)
    const src = sources && n >= 1 ? sources[n - 1] : undefined
    return citationChipHtml(n, src?.url)
  })
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>')
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
  return s
}

type Block =
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'code'; lang: string; text: string }
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

    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim()
      const body: string[] = []
      i += 1
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        body.push(lines[i])
        i += 1
      }
      if (i < lines.length) i += 1
      blocks.push({ type: 'code', lang, text: body.join('\n') })
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
      const body = tableLines.slice(2).map(splitRow)
      blocks.push({ type: 'table', headers, rows: body })
      continue
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length) {
        const t = lines[i].trim()
        const m = t.match(/^\d+\.\s+(.*)$/)
        if (m) {
          items.push(m[1]!)
          i += 1
        } else if (!t) {
          i += 1
          break
        } else {
          break
        }
      }
      blocks.push({ type: 'ol', items })
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
        t.startsWith('* ') ||
        t.startsWith('```') ||
        /^\d+\.\s/.test(t)
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

function CodeBlock({ lang, text }: { lang: string; text: string }) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setCopied(false), 1400)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="ds-md-code-wrap">
      <div className="ds-md-code-head">
        <span className="ds-md-code-lang">{lang || 'code'}</span>
        <button type="button" className={`ds-md-code-copy${copied ? ' is-copied' : ''}`} onClick={() => void copy()}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="ds-md-code" data-lang={lang || undefined}>
        <code>{text}</code>
      </pre>
    </div>
  )
}

export type RenderChatMarkdownOptions = {
  sources?: ChatSource[]
}

/** Render assistant markdown in DeepSeek-style chat classes. */
export function renderChatMarkdown(md: string, options?: RenderChatMarkdownOptions): ReactNode {
  if (!md.trim()) return null
  const sources = options?.sources
  const blocks = parseBlocks(md)
  const fmt = (text: string) => inlineFormat(text, sources)

  return blocks.map((block, idx) => {
    const key = `${block.type}-${idx}`
    switch (block.type) {
      case 'h1':
        return <h1 key={key} className="ds-md-h1" dangerouslySetInnerHTML={{ __html: fmt(block.text) }} />
      case 'h2':
        return <h2 key={key} className="ds-md-h2" dangerouslySetInnerHTML={{ __html: fmt(block.text) }} />
      case 'h3':
        return <h3 key={key} className="ds-md-h3" dangerouslySetInnerHTML={{ __html: fmt(block.text) }} />
      case 'p':
        return <p key={key} className="ds-md-p" dangerouslySetInnerHTML={{ __html: fmt(block.text) }} />
      case 'ul':
        return (
          <ul key={key} className="ds-md-ul">
            {block.items.map((item, j) => (
              <li key={j} dangerouslySetInnerHTML={{ __html: fmt(item) }} />
            ))}
          </ul>
        )
      case 'ol':
        return (
          <ol key={key} className="ds-md-ol">
            {block.items.map((item, j) => (
              <li key={j} dangerouslySetInnerHTML={{ __html: fmt(item) }} />
            ))}
          </ol>
        )
      case 'table':
        return (
          <div key={key} className="ds-md-table-wrap">
            <table className="ds-md-table">
              <thead>
                <tr>
                  {block.headers.map((h, j) => (
                    <th key={j} dangerouslySetInnerHTML={{ __html: fmt(h) }} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <td key={c} dangerouslySetInnerHTML={{ __html: fmt(cell) }} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      case 'code':
        return <CodeBlock key={key} lang={block.lang} text={block.text} />
      case 'hr':
        return <hr key={key} className="ds-md-hr" />
      default:
        return null
    }
  })
}
