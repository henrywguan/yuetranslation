import { useEffect, useRef, useState } from 'react'
import { MeshGradient } from '@paper-design/shaders-react'
import { JyutLogo } from '../components/JyutLogo'
import { BiText } from '../components/BiText'
import { useTheme } from '../lib/theme'
import { useReducedMotion } from '../lib/useReducedMotion'
import type { Bi } from '../lib/uiCopy'
import { MagneticButton } from './MagneticButton'
import { Reveal } from './Reveal'

const MESH_DARK = ['#07131f', '#0a1c2c', '#0b3d36', '#12324a', '#1f8f7a', '#3dcfb6']
const MESH_LIGHT = ['#eef5f8', '#e4eef4', '#9fd6cb', '#b7d4e8', '#1f9f8a', '#3dcfb6']

/**
 * Closing CTA for marketing pages.
 * Full-bleed and cardless so it blends into the page glass field;
 * Paper mesh atmosphere + staggered copy + pulsing jade mark.
 */
export function MarketingCtaBand({
  title,
  body,
  button,
  onClick,
  className,
}: {
  title: Bi
  body: Bi
  button: Bi
  onClick: () => void
  className?: string
}) {
  const { theme } = useTheme()
  const reduced = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setInView(true)
      },
      { rootMargin: '120px 0px', threshold: 0.05 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const showMesh = inView && !reduced

  return (
    <section
      ref={sectionRef}
      className={className ? `ln-cta-band ${className}` : 'ln-cta-band'}
    >
      <div className="ln-cta-atmosphere" aria-hidden="true">
        {showMesh ? (
          <MeshGradient
            className="ln-cta-mesh"
            colors={theme === 'light' ? MESH_LIGHT : MESH_DARK}
            speed={0.28}
            distortion={0.7}
            swirl={0.35}
            grainMixer={0.12}
            grainOverlay={0.08}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          />
        ) : null}
        <div className="ln-cta-wash" />
        <div className="ln-cta-orb ln-cta-orb--a" />
        <div className="ln-cta-orb ln-cta-orb--b" />
        <div className="ln-cta-orb ln-cta-orb--c" />
      </div>

      <div className="ln-cta-inner">
        <Reveal className="ln-cta-stack" stagger={0.14} y={22}>
          <div className="ln-cta-mark-wrap">
            <span className="ln-cta-pulse" />
            <span className="ln-cta-pulse ln-cta-pulse--delay" />
            <JyutLogo variant="mark" className="ln-cta-mark" />
          </div>
          <h2 className="ln-h2 ln-cta-title">
            <BiText copy={title} size="lg" />
          </h2>
          <BiText className="ln-p ln-cta-body" copy={body} size="sm" as="p" />
          <div className="ln-cta-rule" />
          <MagneticButton className="btn-primary" onClick={onClick}>
            <BiText copy={button} size="sm" />
          </MagneticButton>
        </Reveal>
      </div>
    </section>
  )
}
