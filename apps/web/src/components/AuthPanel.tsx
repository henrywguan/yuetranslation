import { useEffect, useState, type FormEvent, useSyncExternalStore } from 'react'
import { AppleIcon } from './AppleIcon'
import { BiText } from './BiText'
import { GoogleIcon } from './GoogleIcon'
import {
  closeAuthScreen,
  getSession,
  goToAppAfterAuth,
  isAuthScreenOpen,
  onAuthChange as subscribeAuthChange,
  signIn,
  signInWithApple,
  signInWithGoogle,
  signOut,
  signUp,
  subscribeAuthScreen,
  supabaseEnabled,
} from '../lib/auth'
import { biPlain, ui } from '../lib/uiCopy'

type Props = {
  onAuthChange?: () => void
}

type Mode = 'signin' | 'register'

export function AuthPanel({ onAuthChange }: Props) {
  const open = useSyncExternalStore(subscribeAuthScreen, isAuthScreenOpen, () => false)
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    void getSession().then((session) => setSignedIn(Boolean(session)))
    return subscribeAuthChange((session) => {
      setSignedIn(Boolean(session))
      if (session) {
        closeAuthScreen()
        onAuthChange?.()
      }
    })
  }, [onAuthChange])

  useEffect(() => {
    if (!open) {
      setMode('signin')
      setMessage(null)
      setBusy(false)
    }
  }, [open])

  if (!open) return null

  const close = () => {
    closeAuthScreen()
    setMessage(null)
  }

  const submit = async (event: FormEvent, next: Mode) => {
    event.preventDefault()
    if (!supabaseEnabled()) {
      setMessage('Auth is not configured on this deploy.')
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      if (next === 'signin') {
        await signIn(email.trim(), password)
        goToAppAfterAuth()
      } else {
        await signUp(email.trim(), password)
        setMessage('Check your email to confirm your account, then sign in.')
        setMode('signin')
        setBusy(false)
        return
      }
      close()
      onAuthChange?.()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Auth failed')
    } finally {
      setBusy(false)
    }
  }

  const oauthSignIn = async (provider: 'google' | 'apple') => {
    if (!supabaseEnabled()) {
      setMessage('Auth is not configured on this deploy.')
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      if (provider === 'google') await signInWithGoogle()
      else await signInWithApple()
    } catch (e) {
      const label = provider === 'google' ? 'Google' : 'Apple'
      setMessage(e instanceof Error ? e.message : `${label} sign-in failed`)
      setBusy(false)
    }
  }

  const oauthRow = (
    <div className="auth-oauth-row">
      <button
        type="button"
        className="auth-oauth-btn"
        disabled={busy}
        aria-label={biPlain(ui.signInGoogle)}
        title={biPlain(ui.signInGoogle)}
        onClick={() => void oauthSignIn('google')}
      >
        <GoogleIcon size={20} />
      </button>
      <button
        type="button"
        className="auth-oauth-btn auth-oauth-btn--apple"
        disabled={busy}
        aria-label={biPlain(ui.signInApple)}
        title={biPlain(ui.signInApple)}
        onClick={() => void oauthSignIn('apple')}
      >
        <AppleIcon size={20} />
      </button>
    </div>
  )

  return (
    <div className="auth-overlay" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button type="button" className="auth-backdrop" aria-label="Close" onClick={close} />
      <div className="auth-stage">
        <div className={`auth-flip${mode === 'register' ? ' is-flipped' : ''}`}>
          <form className="auth-face auth-face--front" onSubmit={(e) => void submit(e, 'signin')}>
            <button type="button" className="auth-close" onClick={close} aria-label="Close">
              ×
            </button>
            <h2 id="auth-title" className="auth-title">
              <BiText copy={ui.signIn} size="md" />
            </h2>
            {oauthRow}
            <p className="auth-divider">
              <span className="auth-divider-en">{ui.signInOr.en}</span>
              <BiText className="auth-divider-zh" copy={ui.signInOr} size="sm" only="zh" />
            </p>
            <label className="auth-float">
              <input
                type="email"
                autoComplete="email"
                required
                placeholder=" "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <span>Email</span>
            </label>
            <label className="auth-float">
              <input
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span>Password</span>
            </label>
            {message && mode === 'signin' ? <p className="auth-message">{message}</p> : null}
            <button type="submit" className="auth-submit" disabled={busy}>
              <BiText copy={ui.signIn} size="sm" />
            </button>
            <p className="auth-switch">
              <button type="button" onClick={() => setMode('register')}>
                <BiText copy={ui.createAccount} size="sm" />
              </button>
            </p>
            {signedIn ? (
              <button
                type="button"
                className="auth-signout"
                onClick={async () => {
                  await signOut()
                  setSignedIn(false)
                  onAuthChange?.()
                  close()
                }}
              >
                <BiText copy={ui.signOut} size="sm" />
              </button>
            ) : null}
          </form>

          <form className="auth-face auth-face--back" onSubmit={(e) => void submit(e, 'register')}>
            <button type="button" className="auth-close" onClick={close} aria-label="Close">
              ×
            </button>
            <h2 className="auth-title">
              <BiText copy={ui.register} size="md" />
            </h2>
            {oauthRow}
            <p className="auth-divider">
              <span className="auth-divider-en">{ui.signInOr.en}</span>
              <BiText className="auth-divider-zh" copy={ui.signInOr} size="sm" only="zh" />
            </p>
            <label className="auth-float">
              <input
                type="email"
                autoComplete="email"
                required
                placeholder=" "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <span>Email</span>
            </label>
            <label className="auth-float">
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span>Password</span>
            </label>
            {message && mode === 'register' ? <p className="auth-message">{message}</p> : null}
            <button type="submit" className="auth-submit" disabled={busy}>
              <BiText copy={ui.register} size="sm" />
            </button>
            <p className="auth-switch">
              <button type="button" onClick={() => setMode('signin')}>
                <BiText copy={ui.signIn} size="sm" />
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
