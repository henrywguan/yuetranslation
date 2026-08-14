import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Controls } from './components/Controls'
import { ConversationView } from './components/ConversationView'
import { FluidBackground } from './components/FluidBackground'
import { PlanChip } from './components/PlanChip'
import { SoloView } from './components/SoloView'
import { TextMode } from './components/TextMode'
import { ThemeToggle } from './components/ThemeToggle'
import { CharacterBreakdownHost } from './components/CharacterBreakdownHost'
import { useYueStore } from './lib/store'
import { isEmbeddedAppView } from './lib/useHashRoute'
import { openHome } from './lib/siteLinks'
import './App.css'

export function TranslatorApp() {
  const mode = useYueStore((s) => s.mode)
  const error = useYueStore((s) => s.error)
  const entitlement = useYueStore((s) => s.entitlement)
  const loadBootstrap = useYueStore((s) => s.loadBootstrap)
  const embedded = isEmbeddedAppView()

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
          {embedded ? (
            <span className="brand-mark" aria-hidden="true">
              粵
            </span>
          ) : (
            <button
              type="button"
              className="brand-mark brand-mark-link"
              onClick={() => openHome()}
              aria-label="Back to Jyut home"
            >
              粵
            </button>
          )}
          <div>
            <h1 className="brand-name">Jyut</h1>
            <p className="brand-tag">English ↔ Cantonese</p>
          </div>
        </motion.div>
        <div className="brand-bar-actions">
          <ThemeToggle />
          <PlanChip />
        </div>
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
      <CharacterBreakdownHost />
    </div>
  )
}
