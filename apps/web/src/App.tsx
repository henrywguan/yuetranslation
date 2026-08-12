import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Controls } from './components/Controls'
import { ConversationView } from './components/ConversationView'
import { FluidBackground } from './components/FluidBackground'
import { PlanChip } from './components/PlanChip'
import { SoloView } from './components/SoloView'
import { TextMode } from './components/TextMode'
import { useYueStore } from './lib/store'
import './App.css'

export default function App() {
  const mode = useYueStore((s) => s.mode)
  const error = useYueStore((s) => s.error)
  const entitlement = useYueStore((s) => s.entitlement)
  const loadBootstrap = useYueStore((s) => s.loadBootstrap)

  useEffect(() => {
    void loadBootstrap()
  }, [loadBootstrap])

  return (
    <div className="app-shell">
      <FluidBackground />
      <header className="brand-bar">
        <motion.div
          className="brand"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="brand-mark" aria-hidden="true">
            粵
          </span>
          <div>
            <h1 className="brand-name">Yue</h1>
            <p className="brand-tag">English ↔ Cantonese</p>
          </div>
        </motion.div>
        <PlanChip />
      </header>

      <main className="main">
        {mode === 'solo' ? <SoloView /> : null}
        {mode === 'conversation' ? <ConversationView /> : null}
        {mode === 'text' ? <TextMode /> : null}
      </main>

      {error ? (
        <div className="banner error" role="alert">
          <span>{error}</span>
          {entitlement?.reason === 'login_required' && entitlement.loginUrl ? (
            <a href={entitlement.loginUrl} target="_top" rel="noreferrer">
              Log in
            </a>
          ) : null}
          {entitlement && !entitlement.allowed.live && entitlement.upgradeUrl ? (
            <a href={entitlement.upgradeUrl} target="_top" rel="noreferrer">
              Upgrade
            </a>
          ) : null}
        </div>
      ) : null}

      <Controls />
    </div>
  )
}
