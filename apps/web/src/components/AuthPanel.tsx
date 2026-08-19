import { useEffect, useState, type FormEvent } from 'react'
import { AppleIcon } from './AppleIcon'
import { BiText } from './BiText'
import { GoogleIcon } from './GoogleIcon'
import {
  closeAuthScreen,
  getSession,
  isAuthScreenOpen,
  onAuthChange as subscribeAuthChange,
  signIn,
  signInWithApple,
  signInWithGoogle,
  signOut,
  signUp,
  supabaseEnabled,
} from '../lib/auth'
import { biPlain, ui } from '../lib/uiCopy'

type Props = {
  onAuthChange?: () => void
}

export function AuthPanel({ onAuthChange }: Props) {
  const [open, setOpen] = useState(isAuthScreenOpen())
  const [mode, setMode] = useState<'signin' | 'register'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    const sync = () => setOpen(isAuthScreenOpen())
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  useEffect(() => {
    void getSession().then((session) => setSignedIn(Boolean(session)))
    return subscribeAuthChange((session) => {
      setSignedIn(Boolean(session))
      if (session) {
        closeAuthScreen()
        setOpen(false)
        onAuthChange?.()
      }
    })
  }, [onAuthChange])

  if (!supabaseEnabled() || !open) return null

  const close = () => {
    closeAuthScreen()
    setOpen(false)
    setMessage(null)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password)
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

  return (
    <div className="auth-overlay" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button type="button" className="auth-backdrop" aria-label="Close" onClick={close} />
      <form className="auth-panel" onSubmit={submit}>
        <div className="auth-head">
          <h2 id="auth-title">
            <BiText copy={mode === 'signin' ? ui.signIn : ui.register} size="md" />
          </h2>
          <button type="button" className="auth-close" onClick={close} aria-label="Close">
            ×
          </button>
        </div>

        <div className="auth-oauth-row">
          <button
            type="button"
            className="auth-oauth-btn"
            disabled={busy}
            aria-label={biPlain(ui.signInGoogle)}
            title={biPlain(ui.signInGoogle)}
            onClick={() => void oauthSignIn('google')}
          >
            <GoogleIcon size={22} />
          </button>
          <button
            type="button"
            className="auth-oauth-btn auth-oauth-btn--apple"
            disabled={busy}
            aria-label={biPlain(ui.signInApple)}
            title={biPlain(ui.signInApple)}
            onClick={() => void oauthSignIn('apple')}
          >
            <AppleIcon size={22} />
          </button>
        </div>

        <p className="auth-divider">
          <BiText copy={ui.signInOr} size="sm" />
        </p>

        <label className="auth-field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="auth-field">
          <span>Password</span>
          <input
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {message ? <p className="auth-message">{message}</p> : null}
        <button type="submit" className="btn-primary full" disabled={busy}>
          <BiText copy={mode === 'signin' ? ui.signIn : ui.register} size="sm" />
        </button>
        <p className="auth-switch">
          {mode === 'signin' ? (
            <button type="button" onClick={() => setMode('register')}>
              <BiText copy={ui.createAccount} size="sm" />
            </button>
          ) : (
            <button type="button" onClick={() => setMode('signin')}>
              <BiText copy={ui.signIn} size="sm" />
            </button>
          )}
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
    </div>
  )
}
