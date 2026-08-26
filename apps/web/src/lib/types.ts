export type Lang = 'en' | 'yue'
export type CameraLang = 'en' | 'zh'
export type Mode = 'solo' | 'conversation' | 'text' | 'camera'
export type SpeakDirection = 'en' | 'yue' | 'cmn'

export type Entitlement = {
  loggedIn: boolean
  requireLogin: boolean
  plan: 'guest' | 'free' | 'pro' | 'max'
  isAdmin?: boolean
  disabled?: boolean
  limits: {
    plan: string
    live_minutes: number
    tts_chars: number
    camera_minutes?: number
    auto_speak: boolean
    can_live: boolean
    can_camera?: boolean
    text_translate: boolean
  }
  usage: {
    month: string
    liveSeconds: number
    ttsChars: number
    translateCount: number
    cameraSeconds?: number
    cameraTranslateCount?: number
  }
  remaining: { liveSeconds: number; ttsChars: number; cameraSeconds?: number }
  /** Pro/Max: usage tracked, never gates the speaker. */
  ttsUnlimited?: boolean
  /** Max: usage tracked, never gates camera. */
  cameraUnlimited?: boolean
  upgradeUrl: string
  loginUrl: string
  allowed: {
    live: boolean
    autoSpeak: boolean
    textTranslate: boolean
    tts: boolean
    camera?: boolean
  }
  reason: string | null
}

export type ConversationTurn = {
  id: string
  from: Lang
  to: Lang
  source: string
  translation: string
  /** Short English gloss for clarity (esp. beside Cantonese results). */
  definition?: string
  /** Multiple English senses for the Cantonese phrase (details pane). */
  definitions?: string[]
  /** Other colloquial EN→粵 renderings when the API found meaningful variants. */
  alternatives?: string[]
  at: number
}

export type SpeechMeta = {
  /** Azure conversation diarization id (e.g. Guest-1), when available. */
  speakerId?: string
}

export type SpeechEventHandlers = {
  onInterim: (lang: Lang, text: string, meta?: SpeechMeta) => void
  onFinal: (lang: Lang, text: string, meta?: SpeechMeta) => void
  onError: (message: string) => void
  onStatus: (status: 'listening' | 'idle' | 'speaking') => void
}

export type LiveSession = {
  start: () => Promise<void>
  stop: () => Promise<void>
  setPlaybackActive: (active: boolean) => void
}
