import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { DeepSeekMark } from './DeepSeekMark'
import { GoogleIcon } from './GoogleIcon'
import { IosHomescreenTip } from './IosHomescreenGuide'
import { attachChatGateChord } from '../lib/chatGateChord'
import {
  hasChatGateSession,
  subscribeChatGateSession,
} from '../lib/chatGateSession'
import {
  loadAuthConfig,
  openAuthScreen,
  signInWithGoogle,
  supabaseEnabled,
} from '../lib/auth'
import { openApp, openPricing } from '../lib/siteLinks'

type Mode = 'signin' | 'upgrade'

type Props = {
  mode: Mode
  /** Optional chrome above the gate (classic shell sidebar / top bar). */
  shell?: ReactNode
  topBar?: ReactNode
  className?: string
}

export function useChatGateUnlocked(): boolean {
  return useSyncExternalStore(subscribeChatGateSession, hasChatGateSession, () => false)
}

/**
 * Dark DeepSeek-style #/chat access gate with a clear Google CTA.
 * Quiet chord unlocks Family-equivalent chat via server-issued opaque token.
 */
export function ChatSignInGate({ mode, shell, topBar, className }: Props) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [, setTick] = useState(0)

  useEffect(() => {
    return attachChatGateChord(() => setTick((n) => n + 1))
  }, [])

  const googleSignIn = async () => {
    setBusy(true)
    setMessage(null)
    try {
      await loadAuthConfig()
      if (!supabaseEnabled()) {
        openAuthScreen()
        return
      }
      await signInWithGoogle()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Google sign-in failed')
      setBusy(false)
    }
  }

  const title = mode === 'signin' ? 'Sign in to chat' : 'Family or Business'
  const body =
    mode === 'signin'
      ? 'DeepSeek Chat is available on Family and Business plans.'
      : 'Upgrade to unlock DeepSeek chat on the go.'

  return (
    <div className={className || 'ds-chat'}>
      {shell}
      <div className="ds-chat-main">
        {topBar}
        <div className="ds-chat-gate">
          <DeepSeekMark className="ds-chat-empty-mark" />
          <h1>{title}</h1>
          <p>{body}</p>
          {mode === 'signin' ? (
            <>
              <button
                type="button"
                className="ds-chat-gate-google"
                disabled={busy}
                onClick={() => void googleSignIn()}
              >
                <GoogleIcon size={18} />
                <span>Continue with Google</span>
              </button>
              <button
                type="button"
                className="ds-chat-gate-cta ds-chat-gate-cta--ghost"
                disabled={busy}
                onClick={() => openAuthScreen()}
              >
                Email sign-in
              </button>
            </>
          ) : (
            <button type="button" className="ds-chat-gate-cta" onClick={() => openPricing()}>
              View plans
            </button>
          )}
          {message ? <p className="ds-chat-gate-error">{message}</p> : null}
          <button type="button" className="ds-chat-gate-secondary" onClick={() => openApp()}>
            Back to app
          </button>
        </div>
        <IosHomescreenTip />
      </div>
    </div>
  )
}
