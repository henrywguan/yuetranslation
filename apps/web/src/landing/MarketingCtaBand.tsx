import { useEffect, useRef, useState } from 'react'
import { MeshGradient } from '@paper-design/shaders-react'
import { JyutLogo } from '../components/JyutLogo'
import { BiText } from '../components/BiText'
import { useTheme } from '../lib/theme'
import { useReducedMotion } from '../lib/useReducedMotion'
import type { Bi } from '../lib/uiCopy'
import { gsap, ScrollTrigger } from './gsap'
import { MagneticButton } from './MagneticButton'
import { Reveal } from './Reveal'

/* Harbor-weighted so the mesh eases in from the page field instead of a teal wall. */
const MESH_DARK = ['#07131f', '#07131f', '#0a1c2c', '#0b3d36', '#12324a', '#1f8f7a']
const MESH_LIGHT = ['#eef5f8', '#eef5f8', '#e4eef4', '#d7e6ee', '#9fd6cb', '#1f9f8a']

/**
 * Closing CTA for marketing pages.
 * Full-bleed and cardless so it blends into the page glass field;
 * Paper mesh atmosphere + staggered copy + pulsing jade mark.
 * Atmosphere opacity is scroll-linked: fades in on approach, out on leave.
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
  const [near, setNear] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setNear(true)
      },
      { rootMargin: '40% 0px', threshold: 0 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    if (reduced) {
      el.style.setProperty('--ln-cta-atm', '1')
      return
    }

    el.style.setProperty('--ln-cta-atm', '0')

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 0.45,
        onUpdate: (self) => {
          const p = self.progress
          // Ease in through the first third, hold, ease out through the last third.
          let opacity = 1
          if (p < 0.32) opacity = p / 0.32
          else if (p > 0.68) opacity = (1 - p) / 0.32
          el.style.setProperty('--ln-cta-atm', String(Math.max(0, Math.min(1, opacity))))
        },
      })
    }, sectionRef)

    ScrollTrigger.refresh()
    return () => ctx.revert()
  }, [reduced])

  const showMesh = near && !reduced

  return (
    <section
      ref={sectionRef}
      className={className ? `ln-cta-band ${className}` : 'ln-cta-band'}
      style={{ ['--ln-cta-atm' as string]: reduced ? 1 : 0 }}
    >
      {/* Soft jade haze that bleeds into the section above (pricing / FAQ / tones). */}
      <div className="ln-cta-prelude" aria-hidden="true" />

      <div className="ln-cta-atmosphere" aria-hidden="true">
        {showMesh ? (
          <MeshGradient
            className="ln-cta-mesh"
            colors={theme === 'light' ? MESH_LIGHT : MESH_DARK}
            speed={0.22}
            distortion={0.55}
            swirl={0.28}
            grainMixer={0.08}
            grainOverlay={0.05}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          />
        ) : null}
        <div className="ln-cta-wash" />
        <div className="ln-cta-orb ln-cta-orb--a" />
        <div className="ln-cta-orb ln-cta-orb--b" />
        <div className="ln-cta-orb ln-cta-orb--c" />
        {/* Harbor veils beat mask-alone for mix-blend meshes — soft crossfade in/out. */}
        <div className="ln-cta-veil ln-cta-veil--top" />
        <div className="ln-cta-veil ln-cta-veil--bottom" />
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
