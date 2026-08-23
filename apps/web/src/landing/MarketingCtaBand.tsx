import { JyutLogo } from '../components/JyutLogo'
import { BiText } from '../components/BiText'
import type { Bi } from '../lib/uiCopy'
import { MagneticButton } from './MagneticButton'
import { Reveal } from './Reveal'

/**
 * Closing CTA for marketing pages.
 * Full-bleed and cardless so it blends into the page glass field;
 * copy reveals in staggered beats on scroll.
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
      <div className="ln-cta-atmosphere" aria-hidden="true">
        <div className="ln-cta-wash" />
        <div className="ln-cta-orb ln-cta-orb--a" />
        <div className="ln-cta-orb ln-cta-orb--b" />
        <div className="ln-cta-orb ln-cta-orb--c" />
      </div>

      <div className="ln-cta-inner">
        <Reveal className="ln-cta-stack" stagger={0.14} y={22}>
          <JyutLogo variant="mark" className="ln-cta-mark" />
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
