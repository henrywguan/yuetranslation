import { useLayoutEffect, useRef } from 'react'
import type { JyutTone } from '../lib/jyutping'

type Props = {
  tone: JyutTone
  className?: string
}

/**
 * Renders a Chao tone letter as a canvas-backed image (Noto Sans look).
 * DOM only stores the tone digit in data-tone — no ˥˧˨˩ text nodes.
 * Cipher + painter live in separate modules (`chaoToneCipher` / `chaoTonePaint`).
 */
export function JyutChaoGlyph({ tone, className = '' }: Props) {
  const hostRef = useRef<HTMLSpanElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  useLayoutEffect(() => {
    const host = hostRef.current
    const img = imgRef.current
    if (!host || !img) return

    let cancelled = false

    const paint = () => {
      if (cancelled) return
      const style = getComputedStyle(host)
      const color = style.color || '#e8fff8'
      const fontSize = parseFloat(style.fontSize) || 14
      const width = Math.max(8, host.clientWidth || fontSize * 0.55)
      const height = Math.max(12, host.clientHeight || fontSize * 0.85)
      void import('../lib/chaoTonePaint').then(({ paintChaoToneDataUrl }) => {
        if (cancelled) return
        const url = paintChaoToneDataUrl(tone, color, width, height)
        if (url) img.src = url
      })
    }

    paint()
    // Chao subset / Noto may finish after first paint.
    void document.fonts?.ready?.then(paint)

    return () => {
      cancelled = true
    }
  }, [tone])

  return (
    <span
      ref={hostRef}
      className={`jyut-chao-glyph ${className}`.trim()}
      data-tone={tone}
      aria-hidden="true"
    >
      <img ref={imgRef} alt="" draggable={false} />
    </span>
  )
}
