import { useEffect, useState } from 'react'
import { Landing } from './landing/Landing'
import { PricingPage } from './landing/PricingPage'
import { TranslatorApp } from './TranslatorApp'
import { loadSiteConfig } from './lib/siteLinks'
import { useRoute } from './lib/useHashRoute'

export default function App() {
  const route = useRoute()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void loadSiteConfig().finally(() => setReady(true))
  }, [])

  // Avoid flashing in-app hash routes before site-config.json resolves.
  if (!ready) return null

  if (route === 'app') return <TranslatorApp />
  if (route === 'pricing') return <PricingPage />
  return <Landing />
}
