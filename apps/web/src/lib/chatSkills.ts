/** Composer slash-menu skills for JyutTranslate-aware DeepSeek Chat. */

export type ChatSkill = {
  id: string
  slash: string
  label: string
  /** Prefill text inserted into the composer (user edits / sends). */
  prompt: string
}

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
]

/** Match `/skill` or `/skill rest` at the start of the draft. */
export function matchChatSkillDraft(draft: string): { skill: ChatSkill; rest: string } | null {
  const m = draft.match(/^\/([a-z]+)(?:\s+(.*))?$/i)
  if (!m) return null
  const key = `/${(m[1] || '').toLowerCase()}`
  const skill = CHAT_SKILLS.find((s) => s.slash === key)
  if (!skill) return null
  return { skill, rest: (m[2] || '').trim() }
}

export function filterChatSkills(draft: string): ChatSkill[] {
  if (!draft.startsWith('/')) return []
  const q = draft.toLowerCase()
  return CHAT_SKILLS.filter((s) => s.slash.startsWith(q) || s.label.toLowerCase().includes(q.slice(1)))
}

export function applyChatSkill(skill: ChatSkill, rest = ''): string {
  return `${skill.prompt}${rest}`.trimEnd()
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
