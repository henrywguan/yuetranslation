import type { ReactNode } from 'react'
import { MotionConfig } from 'framer-motion'
import { JadeGlassField } from '../components/JadeGlassField'
import { OrbitalSphereBackground } from '../components/ui/orbital-sphere'
import { Nav } from './Nav'
import { ScrollProgress } from './ScrollProgress'
import { useSmoothScroll } from './useSmoothScroll'

export function MarketingPageShell({
  children,
  onFeatures,
  className,
  reducedMotion = true,
  background = 'glass',
}: {
  children: ReactNode
  onFeatures: () => void
  className?: string
  reducedMotion?: boolean
  /** `orbital` = pricing-style gradient wash + particle sphere. */
  background?: 'glass' | 'orbital'
}) {
  useSmoothScroll(true)

  const page = (
    <div className={className ? `landing ${className}` : 'landing'}>
      <ScrollProgress />
      {background === 'orbital' ? (
        <>
          <div className="orbital-sphere-wash" aria-hidden="true" />
          <OrbitalSphereBackground className="orbital-sphere-bg--page" />
        </>
      ) : (
        <JadeGlassField variant="marketing" />
      )}
      <Nav onFeatures={onFeatures} />
      {children}
    </div>
  )

  if (reducedMotion) {
    return <MotionConfig reducedMotion="user">{page}</MotionConfig>
  }

  return page
}
