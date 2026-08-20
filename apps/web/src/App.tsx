import { lazy, Suspense, useEffect, useState } from 'react'
import { AuthPanel } from './components/AuthPanel'
import { bootstrapAuthSession, consumeAuthScreenDeepLink } from './lib/auth'
import { loadSiteConfig } from './lib/siteLinks'
import { useYueStore } from './lib/store'
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
  const loadBootstrap = useYueStore((s) => s.loadBootstrap)

  useEffect(() => {
    void Promise.all([loadSiteConfig(), bootstrapAuthSession()]).finally(() => {
      consumeAuthScreenDeepLink()
      setReady(true)
    })
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.getRegistration().then((reg) => reg?.update())
    }
  }, [])

  // Avoid flashing in-app hash routes before site-config.json resolves.
  if (!ready) return null

  let page = <Landing />
  if (route === 'app') page = <TranslatorApp />
  else if (route === 'pricing') page = <PricingPage />

  return (
    <>
      <Suspense fallback={null}>{page}</Suspense>
      <AuthPanel onAuthChange={() => void loadBootstrap()} />
    </>
  )
}
