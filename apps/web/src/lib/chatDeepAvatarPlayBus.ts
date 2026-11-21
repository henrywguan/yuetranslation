/**
 * Forced avatar play / react bus — SSE tools + client sentiment latch
 * CelebrateFx without waiting for natural outro.
 */
import { useSyncExternalStore } from 'react'
import {
  highEnergyAvatarMood,
  normalizeChatDeepAvatarShowcaseMood,
  showcaseMoodToClipMood,
  type ChatDeepAvatarShowcaseMood,
} from './chatDeepAvatarPersona'
import type { ChatDeepAvatarMood } from './chatDeepAvatarCharacter'

export type ChatDeepAvatarPlayRequest = {
  id: number
  mood: ChatDeepAvatarMood
  /** User/tool demo — always try fullscreen + audio. */
  forceFullscreen: boolean
  /** Soft react stays in-frame unless high-energy. */
  source: 'play' | 'react' | 'sentiment'
  at: number
}

let seq = 0
let current: ChatDeepAvatarPlayRequest | null = null
/** When a play/react already owned the turn, skip the automatic celebrate/proud/eureka outro. */
let suppressNaturalOutro = false
const listeners = new Set<() => void>()

function emit() {
  for (const fn of listeners) fn()
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function getSnapshot(): ChatDeepAvatarPlayRequest | null {
  return current
}

export function requestChatDeepAvatarPlay(
  moodRaw: unknown,
  opts?: { forceFullscreen?: boolean; source?: ChatDeepAvatarPlayRequest['source'] },
): ChatDeepAvatarPlayRequest {
  const showcase = normalizeChatDeepAvatarShowcaseMood(moodRaw)
  const mood = showcaseMoodToClipMood(showcase)
  const source = opts?.source ?? 'play'
  // avatar_play demos always fullscreen; reacts follow showcase highEnergy.
  const forceFullscreen =
    opts?.forceFullscreen !== undefined
      ? Boolean(opts.forceFullscreen)
      : source === 'play' || highEnergyAvatarMood(showcase)
  seq += 1
  current = {
    id: seq,
    mood,
    forceFullscreen,
    source,
    at: Date.now(),
  }
  // Tool/sentiment moods replace the post-run celebrate latch for this turn.
  suppressNaturalOutro = true
  emit()
  return current
}

export function requestChatDeepAvatarReact(moodRaw: unknown): ChatDeepAvatarPlayRequest {
  const showcase = normalizeChatDeepAvatarShowcaseMood(moodRaw)
  // High-energy reacts fullscreen; soft stay in-frame (handled by FX hook via force flag).
  return requestChatDeepAvatarPlay(showcase, {
    forceFullscreen: highEnergyAvatarMood(showcase),
    source: 'react',
  })
}

export function clearChatDeepAvatarPlay(id?: number) {
  if (current && (id == null || current.id === id)) {
    current = null
    emit()
  }
}

export function peekChatDeepAvatarPlay(): ChatDeepAvatarPlayRequest | null {
  return current
}

/** Consume one-shot “skip natural outro” latch (run-end / Plan→Build settle). */
export function consumeChatDeepAvatarOutroSuppression(): boolean {
  const skip = suppressNaturalOutro
  suppressNaturalOutro = false
  return skip
}

export function peekChatDeepAvatarOutroSuppression(): boolean {
  return suppressNaturalOutro
}

export function useChatDeepAvatarPlayRequest(): ChatDeepAvatarPlayRequest | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null)
}

/** Lightweight client sentiment fallback when the model skips avatar_react. */
export function inferChatDeepAvatarMoodFromText(text: string): ChatDeepAvatarShowcaseMood | null {
  const t = text.trim()
  if (!t || t.length < 8) return null
  if (/\b(sorry|unfortunately|error|failed|can't|cannot|unable)\b/i.test(t)) return 'concern'
  // Eureka before celebrate so “eureka / hooray we found it” does not collapse to cheer.
  if (/\b(eureka|figured it out|found it|breakthrough)\b/i.test(t)) return 'eureka'
  if (/\b(hooray|hurray|congrats|congratulations|🎉|🚢|shipped)\b/i.test(t)) return 'celebrate'
  if (/\b(let'?s go|you got this|crush it)\b/i.test(t)) return 'fist'
  if (/\b(thank you|thanks|grateful)\b/i.test(t)) return 'bow'
  if (/\b(hi+|hello|hey there|goodbye|bye)\b/i.test(t)) return 'wave'
  if (/\b(phew|relieved|that was close)\b/i.test(t)) return 'relieved'
  if (/\b(zzz|sleepy|good night|late[- ]?night)\b/i.test(t)) return 'sleepy'
  if (/\b(yes\.|exactly\.|agreed\.|correct\.)\b/i.test(t)) return 'nod'
  if (/\b(great|awesome|nice|glad|happy)\b/i.test(t)) return 'happy'
  if (/\b(proud|well done|nailed)\b/i.test(t)) return 'proud'
  return null
}

export function __resetChatDeepAvatarPlayBusForTests() {
  current = null
  seq = 0
  suppressNaturalOutro = false
  emit()
}
