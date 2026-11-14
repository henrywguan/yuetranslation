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

function safeImageSrc(href: string): string | null {
  const h = href.trim()
  if (/^https?:\/\//i.test(h)) return h
  if (/^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(h)) return h
  // Same-origin generated image proxy
  if (/^\/api\/chat\/generated-images\/[0-9a-f-]{36}$/i.test(h)) return h
  return null
}

function inlineFormat(raw: string, sources?: ChatSource[]): string {
  let s = escapeHtml(raw)
  // Images first so they are not eaten by the link rewriter.
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt: string, href: string) => {
    const src = safeImageSrc(href)
    if (!src) return escapeHtml(`![${alt}](${href})`)
    return `<img class="ds-md-img" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" />`
  })
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
  | { type: 'image'; alt: string; src: string }
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

    const aloneImage = trimmed.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/)
    if (aloneImage) {
      const src = safeImageSrc(aloneImage[2]!)
      if (src) {
        blocks.push({ type: 'image', alt: aloneImage[1] || '', src })
        i += 1
        continue
      }
    }

    if (trimmed === '---') {
      blocks.push({ type: 'hr' })
      i += 1
      continue
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      const level = heading[1]!.length
      const text = heading[2]!.trim()
      blocks.push({
        type: level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3',
        text,
      })
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

type MermaidApi = {
  initialize: (opts: Record<string, unknown>) => void
  render: (id: string, text: string) => Promise<{ svg: string }>
}

declare global {
  interface Window {
    mermaid?: MermaidApi
  }
}

let mermaidLoader: Promise<MermaidApi | null> | null = null

async function loadMermaid(): Promise<MermaidApi | null> {
  if (typeof window === 'undefined') return null
  if (window.mermaid) return window.mermaid
  if (mermaidLoader) return mermaidLoader
  mermaidLoader = new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-yue-mermaid]')
    const boot = () => {
      const api = window.mermaid || null
      if (api) {
        try {
          api.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral' })
        } catch {
          /* already initialized */
        }
      }
      resolve(api)
    }
    if (existing) {
      if (window.mermaid) boot()
      else existing.addEventListener('load', boot, { once: true })
      existing.addEventListener('error', () => resolve(null), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js'
    script.async = true
    script.dataset.yueMermaid = '1'
    script.onload = () => boot()
    script.onerror = () => resolve(null)
    document.head.appendChild(script)
  })
  return mermaidLoader
}

function MermaidBlock({ text, onOpenArtifact }: { text: string; onOpenArtifact?: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!text.trim()) {
        setFailed(true)
        return
      }
      const api = await loadMermaid()
      if (cancelled) return
      if (!api || !hostRef.current) {
        setFailed(true)
        return
      }
      try {
        const id = `mmd-${Math.random().toString(36).slice(2, 10)}`
        const { svg } = await api.render(id, text.trim())
        if (cancelled || !hostRef.current) return
        hostRef.current.innerHTML = svg
        setReady(true)
        setFailed(false)
      } catch {
        if (!cancelled) setFailed(true)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [text])

  if (failed) {
    return (
      <div className="ds-md-code-wrap ds-md-mermaid-fallback">
        <div className="ds-md-code-head">
          <span className="ds-md-code-lang">mermaid</span>
          {onOpenArtifact ? (
            <button type="button" className="ds-md-code-copy" onClick={onOpenArtifact}>
              Open
            </button>
          ) : null}
        </div>
        <pre className="ds-md-code" data-lang="mermaid">
          <code>{text}</code>
        </pre>
      </div>
    )
  }

  return (
    <figure className="ds-md-mermaid">
      <div className="ds-md-mermaid-toolbar">
        <span className="ds-md-code-lang">mermaid</span>
        {onOpenArtifact ? (
          <button type="button" className="ds-md-code-copy" onClick={onOpenArtifact}>
            Open
          </button>
        ) : null}
      </div>
      <div ref={hostRef} className="ds-md-mermaid-host" aria-busy={!ready} />
      {!ready ? <div className="ds-md-mermaid-loading">Rendering diagram…</div> : null}
    </figure>
  )
}

function CodeBlock({
  lang,
  text,
  onOpenArtifact,
}: {
  lang: string
  text: string
  onOpenArtifact?: () => void
}) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [])

  if (/^mermaid$/i.test(lang.trim())) {
    return <MermaidBlock text={text} onOpenArtifact={onOpenArtifact} />
  }

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

  const previewable = /^(html|htm|svg)$/i.test(lang.trim()) || text.length >= 280

  return (
    <div className="ds-md-code-wrap">
      <div className="ds-md-code-head">
        <span className="ds-md-code-lang">{lang || 'code'}</span>
        <div className="ds-md-code-actions">
          {previewable && onOpenArtifact ? (
            <button type="button" className="ds-md-code-copy" onClick={onOpenArtifact}>
              Open
            </button>
          ) : null}
          <button type="button" className={`ds-md-code-copy${copied ? ' is-copied' : ''}`} onClick={() => void copy()}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      <pre className="ds-md-code" data-lang={lang || undefined}>
        <code>{text}</code>
      </pre>
    </div>
  )
}

export type RenderChatMarkdownOptions = {
  sources?: ChatSource[]
  /** When set, code/mermaid fences can open the artifacts panel. */
  onOpenArtifact?: (lang: string, source: string) => void
}

/** Render assistant markdown in DeepSeek-style chat classes. */
export function renderChatMarkdown(md: string, options?: RenderChatMarkdownOptions): ReactNode {
  if (!md.trim()) return null
  const sources = options?.sources
  const onOpenArtifact = options?.onOpenArtifact
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
        return (
          <CodeBlock
            key={key}
            lang={block.lang}
            text={block.text}
            onOpenArtifact={
              onOpenArtifact ? () => onOpenArtifact(block.lang || 'code', block.text) : undefined
            }
          />
        )
      case 'image':
        return (
          <figure key={key} className="ds-md-figure">
            <img className="ds-md-img" src={block.src} alt={block.alt || ''} loading="lazy" />
            {block.alt ? <figcaption className="ds-md-figcaption">{block.alt}</figcaption> : null}
          </figure>
        )
      case 'hr':
        return <hr key={key} className="ds-md-hr" />
      default:
        return null
    }
  })
}
