import type { ReactNode } from 'react'
import { MotionConfig } from 'framer-motion'
import { JadeGlassField } from '../components/JadeGlassField'
import { Nav } from './Nav'
import { ScrollProgress } from './ScrollProgress'
import { useSmoothScroll } from './useSmoothScroll'

export function MarketingPageShell({
  children,
  onFeatures,
  className,
  reducedMotion = true,
}: {
  children: ReactNode
  onFeatures: () => void
  className?: string
  reducedMotion?: boolean
}) {
  useSmoothScroll(true)

  const page = (
    <div className={className ? `landing ${className}` : 'landing'}>
      <ScrollProgress />
      <JadeGlassField variant="marketing" />
      <Nav onFeatures={onFeatures} />
      {children}
    </div>
  )

  if (reducedMotion) {
    return <MotionConfig reducedMotion="user">{page}</MotionConfig>
  }

  return page
}
