import { JyutLogo } from '../components/JyutLogo'
import { BiText } from '../components/BiText'
import type { Bi } from '../lib/uiCopy'
import { WavyBackground } from './WavyBackground'

/**
 * Closing CTA for marketing pages.
 * Static wavy harbor/jade canvas — no scroll/GSAP/WebGL/pulse animations.
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
  return (
    <section className={className ? `ln-cta-band ${className}` : 'ln-cta-band'}>
      <WavyBackground className="ln-cta-wavy" blur={12} waveOpacity={0.42} waveWidth={48}>
        <div className="ln-cta-inner">
          <JyutLogo variant="mark" className="ln-cta-mark" />
          <h2 className="ln-h2 ln-cta-title">
            <BiText copy={title} size="lg" />
          </h2>
          <BiText className="ln-p ln-cta-body" copy={body} size="sm" as="p" />
          <div className="ln-cta-rule" />
          <button type="button" className="magnetic btn-primary" onClick={onClick}>
            <BiText copy={button} size="sm" />
          </button>
        </div>
      </WavyBackground>
    </section>
  )
}
