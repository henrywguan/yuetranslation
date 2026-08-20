import { getAccessToken } from './auth'
import { getUpgradeUrl, resolveApiBase } from './api'

async function billingFetch(path: string, body: Record<string, string>) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = await getAccessToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${resolveApiBase()}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw Object.assign(new Error(data.message || 'Billing request failed'), { status: res.status })
  }
  return data as { url: string }
}

export async function startCheckout(plan: 'pro' | 'max', interval: 'month' | 'year') {
  const { url } = await billingFetch('/billing/checkout', { plan, interval })
  window.location.assign(url)
}

export async function openBillingPortal() {
  const { url } = await billingFetch('/billing/portal', {})
  window.location.assign(url)
}

/** In-app upgrade: checkout when signed in, otherwise open auth then pricing. */
export async function openUpgrade(plan: 'pro' | 'max' = 'pro', interval: 'month' | 'year' = 'month') {
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
