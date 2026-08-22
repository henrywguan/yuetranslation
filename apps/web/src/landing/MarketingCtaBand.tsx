import { JyutLogo } from '../components/JyutLogo'
import { BiText } from '../components/BiText'
import type { Bi } from '../lib/uiCopy'
import { MagneticButton } from './MagneticButton'
import { Reveal } from './Reveal'

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
      <Reveal className="ln-cta-inner">
        <div className="ln-cta-glow" aria-hidden="true" />
        <JyutLogo variant="mark" className="ln-cta-mark" />
        <h2 className="ln-h2">
          <BiText copy={title} size="lg" />
        </h2>
        <BiText className="ln-p" copy={body} size="sm" as="p" />
        <MagneticButton className="btn-primary" onClick={onClick}>
          <BiText copy={button} size="sm" />
        </MagneticButton>
      </Reveal>
    </section>
  )
}
