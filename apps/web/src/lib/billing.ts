import { getAccessToken } from './auth'
import { getUpgradeUrl, resolveApiBase } from './api'

export type BillingError = Error & { status?: number; code?: string }

async function billingFetch(path: string, body: Record<string, string>) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = await getAccessToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${resolveApiBase()}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as { message?: string; code?: string; url?: string }
  if (!res.ok) {
    const err = new Error(data.message || 'Billing request failed') as BillingError
    err.status = res.status
    err.code = data.code
    throw err
  }
  return data as { url: string }
}

export async function startCheckout(plan: 'family' | 'business', interval: 'month' | 'year') {
  const { url } = await billingFetch('/billing/checkout', { plan, interval })
  if (!url) throw new Error('Checkout did not return a URL')
  window.location.assign(url)
}

export async function openBillingPortal() {
  const { url } = await billingFetch('/billing/portal', {})
  if (!url) throw new Error('Billing portal did not return a URL')
  window.location.assign(url)
}

/** In-app upgrade: checkout when signed in, otherwise open auth then pricing. */
export async function openUpgrade(plan: 'family' | 'business' = 'family', interval: 'month' | 'year' = 'month') {
  const external = getUpgradeUrl()
  if (external) {
    window.location.assign(external)
    return
  }
  const token = await getAccessToken()
  if (!token) {
    const { openAuthScreen } = await import('./auth')
    openAuthScreen()
    return
  }
  await startCheckout(plan, interval)
}
