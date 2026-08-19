import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { env } from './env.js'

let admin: SupabaseClient | null = null

export function supabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseServiceRole)
}

export function getAdmin(): SupabaseClient | null {
  if (!supabaseConfigured()) return null
  if (!admin) {
    admin = createClient(env.supabaseUrl, env.supabaseServiceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return admin
}

export async function getUserFromJwt(jwt: string): Promise<User | null> {
  const client = getAdmin()
  if (!client) return null
  const { data, error } = await client.auth.getUser(jwt)
  if (error || !data.user) return null
  return data.user
}

export type ProfileRow = {
  id: string
  plan: 'free' | 'pro' | 'max'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  updated_at: string
}

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const client = getAdmin()
  if (!client) return null
  const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error || !data) return null
  return data as ProfileRow
}

export async function upsertProfilePlan(
  userId: string,
  patch: Partial<Pick<ProfileRow, 'plan' | 'stripe_customer_id' | 'stripe_subscription_id'>>,
): Promise<void> {
  const client = getAdmin()
  if (!client) return
  await client
    .from('profiles')
    .upsert({ id: userId, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'id' })
}

export async function findProfileByStripeCustomer(customerId: string): Promise<ProfileRow | null> {
  const client = getAdmin()
  if (!client) return null
  const { data } = await client
    .from('profiles')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  return (data as ProfileRow | null) ?? null
}

export async function findProfileByStripeSubscription(subscriptionId: string): Promise<ProfileRow | null> {
  const client = getAdmin()
  if (!client) return null
  const { data } = await client
    .from('profiles')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle()
  return (data as ProfileRow | null) ?? null
}
