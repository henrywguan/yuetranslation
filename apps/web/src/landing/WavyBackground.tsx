import { useEffect, useRef, type ReactNode } from 'react'
import { createNoise3D } from 'simplex-noise'
import { useTheme } from '../lib/theme'

type WavyBackgroundProps = {
  children?: ReactNode
  className?: string
  /** Brand wave stroke colors; defaults resolve from theme tokens. */
  colors?: string[]
  waveWidth?: number
  backgroundFill?: string
  blur?: number
  waveOpacity?: number
  /** Noise time seed — fixed so the field is static (no animation loop). */
  noiseTime?: number
  waveCount?: number
}

function readCssColor(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

/**
 * Canvas “hero waves” adapted for JyutTranslate.
 * Drawn once (resize / theme only) — no requestAnimationFrame loop.
 */
export function WavyBackground({
  children,
  className,
  colors,
  waveWidth = 44,
  backgroundFill,
  blur = 10,
  waveOpacity = 0.45,
  noiseTime = 0.42,
  waveCount = 5,
}: WavyBackgroundProps) {
  const { theme } = useTheme()
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const noiseRef = useRef(createNoise3D())

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const noise = noiseRef.current
    let cancelled = false

    const paint = () => {
      if (cancelled) return
      const rect = wrap.getBoundingClientRect()
      const cssW = Math.max(1, Math.floor(rect.width))
      const cssH = Math.max(1, Math.floor(rect.height))
      // Cap DPR for mobile perf — still crisp enough for blurred strokes.
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)

      canvas.width = Math.floor(cssW * dpr)
      canvas.height = Math.floor(cssH * dpr)
      canvas.style.width = `${cssW}px`
      canvas.style.height = `${cssH}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.filter = `blur(${blur}px)`

      const fill =
        backgroundFill ??
        readCssColor('--harbor', theme === 'light' ? '#eef5f8' : '#07131f')

      const waveColors =
        colors ??
        (theme === 'light'
          ? [
              readCssColor('--jade', '#1f9f8a'),
              readCssColor('--jade-bright', '#3dcfb6'),
              readCssColor('--jade-mid', '#178574'),
              readCssColor('--harbor-teal', '#9fd6cb'),
              readCssColor('--harbor-blue', '#b7d4e8'),
            ]
          : [
              readCssColor('--jade', '#3dcfb6'),
              readCssColor('--jade-bright', '#7ef0dc'),
              readCssColor('--jade-mid', '#2aa88f'),
              readCssColor('--harbor-teal', '#0b3d36'),
              readCssColor('--harbor-blue', '#12324a'),
            ])

      const w = cssW
      const h = cssH
      const nt = noiseTime

      ctx.globalAlpha = 1
      ctx.fillStyle = fill
      ctx.fillRect(0, 0, w, h)
      ctx.globalAlpha = waveOpacity

      for (let i = 0; i < waveCount; i++) {
        ctx.beginPath()
        ctx.lineWidth = waveWidth
        ctx.strokeStyle = waveColors[i % waveColors.length]!
        for (let x = 0; x < w; x += 5) {
          const y = noise(x / 800, 0.3 * i, nt) * 100
          ctx.lineTo(x, y + h * 0.52)
        }
        ctx.stroke()
        ctx.closePath()
      }
    }

    paint()

    const ro = new ResizeObserver(() => {
      paint()
    })
    ro.observe(wrap)

    return () => {
      cancelled = true
      ro.disconnect()
    }
  }, [theme, colors, waveWidth, backgroundFill, blur, waveOpacity, noiseTime, waveCount])

  return (
    <div ref={wrapRef} className={className ? `ln-wavy ${className}` : 'ln-wavy'}>
      <canvas ref={canvasRef} className="ln-wavy-canvas" aria-hidden="true" />
      <div className="ln-wavy-content">{children}</div>
    </div>
  )
}
