export type Lang = 'en' | 'yue'
/** Reserved for future Mandarin support in shared translate/dictionary schemas. */
export type FutureLang = Lang | 'cmn'
export type Mode = 'solo' | 'conversation' | 'text'
export type SpeakDirection = 'auto' | 'en' | 'yue'

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

export type ConversationTurn = {
  id: string
  from: Lang
  to: Lang
  source: string
  translation: string
  /** Other colloquial EN→粵 renderings when the API found meaningful variants. */
  alternatives?: string[]
  at: number
  engine?: string
}

export type SpeechEventHandlers = {
  onInterim: (lang: Lang, text: string) => void
  onFinal: (lang: Lang, text: string) => void
  onError: (message: string) => void
  onStatus: (status: 'listening' | 'idle' | 'speaking') => void
  onBargeIn?: () => void
}

export type LiveSession = {
  start: () => Promise<void>
  stop: () => Promise<void>
  setPlaybackActive: (active: boolean) => void
}
