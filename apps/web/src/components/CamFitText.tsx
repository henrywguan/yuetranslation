import { useLayoutEffect, useRef } from 'react'

/** Scales overlay copy so it fills the OCR box without overflowing. */
export function CamFitText({
  text,
  className = '',
  minPx = 11,
  maxPx = 42,
}: {
  text: string
  className?: string
  minPx?: number
  maxPx?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    const parent = el?.parentElement
    if (!el || !parent) return

    const fit = () => {
      const padX = 16
      const padY = 14
      const availW = Math.max(8, parent.clientWidth - padX)
      const availH = Math.max(8, parent.clientHeight - padY)
      if (availW < 8 || availH < 8) return

      let lo = minPx
      let hi = Math.min(maxPx, Math.max(minPx, Math.floor(Math.min(availW, availH) * 0.92)))
      let best = lo
      el.style.fontSize = `${lo}px`
      el.style.lineHeight = '1.2'

      while (lo <= hi) {
        const mid = (lo + hi) / 2
        el.style.fontSize = `${mid}px`
        const overflows = el.scrollWidth > availW + 1 || el.scrollHeight > availH + 1
        if (overflows) {
          hi = mid - 0.5
        } else {
          best = mid
          lo = mid + 0.5
        }
      }
      el.style.fontSize = `${best}px`
    }

    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(parent)
    return () => ro.disconnect()
  }, [text, minPx, maxPx])

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  )
}
