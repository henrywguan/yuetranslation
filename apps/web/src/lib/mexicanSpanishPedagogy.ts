/**
 * Mexican Spanish educational helpers — situations and slang/culture notes.
 * Compact panes stay accented Spanish only; these feed details UI.
 */

import { spanishBareWord } from './mexicanSpanishStress'

export type MxSituationId = 'greet' | 'taco' | 'taxi' | 'family' | 'clinic' | 'react'

export type MxSituation = {
  id: MxSituationId
  /** Short chip label (English). */
  labelEn: string
  /** Short chip label (Chinese). */
  labelZh: string
  /** Ready chunks in central Mexican Spanish. */
  chunks: string[]
}

export type MxCultureNote = {
  /** Match against ES text (accent-insensitive). */
  terms: string[]
  /** Headword shown to the learner. */
  term: string
  noteEn: string
  noteZh: string
}

export const MX_SITUATIONS: MxSituation[] = [
  {
    id: 'greet',
    labelEn: 'Greeting',
    labelZh: '打招呼',
    chunks: ['Qué onda', 'Hola, ¿qué tal?', 'Mucho gusto', '¿Cómo andas?', 'Nos vemos'],
  },
  {
    id: 'taco',
    labelEn: 'Taco stand',
    labelZh: '買食',
    chunks: [
      '¿Me da unos tacos al pastor?',
      '¿Para aquí o para llevar?',
      'Con todo, por favor',
      '¿Cuánto es?',
      'Está bien rico',
    ],
  },
  {
    id: 'taxi',
    labelEn: 'Taxi / Uber',
    labelZh: '搭車',
    chunks: [
      '¿Me lleva al centro?',
      '¿Cuánto me cobra?',
      'Aquí está bien, gracias',
      '¿Va por Reforma?',
      '¿Mande?',
    ],
  },
  {
    id: 'family',
    labelEn: 'Family table',
    labelZh: '家庭',
    chunks: [
      '¿Ya comieron?',
      'Pásame la salsa, por favor',
      'Qué rico huele',
      'Con permiso',
      'Que les vaya bien',
    ],
  },
  {
    id: 'clinic',
    labelEn: 'Clinic',
    labelZh: '診所',
    chunks: [
      'Me duele la garganta',
      'Traigo cita a las tres',
      '¿Dónde está la farmacia?',
      'Necesito una receta',
      'Gracias, doctor',
    ],
  },
  {
    id: 'react',
    labelEn: 'React local',
    labelZh: '回應',
    chunks: ['Órale', 'Sale', 'Ándale', 'No manches', 'Qué padre', 'Ahorita', 'Chido'],
  },
]

export const MX_CULTURE_NOTES: MxCultureNote[] = [
  {
    terms: ['órale', 'orale'],
    term: 'órale',
    noteEn: 'Very Mexican. Agreement, surprise, or “come on” — tone decides the meaning.',
    noteZh: '好墨西哥。同意、驚訝或「嚟啦」——語氣決定意思。',
  },
  {
    terms: ['ahorita'],
    term: 'ahorita',
    noteEn: 'Can mean now, soon, later, or never. Ask if timing matters.',
    noteZh: '可以係而家、陣間、稍後，甚至「唔會」。時間重要就問清楚。',
  },
  {
    terms: ['¿mande?', 'mande'],
    term: '¿mande?',
    noteEn: 'Polite “pardon?” in Mexico — softer than ¿qué? with strangers or elders.',
    noteZh: '墨西哥禮貌嘅「唔好意思？」——對外人或長輩比 ¿qué? 客氣。',
  },
  {
    terms: ['qué onda', 'que onda'],
    term: 'qué onda',
    noteEn: 'Casual “what’s up?” Central MX greeting among friends.',
    noteZh: '隨便打招呼，朋友之間好似「點呀」。',
  },
  {
    terms: ['no manches'],
    term: 'no manches',
    noteEn: '“No way” / “you’re kidding.” Informal; skip in formal settings.',
    noteZh: '「唔好意思／嚇死人」口語；正式場合唔好用。',
  },
  {
    terms: ['sale'],
    term: 'sale',
    noteEn: 'Like “deal” / “ok then.” Common closer after agreeing on a plan.',
    noteZh: '好似「就咁話」——約好之後常用。',
  },
  {
    terms: ['chido', 'padre', 'qué padre', 'que padre'],
    term: 'chido / qué padre',
    noteEn: '“Cool” / “awesome.” Mexican everyday praise — not Peninsular guay.',
    noteZh: '「正／好正」。墨西哥日常讚美，唔係西班牙嘅 guay。',
  },
  {
    terms: ['güey', 'guey', 'wey'],
    term: 'güey',
    noteEn: 'Buddy / dude among close friends. Can offend strangers — use carefully.',
    noteZh: '熟人叫「老兄」。陌生人可能會得罪——小心用。',
  },
  {
    terms: ['platicar'],
    term: 'platicar',
    noteEn: 'Mexican for “to chat.” Spain prefers hablar / charlar.',
    noteZh: '墨西哥「傾計」。西班牙多用 hablar / charlar。',
  },
  {
    terms: ['ustedes'],
    term: 'ustedes',
    noteEn: 'Mexico uses ustedes for plural “you” — never vosotros.',
    noteZh: '墨西哥複數「你哋」用 ustedes——唔用 vosotros。',
  },
]

function foldEs(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[¿?¡!.,;:"""''…—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokens(s: string): string[] {
  return foldEs(s)
    .split(' ')
    .map((t) => spanishBareWord(t))
    .filter(Boolean)
}

/** Pick the best culture note that appears in this Mexican Spanish line. */
export function cultureNoteFor(text: string): MxCultureNote | null {
  const folded = foldEs(text)
  if (!folded) return null
  let best: MxCultureNote | null = null
  let bestLen = 0
  for (const note of MX_CULTURE_NOTES) {
    for (const term of note.terms) {
      const ft = foldEs(term)
      if (!ft) continue
      if ((folded === ft || folded.includes(` ${ft} `) || folded.startsWith(`${ft} `) || folded.endsWith(` ${ft}`) || folded.includes(ft)) && ft.length >= bestLen) {
        best = note
        bestLen = ft.length
      }
    }
  }
  return best
}

/** Suggest situations whose chunks overlap the current line, else default set. */
export function situationsFor(text: string): MxSituation[] {
  const folded = foldEs(text)
  if (!folded) return MX_SITUATIONS
  const hits = MX_SITUATIONS.filter((s) =>
    s.chunks.some((c) => {
      const fc = foldEs(c)
      return folded.includes(fc) || fc.includes(folded) || tokens(c).some((t) => t.length > 3 && folded.includes(t))
    }),
  )
  return hits.length ? hits : MX_SITUATIONS
}
