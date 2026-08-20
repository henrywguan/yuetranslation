import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import { hashPath, navigate } from './useHashRoute'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || ''
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || ''

let client: SupabaseClient | null = null

export function supabaseEnabled(): boolean {
  return Boolean(url && anonKey)
}

export function getSupabase(): SupabaseClient | null {
  if (!supabaseEnabled()) return null
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return client
}

export async function getAccessToken(): Promise<string | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data } = await sb.auth.getSession()
  return data.session?.access_token ?? null
}

export async function getSession(): Promise<Session | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data } = await sb.auth.getSession()
  return data.session
}

export function onAuthChange(callback: (session: Session | null) => void) {
  const sb = getSupabase()
  if (!sb) return () => {}
  const { data } = sb.auth.onAuthStateChange((_event, session) => callback(session))
  return () => data.subscription.unsubscribe()
}

export async function signIn(email: string, password: string) {
  const sb = getSupabase()
  if (!sb) throw new Error('Auth is not configured.')
  const { error } = await sb.auth.signInWithPassword({ email, password })
  if (error) throw error
}

/**
 * OAuth / email-confirm return URL. Keep this on the origin root so it matches
 * the Supabase Site URL. After the session is restored we send the user to `#/app`.
 */
export function oauthRedirectUrl(): string {
  const url = new URL(window.location.origin)
  url.pathname = window.location.pathname || '/'
  return url.toString()
}

/** True when this page load is a Supabase auth callback (OAuth or magic link). */
export function isAuthCallback(): boolean {
  if (typeof window === 'undefined') return false
  const q = new URLSearchParams(window.location.search)
  if (q.has('code') || (q.has('error') && q.has('error_description'))) return true
  const hash = window.location.hash.replace(/^#/, '')
  if (hash.startsWith('/')) return false
  const hp = new URLSearchParams(hash)
  return hp.has('access_token') || hp.has('refresh_token') || hp.has('error')
}

function stripAuthCallbackParams() {
  const url = new URL(window.location.href)
  for (const key of ['code', 'error', 'error_description', 'error_code', 'state']) {
    url.searchParams.delete(key)
  }
  window.history.replaceState({}, '', url.toString())
}

/** After a successful sign-in, always open the translator (not the marketing home). */
export function goToAppAfterAuth() {
  if (hashPath() !== 'app') navigate('app')
}

export async function signInWithGoogle() {
  await signInWithOAuthProvider('google')
}

export async function signInWithApple() {
  await signInWithOAuthProvider('apple')
}

async function signInWithOAuthProvider(provider: 'google' | 'apple') {
  const sb = getSupabase()
  if (!sb) throw new Error('Auth is not configured.')
  const { error } = await sb.auth.signInWithOAuth({
    provider,
    options: { redirectTo: oauthRedirectUrl() },
  })
  if (error) throw error
}

/** Call on app boot so PKCE / implicit OAuth callbacks restore the session. */
export async function bootstrapAuthSession(): Promise<Session | null> {
  const sb = getSupabase()
  if (!sb) return null
  const fromCallback = isAuthCallback()
  let session = (await sb.auth.getSession()).data.session
  if (fromCallback && !session) {
    await new Promise((r) => setTimeout(r, 400))
    session = (await sb.auth.getSession()).data.session
  }
  if (fromCallback) {
    stripAuthCallbackParams()
    if (session) goToAppAfterAuth()
  }
  return session
}

export async function signUp(email: string, password: string) {
  const sb = getSupabase()
  if (!sb) throw new Error('Auth is not configured.')
  const { error } = await sb.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: oauthRedirectUrl() },
  })
  if (error) throw error
}

export async function signOut() {
  const sb = getSupabase()
  if (!sb) return
  await sb.auth.signOut()
}

export const AUTH_SCREEN_EVENT = 'yue-auth-screen'

export function openAuthScreen() {
  const url = new URL(window.location.href)
  url.searchParams.set('auth', '1')
  if (hashPath(url.hash) !== 'app') url.hash = '#/app'
  window.history.replaceState({}, '', url.toString())
  window.dispatchEvent(new Event(AUTH_SCREEN_EVENT))
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

export function closeAuthScreen() {
  const url = new URL(window.location.href)
  url.searchParams.delete('auth')
  window.history.replaceState({}, '', url.toString())
  window.dispatchEvent(new Event(AUTH_SCREEN_EVENT))
}

export function isAuthScreenOpen(): boolean {
  const search = new URLSearchParams(window.location.search)
  if (search.get('auth') === '1') return true
  const hash = window.location.hash.replace(/^#/, '')
  const qIndex = hash.indexOf('?')
  if (qIndex === -1) return false
  return new URLSearchParams(hash.slice(qIndex + 1)).get('auth') === '1'
}
