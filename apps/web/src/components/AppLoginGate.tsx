import { useEffect, useState, type ReactNode } from 'react'
import { AuthPanel } from './AuthPanel'
import { BiText } from './BiText'
import { JyutLogo } from './JyutLogo'
import { getSession, onAuthChange, supabaseEnabled } from '../lib/auth'
import { useYueStore } from '../lib/store'
import { ui } from '../lib/uiCopy'

type Props = {
  children: ReactNode
}

/** Blocks the translator until the user signs in when the API requires login. */
export function AppLoginGate({ children }: Props) {
  const entitlement = useYueStore((s) => s.entitlement)
  const loadBootstrap = useYueStore((s) => s.loadBootstrap)
  const [booted, setBooted] = useState(false)
  const [session, setSession] = useState(false)

  useEffect(() => {
    let cancelled = false
    void Promise.all([loadBootstrap(), getSession()]).then(([, s]) => {
      if (cancelled) return
      setSession(Boolean(s))
      setBooted(true)
    })
    return () => {
      cancelled = true
    }
  }, [loadBootstrap])

  useEffect(() => {
    return onAuthChange((s) => {
      setSession(Boolean(s))
      void loadBootstrap()
    })
  }, [loadBootstrap])

  if (!booted) return null

  if (!supabaseEnabled()) return <>{children}</>

  const needsLogin = Boolean(entitlement?.requireLogin && !entitlement.loggedIn && !session)

  if (!needsLogin) return <>{children}</>

  return (
    <div className="app-login-gate">
      <div className="app-login-gate-inner">
        <JyutLogo />
        <h1 className="app-login-gate-title">
          <BiText copy={ui.signInRequiredTitle} size="md" />
        </h1>
        <p className="app-login-gate-lede">
          <BiText copy={ui.signInRequiredBody} size="sm" />
        </p>
      </div>
      <AuthPanel required onAuthChange={() => void loadBootstrap()} />
    </div>
  )
}
