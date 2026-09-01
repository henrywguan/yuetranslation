import { lazy, Suspense, useEffect, useState } from 'react'
import { AuthPanel } from './components/AuthPanel'
import { BugReportModal } from './components/BugReportModal'
import {
  bootstrapAuthSession,
  consumeAuthScreenDeepLink,
  isAuthCallback,
} from './lib/auth'
import { isDisplayStandalone } from './lib/pwaInstall'
import { loadSiteConfig } from './lib/siteLinks'
import { useYueStore } from './lib/store'
import { hashPath, navigate, useRoute } from './lib/useHashRoute'

const Landing = lazy(() => import('./landing/Landing').then((m) => ({ default: m.Landing })))
const PricingPage = lazy(() =>
  import('./landing/PricingPage').then((m) => ({ default: m.PricingPage })),
)
const TonesPage = lazy(() => import('./landing/TonesPage').then((m) => ({ default: m.TonesPage })))
const TranslatorApp = lazy(() =>
  import('./TranslatorApp').then((m) => ({ default: m.TranslatorApp })),
)
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })))

export default function App() {
  const route = useRoute()
  const [ready, setReady] = useState(false)
  const loadBootstrap = useYueStore((s) => s.loadBootstrap)

  useEffect(() => {
    void Promise.all([loadSiteConfig(), bootstrapAuthSession()]).finally(() => {
      // After OAuth is consumed — never rewrite `#access_token=...` to `#/app` first
      // (that race signed users back into the app without a session).
      if (isDisplayStandalone() && !hashPath() && !isAuthCallback()) {
        navigate('app')
      }
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
  else if (route === 'tones') page = <TonesPage />
  else if (route === 'admin') page = <AdminPage />

  return (
    <>
      <Suspense fallback={null}>{page}</Suspense>
      <AuthPanel onAuthChange={() => void loadBootstrap()} />
      <BugReportModal />
    </>
  )
}
