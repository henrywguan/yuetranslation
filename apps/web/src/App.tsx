import { lazy, Suspense, useEffect, useState } from 'react'
import { loadSiteConfig } from './lib/siteLinks'
import { useRoute } from './lib/useHashRoute'

const Landing = lazy(() => import('./landing/Landing').then((m) => ({ default: m.Landing })))
const PricingPage = lazy(() =>
  import('./landing/PricingPage').then((m) => ({ default: m.PricingPage })),
)
const TranslatorApp = lazy(() =>
  import('./TranslatorApp').then((m) => ({ default: m.TranslatorApp })),
)

export default function App() {
  const route = useRoute()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void loadSiteConfig().finally(() => setReady(true))
  }, [])

  // Avoid flashing in-app hash routes before site-config.json resolves.
  if (!ready) return null

  let page = <Landing />
  if (route === 'app') page = <TranslatorApp />
  else if (route === 'pricing') page = <PricingPage />

  return <Suspense fallback={null}>{page}</Suspense>
}
