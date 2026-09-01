import { navigate } from './useHashRoute'

export type SiteConfig = {
  /** Absolute URL of the Bricks (or WP) page that embeds `[yue_translator]`. */
  translatorUrl?: string
  /** Absolute URL of pricing / checkout (MemberPress, etc.). */
  pricingUrl?: string
  /** Absolute URL of the static marketing site (optional back-link). */
  marketingUrl?: string
}

let cached: SiteConfig | null = null
let loadPromise: Promise<SiteConfig> | null = null

function fromEnv(): SiteConfig {
  return {
    translatorUrl: (import.meta.env.VITE_TRANSLATOR_URL as string | undefined)?.trim() || '',
    pricingUrl: (import.meta.env.VITE_PRICING_URL as string | undefined)?.trim() || '',
    marketingUrl: (import.meta.env.VITE_MARKETING_URL as string | undefined)?.trim() || '',
  }
}

function fromQuery(): SiteConfig {
  if (typeof window === 'undefined') return {}
  const q = new URLSearchParams(window.location.search)
  return {
    translatorUrl: q.get('translator') || '',
    pricingUrl: q.get('pricing') || '',
    marketingUrl: q.get('marketing') || '',
  }
}

function merge(...parts: SiteConfig[]): SiteConfig {
  const out: SiteConfig = {}
  for (const part of parts) {
    if (part.translatorUrl) out.translatorUrl = part.translatorUrl
    if (part.pricingUrl) out.pricingUrl = part.pricingUrl
    if (part.marketingUrl) out.marketingUrl = part.marketingUrl
  }
  return out
}

function configUrl(): string {
  const base = import.meta.env.BASE_URL || '/'
  if (base === './' || base.startsWith('.')) return './site-config.json'
  return `${base.replace(/\/?$/, '/')}site-config.json`
}

/** Load editable `site-config.json` (sits next to index.html on Bluehost). */
export function loadSiteConfig(): Promise<SiteConfig> {
  if (cached) return Promise.resolve(cached)
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    let file: SiteConfig = {}
    try {
      const res = await fetch(configUrl(), { cache: 'no-cache' })
      if (res.ok) file = (await res.json()) as SiteConfig
    } catch {
      file = {}
    }
    // Query overrides file; file overrides env — so Bluehost edits and shareable overrides win.
    cached = merge(fromEnv(), file, fromQuery())
    return cached
  })()

  return loadPromise
}

function getSiteConfig(): SiteConfig {
  return cached ?? merge(fromEnv(), fromQuery())
}

function leaveTo(url: string) {
  // Break out of WP splash iframes so Bricks pages load top-level.
  const target = window.top ?? window
  target.location.assign(url)
}

/** Open the translator: external Bricks URL when configured, else in-app `#/app`. */
export function openApp() {
  const url = getSiteConfig().translatorUrl?.trim()
  if (url) {
    leaveTo(url)
    return
  }
  navigate('app')
}

/** Open pricing: external checkout URL when configured, else in-app `#/pricing`. */
export function openPricing() {
  const url = getSiteConfig().pricingUrl?.trim()
  if (url) {
    leaveTo(url)
    return
  }
  navigate('pricing')
}

/** Open marketing home: external static site when configured, else `#/`. */
export function openHome() {
  const url = getSiteConfig().marketingUrl?.trim()
  if (url) {
    leaveTo(url)
    return
  }
  navigate('home')
}

/** Open the cinematic Cantonese tones explainer (`#/tones`). */
export function openTones() {
  navigate('tones')
}

/** Open Privacy Policy (`#/privacy`). */
export function openPrivacy() {
  navigate('privacy')
}

/** Open Terms of Service (`#/terms`). */
export function openTerms() {
  navigate('terms')
}
