import { env } from './env.js';

export type Entitlement = {
  loggedIn: boolean
  requireLogin: boolean
  plan: 'guest' | 'free' | 'pro'
  limits: {
    plan: string
    live_minutes: number
    tts_chars: number
    auto_speak: boolean
    can_live: boolean
    text_translate: boolean
  }
  usage: { month: string; liveSeconds: number; ttsChars: number; translateCount: number }
  remaining: { liveSeconds: number; ttsChars: number }
  upgradeUrl: string
  loginUrl: string
  allowed: { live: boolean; autoSpeak: boolean; textTranslate: boolean; tts: boolean }
  reason: string | null
}

/** Local-dev soft entitlements (pro-like when YUE_OPEN_MODE=1). */
export function localEntitlement(): Entitlement {
  const month = new Date().toISOString().slice(0, 7).replace('-', '_')

  if (env.openMode) {
    return {
      loggedIn: true,
      requireLogin: false,
      plan: 'pro',
      limits: {
        plan: 'pro',
        live_minutes: 9999,
        tts_chars: 999999,
        auto_speak: true,
        can_live: true,
        text_translate: true,
      },
      usage: { month, liveSeconds: 0, ttsChars: 0, translateCount: 0 },
      remaining: { liveSeconds: 9999 * 60, ttsChars: 999999 },
      upgradeUrl: '',
      loginUrl: '',
      allowed: { live: true, autoSpeak: true, textTranslate: true, tts: true },
      reason: null,
    }
  }

  const liveMinutes = env.freeLiveMinutes
  const ttsChars = env.freeTtsChars
  const canLive = env.freeAllowLive && liveMinutes > 0
  const canTts = env.freeAllowTts && ttsChars > 0

  return {
    loggedIn: false,
    requireLogin: false,
    plan: 'free',
    limits: {
      plan: 'free',
      live_minutes: liveMinutes,
      tts_chars: ttsChars,
      auto_speak: canTts,
      can_live: canLive,
      text_translate: true,
    },
    usage: { month, liveSeconds: 0, ttsChars: 0, translateCount: 0 },
    remaining: { liveSeconds: liveMinutes * 60, ttsChars },
    upgradeUrl: '',
    loginUrl: '',
    allowed: {
      live: canLive,
      autoSpeak: canTts,
      textTranslate: true,
      tts: canTts,
    },
    reason: canLive ? null : 'no_live_quota',
  }
}
