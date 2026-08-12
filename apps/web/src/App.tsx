import { Landing } from './landing/Landing'
import { TranslatorApp } from './TranslatorApp'
import { useRoute } from './lib/useHashRoute'

export default function App() {
  const route = useRoute()
  return route === 'app' ? <TranslatorApp /> : <Landing />
}
