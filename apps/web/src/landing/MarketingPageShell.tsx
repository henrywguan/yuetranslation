import type { ReactNode } from 'react'
import { MotionConfig } from 'framer-motion'
import { JadeGlassField } from '../components/JadeGlassField'
import {
  OrbitalSphereBackground,
  type OrbitalSphereBackgroundProps,
} from '../components/ui/orbital-sphere'
import { LandingAtmosphere } from './LandingAtmosphere'
import { Nav } from './Nav'
import { ScrollProgress } from './ScrollProgress'
import { useSmoothScroll } from './useSmoothScroll'

export function MarketingPageShell({
  children,
  onFeatures,
  className,
  reducedMotion = true,
  background = 'glass',
  orbital,
}: {
  children: ReactNode
  onFeatures: () => void
  className?: string
  reducedMotion?: boolean
  /** `orbital` = pricing-style gradient wash + particle sphere. */
  background?: 'glass' | 'orbital'
  /** Optional overrides / variant for the orbital sphere (creators page). */
  orbital?: Omit<OrbitalSphereBackgroundProps, 'className'>
}) {
  useSmoothScroll(true)

  const page = (
    <div className={className ? `landing ${className}` : 'landing'}>
      <ScrollProgress />
      {background === 'orbital' ? (
        <>
          <div className="orbital-sphere-wash" aria-hidden="true" />
          <OrbitalSphereBackground className="orbital-sphere-bg--page" {...orbital} />
        </>
      ) : (
        <>
          <JadeGlassField variant="marketing" />
          <LandingAtmosphere />
        </>
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
