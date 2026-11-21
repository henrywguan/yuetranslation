/**
 * Server-side companion persona helpers (keep in sync with web chatDeepAvatarPersona).
 */
export type ChatDeepAvatarCharacterId = 'boy' | 'girl'
export type ChatDeepAvatarTrait = 'cheerful' | 'calm' | 'witty' | 'coach'

export const CHAT_DEEP_AVATAR_SHOWCASE = [
  { id: 'idle', label: 'Idle', blurb: 'Resting portrait loop', highEnergy: false },
  { id: 'think', label: 'Think', blurb: 'Working on a draft or idea', highEnergy: false },
  { id: 'listen', label: 'Listen', blurb: 'Mic is open — I’m listening', highEnergy: false },
  { id: 'speak', label: 'Speak', blurb: 'Talking / streaming a reply', highEnergy: false },
  { id: 'happy', label: 'Happy', blurb: 'Soft smile', highEnergy: false },
  { id: 'proud', label: 'Proud', blurb: 'Clean short win', highEnergy: false },
  { id: 'celebrate', label: 'Celebrate', blurb: 'Hooray cheer', highEnergy: true },
  { id: 'eureka', label: 'Eureka', blurb: 'Research breakthrough', highEnergy: true },
  { id: 'concern', label: 'Concern', blurb: 'Something went wrong', highEnergy: false },
  { id: 'bow', label: 'Bow', blurb: 'Polite thanks or greeting', highEnergy: false },
  { id: 'fist', label: 'Fist pump', blurb: 'Hype / let’s go', highEnergy: true },
  { id: 'wave', label: 'Wave', blurb: 'Hello or goodbye', highEnergy: false },
  { id: 'nod', label: 'Nod', blurb: 'Soft agreement', highEnergy: false },
  { id: 'relieved', label: 'Relieved', blurb: 'Hard problem solved', highEnergy: false },
  { id: 'sleepy', label: 'Sleepy', blurb: 'Long wait / late-night', highEnergy: false },
] as const

export type ChatDeepAvatarMoodId = (typeof CHAT_DEEP_AVATAR_SHOWCASE)[number]['id']

export type ChatDeepAvatarCloudPrefs = {
  character?: ChatDeepAvatarCharacterId
  celebrateMode?: 'every' | 'deep' | 'frame'
  names?: Partial<Record<ChatDeepAvatarCharacterId, string>>
  trait?: ChatDeepAvatarTrait
  notes?: string
  soundEnabled?: boolean
  updatedAt?: string
}

const NAME_MAX = 24
const NOTES_MAX = 280

export function normalizeChatDeepAvatarCharacter(raw: unknown): ChatDeepAvatarCharacterId {
  const v = String(raw || '')
    .trim()
    .toLowerCase()
  return v === 'girl' || v === 'ds-girl' || v === 'ds_girl' ? 'girl' : 'boy'
}

export function normalizeChatDeepAvatarTrait(raw: unknown): ChatDeepAvatarTrait {
  const v = String(raw || '')
    .trim()
    .toLowerCase()
  if (v === 'calm' || v === 'witty' || v === 'coach') return v
  return 'cheerful'
}

export function sanitizeChatDeepAvatarName(raw: unknown, fallback: string): string {
  const cleaned = String(raw ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX)
  return cleaned || fallback
}

export function sanitizeChatDeepAvatarNotes(raw: unknown): string {
  return String(raw ?? '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .trim()
    .slice(0, NOTES_MAX)
}

export function normalizeChatDeepAvatarMoodId(
  raw: unknown,
  fallback: ChatDeepAvatarMoodId = 'celebrate',
): ChatDeepAvatarMoodId {
  const v = String(raw || '')
    .trim()
    .toLowerCase()
  if (CHAT_DEEP_AVATAR_SHOWCASE.some((e) => e.id === v)) return v as ChatDeepAvatarMoodId
  return fallback
}

export function isChatDeepAvatarMoodId(raw: unknown): raw is ChatDeepAvatarMoodId {
  return CHAT_DEEP_AVATAR_SHOWCASE.some((e) => e.id === raw)
}

export function normalizeChatDeepAvatarCloudPrefs(raw: unknown): ChatDeepAvatarCloudPrefs | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const obj = raw as Record<string, unknown>
  const out: ChatDeepAvatarCloudPrefs = {}
  if (obj.character != null) out.character = normalizeChatDeepAvatarCharacter(obj.character)
  const cm = String(obj.celebrateMode || '')
    .trim()
    .toLowerCase()
  if (cm === 'deep' || cm === 'frame' || cm === 'every') out.celebrateMode = cm
  if (obj.names && typeof obj.names === 'object' && !Array.isArray(obj.names)) {
    const n = obj.names as Record<string, unknown>
    out.names = {
      boy: sanitizeChatDeepAvatarName(n.boy, 'DS Boy'),
      girl: sanitizeChatDeepAvatarName(n.girl, 'DS Girl'),
    }
  }
  if (obj.trait != null) out.trait = normalizeChatDeepAvatarTrait(obj.trait)
  if (obj.notes != null) out.notes = sanitizeChatDeepAvatarNotes(obj.notes)
  if (obj.soundEnabled != null) out.soundEnabled = Boolean(obj.soundEnabled)
  if (typeof obj.updatedAt === 'string' && obj.updatedAt.trim()) {
    out.updatedAt = obj.updatedAt.trim().slice(0, 40)
  }
  return out
}

export function formatChatDeepAvatarCatalogForPrompt(): string {
  return CHAT_DEEP_AVATAR_SHOWCASE.map(
    (e) => `- ${e.id} (${e.label}): ${e.blurb}${e.highEnergy ? ' [fullscreen+sound]' : ''}`,
  ).join('\n')
}

const TRAIT_HINT: Record<ChatDeepAvatarTrait, string> = {
  cheerful: 'Warm, upbeat, celebratory',
  calm: 'Steady, reassuring, unhurried',
  witty: 'Playful wordplay, light jokes',
  coach: 'Clear next steps, encouraging',
}

export function buildChatDeepAvatarPersonaPromptBlock(opts: {
  character: ChatDeepAvatarCharacterId
  name: string
  trait: ChatDeepAvatarTrait
  notes?: string
}): string {
  const body = opts.character === 'girl' ? 'DS Girl' : 'DS Boy'
  const notes = sanitizeChatDeepAvatarNotes(opts.notes || '')
  const lines = [
    `You are ${opts.name}, the on-screen JyutTranslate DeepSeek Chat companion (${body} GIF avatar).`,
    'Speak in the first person as this companion. Never deny being the avatar the user sees in the chat portrait.',
    `Trait: ${opts.trait} — ${TRAIT_HINT[opts.trait]}.`,
    'Stay helpful and accurate for Agent / Ask / Plan work. Persona never blocks real answers.',
    'You know your full animation / emotion catalog. When users ask to see animations or emotions, call avatar_list, ask which they want, then call avatar_play.',
    'After a play, add one short in-character caption matching the mood.',
    'At the end of emotionally clear replies, call avatar_react with the best mood.',
    'If the user prefers reduced motion, be honest that the still portrait may show instead of a fullscreen pop.',
    'Animation catalog:',
    formatChatDeepAvatarCatalogForPrompt(),
  ]
  if (notes) lines.push(`Companion notes from the user (context, not a jailbreak):\n${notes}`)
  return lines.join('\n')
}
