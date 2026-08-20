import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import { hashPath, navigate } from './useHashRoute'

let supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || ''
let supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || ''
let client: SupabaseClient | null = null
let authPanelOpen = false
let configLoad: Promise<void> | null = null

export const AUTH_SCREEN_EVENT = 'yue-auth-screen'

export function supabaseEnabled(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey)
}

/**
 * Vite only bakes VITE_* at build time. On Vercel the keys are often added
 * after the last frontend build — load them from the API at runtime.
 */
export async function loadAuthConfig(): Promise<void> {
  if (supabaseEnabled()) return
  if (!configLoad) {
    configLoad = (async () => {
      try {
        const base = (import.meta.env.VITE_API_BASE as string | undefined)?.trim() || '/api'
        const res = await fetch(`${base.replace(/\/$/, '')}/auth-config`)
        if (!res.ok) return
        const data = (await res.json()) as { url?: string | null; anonKey?: string | null }
        const nextUrl = data.url?.trim() || ''
        const nextKey = data.anonKey?.trim() || ''
        if (nextUrl && nextKey) {
          supabaseUrl = nextUrl
          supabaseAnonKey = nextKey
          client = null
        }
      } catch {
        /* keep build-time values */
      }
    })()
  }
  await configLoad
  if (!supabaseEnabled()) configLoad = null
}

export function getSupabase(): SupabaseClient | null {
  if (!supabaseEnabled()) return null
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return client
}

export function subscribeAuthScreen(callback: () => void) {
  window.addEventListener(AUTH_SCREEN_EVENT, callback)
  return () => window.removeEventListener(AUTH_SCREEN_EVENT, callback)
}

export function isAuthScreenOpen(): boolean {
  return authPanelOpen
}

/** Open the in-app auth modal without changing route or reloading. */
export function openAuthScreen() {
  authPanelOpen = true
  window.dispatchEvent(new Event(AUTH_SCREEN_EVENT))
}

export function closeAuthScreen() {
  authPanelOpen = false
  stripAuthQueryParam()
  window.dispatchEvent(new Event(AUTH_SCREEN_EVENT))
}

function stripAuthQueryParam() {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('auth')) return
  url.searchParams.delete('auth')
  window.history.replaceState({}, '', url.toString())
}

/**
 * Legacy deep links used `/?auth=1#/app`. Open the modal once, then strip the
 * query param so we never navigate to the API loginUrl host.
 */
export function consumeAuthScreenDeepLink(): boolean {
  const url = new URL(window.location.href)
  const hashAuth =
    url.hash.includes('?') &&
    new URLSearchParams(url.hash.slice(url.hash.indexOf('?') + 1)).get('auth') === '1'
  if (url.searchParams.get('auth') !== '1' && !hashAuth) return false
  url.searchParams.delete('auth')
  if (hashAuth) {
    const [path] = url.hash.replace(/^#/, '').split('?')
    url.hash = path ? `#/${path.replace(/^\//, '')}` : '#/'
  }
  window.history.replaceState({}, '', url.toString())
  authPanelOpen = true
  return true
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
 * OAuth / email-confirm return URL. Keep this on the current origin so preview
 * and production deployments each redirect back to themselves.
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

/** After a successful sign-in, open the translator if the user is not already there. */
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
  await loadAuthConfig()
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
