import { MotionConfig, motion } from 'framer-motion'
import { useEffect } from 'react'
import { BiText } from './components/BiText'
import { BrandTag } from './components/BrandTag'
import { CharacterBreakdownHost } from './components/CharacterBreakdownHost'
import { Controls } from './components/Controls'
import { JyutLogo } from './components/JyutLogo'
import { ConversationView } from './components/ConversationView'
import { JadeGlassField } from './components/JadeGlassField'
import { PlanChip } from './components/PlanChip'
import { SoloView } from './components/SoloView'
import { TextMode } from './components/TextMode'
import { ThemeToggle } from './components/ThemeToggle'
import { useYueStore } from './lib/store'
import { openHome } from './lib/siteLinks'
import { ui, biPlain } from './lib/uiCopy'
import { isEmbeddedAppView } from './lib/useHashRoute'
import './App.css'

export function TranslatorApp() {
  const mode = useYueStore((s) => s.mode)
  const live = useYueStore((s) => s.live)
  const error = useYueStore((s) => s.error)
  const entitlement = useYueStore((s) => s.entitlement)
  const loadBootstrap = useYueStore((s) => s.loadBootstrap)
  const embedded = isEmbeddedAppView()

  useEffect(() => {
    void loadBootstrap()
  }, [loadBootstrap])

  return (
    <MotionConfig reducedMotion="user">
      <div className="app-shell">
        <JadeGlassField variant="app" className={live ? 'is-listening' : ''} />
        <header className="brand-bar">
          <motion.div
            className="brand"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="brand-lockup-stack">
              {embedded ? (
                <span className="brand-lockup">
                  <JyutLogo />
                </span>
              ) : (
                <button
                  type="button"
                  className="brand-lockup"
                  onClick={() => openHome()}
                  aria-label={biPlain(ui.backHome)}
                >
                  <JyutLogo />
                </button>
              )}
              <h1 className="visually-hidden">JyutTranslate</h1>
              <BrandTag />
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
                <BiText copy={ui.signIn} size="sm" />
              </a>
            ) : null}
            {entitlement && !entitlement.allowed.live && entitlement.upgradeUrl ? (
              <a href={entitlement.upgradeUrl} target="_top" rel="noreferrer">
                <BiText copy={ui.upgrade} size="sm" />
              </a>
            ) : null}
          </div>
        ) : null}

        <Controls />
        <CharacterBreakdownHost />
      </div>
    </MotionConfig>
  )
}
