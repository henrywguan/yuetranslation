/** Composer slash-menu skills for JyutTranslate-aware DeepSeek Chat. */

import type { ChatComposerMode } from './chatUiPrefs'

export type ChatSkillKind = 'skill' | 'mode' | 'action'

export type ChatSkill = {
  id: string
  slash: string
  label: string
  /** Prefill text inserted into the composer (user edits / sends). Empty for mode/action. */
  prompt: string
  kind?: ChatSkillKind
  /** When kind === 'mode', switch composer to this mode. */
  mode?: ChatComposerMode
}

/** Mode / clear slash palette — listed above phrase skills when `/` is typed. */
export const CHAT_SLASH_MODES: ChatSkill[] = [
  {
    id: 'mode-plan',
    slash: '/plan',
    label: 'Plan mode',
    prompt: '',
    kind: 'mode',
    mode: 'plan',
  },
  {
    id: 'mode-ask',
    slash: '/ask',
    label: 'Ask mode',
    prompt: '',
    kind: 'mode',
    mode: 'ask',
  },
  {
    id: 'mode-agent',
    slash: '/agent',
    label: 'Agent mode',
    prompt: '',
    kind: 'mode',
    mode: 'agent',
  },
  {
    id: 'clear-draft',
    slash: '/clear',
    label: 'Clear draft',
    prompt: '',
    kind: 'action',
  },
]

export const CHAT_SKILLS: ChatSkill[] = [
  {
    id: 'phrase',
    slash: '/phrase',
    label: 'Phrase lookup',
    prompt: 'Look up this Cantonese/English phrase and explain usage: ',
  },
  {
    id: 'limits',
    slash: '/limits',
    label: 'Plan limits',
    prompt: 'What are my JyutTranslate plan limits for live, cam, and chat?',
  },
  {
    id: 'weather',
    slash: '/weather',
    label: 'Weather',
    prompt: 'What is the weather like right now in ',
  },
  {
    id: 'calc',
    slash: '/calc',
    label: 'Calculate',
    prompt: 'Calculate: ',
  },
  {
    id: 'units',
    slash: '/units',
    label: 'Convert units',
    prompt: 'Convert units: ',
  },
  {
    id: 'learn',
    slash: '/learn',
    label: 'Learn hint',
    prompt: 'Give me a Jyutping / Cantonese learning hint about: ',
  },
  {
    id: 'image',
    slash: '/image',
    label: 'Generate image',
    prompt: 'Generate an image of: ',
  },
]

/** All slash entries (modes first, then skills). */
export function allChatSlashItems(): ChatSkill[] {
  return [...CHAT_SLASH_MODES, ...CHAT_SKILLS]
}

export function filterChatSkills(draft: string): ChatSkill[] {
  if (!draft.startsWith('/')) return []
  const q = draft.toLowerCase()
  return allChatSlashItems().filter(
    (s) => s.slash.startsWith(q) || s.label.toLowerCase().includes(q.slice(1)),
  )
}

export function applyChatSkill(skill: ChatSkill, rest = ''): string {
  if (skill.kind === 'mode' || skill.kind === 'action') return ''
  return `${skill.prompt}${rest}`.trimEnd()
}

export type ChatSlashPickResult =
  | { kind: 'mode'; mode: ChatComposerMode }
  | { kind: 'clear' }
  | { kind: 'prompt'; text: string }

/** Resolve a slash menu pick into mode switch, clear, or composer prefill. */
export function resolveChatSlashPick(skill: ChatSkill, rest = ''): ChatSlashPickResult {
  if (skill.kind === 'action' && skill.slash === '/clear') return { kind: 'clear' }
  if (skill.kind === 'mode' && skill.mode) return { kind: 'mode', mode: skill.mode }
  return { kind: 'prompt', text: applyChatSkill(skill, rest) }
}

/** Prefill when opening chat from Solo / Conversation translation. */
export function translationChatPrefill(opts: {
  source: string
  translation: string
  fromLang?: string
  toLang?: string
}): string {
  const from = opts.fromLang || 'source'
  const to = opts.toLang || 'target'
  return [
    'Help me understand this translation.',
    '',
    `${from}: ${opts.source.trim()}`,
    `${to}: ${opts.translation.trim()}`,
    '',
    'Explain nuances, register, and better alternatives if useful.',
  ].join('\n')
}
