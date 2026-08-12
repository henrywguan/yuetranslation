import { Landing } from './landing/Landing'
import { PricingPage } from './landing/PricingPage'
import { TranslatorApp } from './TranslatorApp'
import { useRoute } from './lib/useHashRoute'

export default function App() {
  const route = useRoute()
  if (route === 'app') return <TranslatorApp />
  if (route === 'pricing') return <PricingPage />
  return <Landing />
}
