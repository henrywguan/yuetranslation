import type { Response } from 'express'
import Stripe from 'stripe'
import { requireAuth, type AuthedRequest } from './auth.js'
import { env } from './env.js'
import {
  findProfileByStripeCustomer,
  findProfileByStripeSubscription,
  getAuthUserById,
  getProfile,
  upsertProfilePlan,
} from './supabase.js'
import { notifyUserUpgrade } from './notify.js'

let stripe: Stripe | null = null

function getStripe(): Stripe | null {
  if (!env.stripeSecretKey) return null
  if (!stripe) stripe = new Stripe(env.stripeSecretKey)
  return stripe
}

function priceIdFor(plan: 'pro' | 'max', interval: 'month' | 'year'): string | null {
  if (plan === 'pro') return interval === 'year' ? env.stripePriceProYear : env.stripePriceProMonth
  return interval === 'year' ? env.stripePriceMaxYear : env.stripePriceMaxMonth
}

function planFromPriceId(priceId: string | null | undefined): 'pro' | 'max' | null {
  if (!priceId) return null
  const pro = [env.stripePriceProMonth, env.stripePriceProYear].filter(Boolean)
  const max = [env.stripePriceMaxMonth, env.stripePriceMaxYear].filter(Boolean)
  if (pro.includes(priceId)) return 'pro'
  if (max.includes(priceId)) return 'max'
  return null
}

function appUrl(req: AuthedRequest): string {
  if (env.appUrl) return env.appUrl.replace(/\/+$/, '')
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const proto = req.headers['x-forwarded-proto'] || 'https'
  return `${proto}://${host}`
}

export async function startCheckout(req: AuthedRequest, res: Response) {
  const auth = requireAuth(req, res)
  if (!auth) return

  const client = getStripe()
  if (!client) {
    res.status(503).json({ message: 'Billing is not configured.' })
    return
  }

  const plan = req.body?.plan === 'max' ? 'max' : 'pro'
  const interval = req.body?.interval === 'year' ? 'year' : 'month'
  const priceId = priceIdFor(plan, interval)
  if (!priceId) {
    res.status(400).json({ message: 'Price is not configured for this plan.' })
    return
  }

  const profile = await getProfile(auth.userId)
  const base = appUrl(req)

  const session = await client.checkout.sessions.create({
    mode: 'subscription',
    customer: profile?.stripe_customer_id ?? undefined,
    customer_email: profile?.stripe_customer_id ? undefined : auth.email ?? undefined,
    client_reference_id: auth.userId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/#/app?checkout=success`,
    cancel_url: `${base}/#/pricing?checkout=cancel`,
    metadata: { user_id: auth.userId, plan },
  })

  res.json({ url: session.url })
}

export async function startPortal(req: AuthedRequest, res: Response) {
  const auth = requireAuth(req, res)
  if (!auth) return

  const client = getStripe()
  if (!client) {
    res.status(503).json({ message: 'Billing is not configured.' })
    return
  }

  const profile = await getProfile(auth.userId)
  if (!profile?.stripe_customer_id) {
    res.status(400).json({
      message: 'No Stripe billing account yet. Subscribe from Pricing first.',
      code: 'no_stripe_customer',
    })
    return
  }

  try {
    const session = await client.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl(req)}/#/app`,
    })
    res.json({ url: session.url })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Could not open billing portal'
    const portalHint =
      /customer portal|billing portal|configuration/i.test(msg)
        ? ' Activate Customer Portal in Stripe Dashboard → Settings → Billing → Customer portal.'
        : ''
    console.error('Stripe billing portal error', e)
    res.status(502).json({ message: `${msg}${portalHint}`, code: 'portal_failed' })
  }
}

async function setPlanForUser(userId: string, plan: 'free' | 'pro' | 'max', customerId?: string, subscriptionId?: string) {
  await upsertProfilePlan(userId, {
    plan,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
  })
}

export async function handleBillingWebhook(req: AuthedRequest, res: Response) {
  const client = getStripe()
  if (!client || !env.stripeWebhookSecret) {
    res.status(503).json({ message: 'Billing webhook is not configured.' })
    return
  }

  const sig = req.headers['stripe-signature']
  if (!sig || typeof sig !== 'string') {
    res.status(400).send('Missing stripe-signature')
    return
  }

  let event: Stripe.Event
  try {
    event = client.webhooks.constructEvent(req.body as Buffer, sig, env.stripeWebhookSecret)
  } catch (e) {
    res.status(400).send(`Webhook Error: ${e instanceof Error ? e.message : 'invalid'}`)
    return
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id || session.metadata?.user_id
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
        const subscriptionId =
          typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
        const plan = (session.metadata?.plan as 'pro' | 'max' | undefined) ?? 'pro'
        if (userId) {
          const previous = (await getProfile(userId))?.plan ?? 'free'
          await setPlanForUser(userId, plan, customerId ?? undefined, subscriptionId ?? undefined)
          if (previous !== plan && (plan === 'pro' || plan === 'max')) {
            const user = await getAuthUserById(userId)
            notifyUserUpgrade({
              email: user?.email ?? session.customer_email ?? null,
              userId,
              plan,
              previousPlan: previous,
              source: 'stripe',
              stripeCustomerId: customerId ?? null,
            })
          }
        }
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        let profile = await findProfileByStripeSubscription(sub.id)
        if (!profile) profile = await findProfileByStripeCustomer(customerId)

        if (!profile) break

        if (event.type === 'customer.subscription.deleted' || sub.status === 'canceled' || sub.status === 'unpaid') {
          await setPlanForUser(profile.id, 'free', customerId, undefined)
          break
        }

        const priceId = sub.items.data[0]?.price?.id
        const plan = planFromPriceId(priceId) ?? 'pro'
        await setPlanForUser(profile.id, plan, customerId, sub.id)
        break
      }
      default:
        break
    }
  } catch (e) {
    console.error('Stripe webhook handler error', e)
    res.status(500).send('Webhook handler failed')
    return
  }

  res.json({ received: true })
}
