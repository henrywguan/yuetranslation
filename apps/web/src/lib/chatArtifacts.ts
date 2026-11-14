/** Detect previewable artifacts from assistant markdown (code / html / mermaid). */

export type ChatArtifact = {
  id: string
  kind: 'html' | 'svg' | 'mermaid' | 'code'
  lang: string
  title: string
  source: string
}

const FENCE_RE = /```([^\n`]*)\n([\s\S]*?)```/g

export function extractChatArtifacts(md: string): ChatArtifact[] {
  const out: ChatArtifact[] = []
  let i = 0
  let m: RegExpExecArray | null
  const re = new RegExp(FENCE_RE.source, 'g')
  while ((m = re.exec(md)) !== null) {
    const lang = (m[1] || '').trim().toLowerCase()
    const source = (m[2] || '').replace(/\n$/, '')
    if (!source.trim()) continue
    const kind =
      lang === 'mermaid'
        ? 'mermaid'
        : lang === 'html' || lang === 'htm'
          ? 'html'
          : lang === 'svg'
            ? 'svg'
            : source.length >= 280 || /^(tsx?|jsx?|python|py|rust|go|java|css|json|sql)$/i.test(lang)
              ? 'code'
              : null
    if (!kind) continue
    i += 1
    out.push({
      id: `art-${i}`,
      kind,
      lang: lang || 'code',
      title: lang === 'mermaid' ? 'Diagram' : lang === 'html' || lang === 'svg' ? 'Preview' : lang || 'Code',
      source,
    })
  }
  return out.slice(0, 8)
}

export function relatedQuestionsFromReply(content: string, max = 3): string[] {
  const lines = content
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const qs: string[] = []
  for (const line of lines) {
    const clean = line.replace(/^[-*•\d.)\s]+/, '').replace(/\*\*/g, '').trim()
    if (clean.endsWith('?') && clean.length >= 12 && clean.length <= 140) {
      if (!qs.includes(clean)) qs.push(clean)
    }
    if (qs.length >= max) return qs
  }
  // Fallbacks from first heading / first sentence keywords.
  const heading = lines.find((l) => /^#{1,3}\s+/.test(l))?.replace(/^#{1,3}\s+/, '').trim()
  if (heading && qs.length < max) {
    qs.push(`Can you go deeper on ${heading}?`)
  }
  if (qs.length < max) {
    const plain = content.replace(/```[\s\S]*?```/g, ' ').replace(/\s+/g, ' ').trim()
    const snippet = plain.slice(0, 48).replace(/[^\w\s\u3400-\u9fff'-]/g, '').trim()
    if (snippet.length >= 8) qs.push(`What are alternatives to ${snippet}?`)
  }
  if (qs.length < max) qs.push('Summarize the key takeaways.')
  return qs.slice(0, max)
}
