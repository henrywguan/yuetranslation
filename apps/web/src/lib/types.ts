export type Lang = 'en' | 'yue'
export type Mode = 'solo' | 'conversation' | 'text' | 'camera'
export type SpeakDirection = 'en' | 'yue' | 'cmn'

export type Entitlement = {
  loggedIn: boolean
  requireLogin: boolean
  plan: 'guest' | 'free' | 'family' | 'business'
  isAdmin?: boolean
  role?: 'admin' | 'family' | null
  disabled?: boolean
  limits: {
    plan: string
    live_minutes: number
    tts_chars: number
    camera_minutes?: number
    docs_pages?: number
    auto_speak: boolean
    can_live: boolean
    can_camera?: boolean
    can_docs?: boolean
    text_translate: boolean
  }
  usage: {
    month: string
    liveSeconds: number
    ttsChars: number
    translateCount: number
    cameraSeconds?: number
    cameraTranslateCount?: number
    docsPages?: number
    /** Multimodal LLM OCR fallback calls (view-only meter). */
    aiVisionCount?: number
  }
  remaining: {
    liveSeconds: number
    ttsChars: number
    cameraSeconds?: number
    /** -1 when unlimited (Business). */
    docsPages?: number
  }
  /** Family/Business: usage tracked, never gates the speaker. */
  ttsUnlimited?: boolean
  /** Business: usage tracked, never gates camera. */
  cameraUnlimited?: boolean
  /** Business: usage tracked, never gates documents. */
  docsUnlimited?: boolean
  upgradeUrl: string
  loginUrl: string
  allowed: {
    live: boolean
    autoSpeak: boolean
    textTranslate: boolean
    tts: boolean
    camera?: boolean
    docs?: boolean
  }
  reason: string | null
  /** Synced account preferences. */
  prefs?: {
    ttsVoiceYue: string
    ttsVoiceEn: string
    username?: string | null
    usernameChangedAt?: string | null
  }
  /** Family/Business household seats with pooled monthly usage. */
  household?: HouseholdSummary | null
}

export type HouseholdSummary = {
  id: string
  plan: 'family' | 'business'
  seatLimit: number
  seatUsed: number
  role: 'owner' | 'member'
  pooled: true
  members: Array<{
    userId: string
    role: 'owner' | 'member'
    email: string | null
    joinedAt: string
  }>
  pendingInvites: Array<{
    id: string
    email: string
    createdAt: string
    expiresAt: string
  }>
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
