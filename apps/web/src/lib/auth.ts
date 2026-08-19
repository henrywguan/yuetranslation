import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'

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

export async function signUp(email: string, password: string) {
  const sb = getSupabase()
  if (!sb) throw new Error('Auth is not configured.')
  const { error } = await sb.auth.signUp({ email, password })
  if (error) throw error
}

export async function signOut() {
  const sb = getSupabase()
  if (!sb) return
  await sb.auth.signOut()
}

export function openAuthScreen() {
  const url = new URL(window.location.href)
  url.searchParams.set('auth', '1')
  window.history.replaceState({}, '', url.toString())
}

export function closeAuthScreen() {
  const url = new URL(window.location.href)
  url.searchParams.delete('auth')
  window.history.replaceState({}, '', url.toString())
}

export function isAuthScreenOpen(): boolean {
  return new URLSearchParams(window.location.search).get('auth') === '1'
}
