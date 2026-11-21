/**
 * Forced avatar play / react bus — SSE tools + client sentiment latch
 * CelebrateFx without waiting for natural outro.
 */
import { useSyncExternalStore } from 'react'
import {
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
  seq += 1
  current = {
    id: seq,
    mood,
    forceFullscreen: opts?.forceFullscreen !== false,
    source: opts?.source ?? 'play',
    at: Date.now(),
  }
  emit()
  return current
}

export function requestChatDeepAvatarReact(moodRaw: unknown): ChatDeepAvatarPlayRequest {
  const showcase = normalizeChatDeepAvatarShowcaseMood(moodRaw) as ChatDeepAvatarShowcaseMood
  // High-energy reacts fullscreen; soft stay in-frame (handled by FX hook via force flag).
  const high = ['celebrate', 'proud', 'eureka', 'fist'].includes(showcase)
  return requestChatDeepAvatarPlay(showcase, {
    forceFullscreen: high,
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

export function useChatDeepAvatarPlayRequest(): ChatDeepAvatarPlayRequest | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null)
}

/** Lightweight client sentiment fallback when the model skips avatar_react. */
export function inferChatDeepAvatarMoodFromText(text: string): ChatDeepAvatarShowcaseMood | null {
  const t = text.trim()
  if (!t || t.length < 8) return null
  if (/\b(sorry|unfortunately|error|failed|can't|cannot|unable)\b/i.test(t)) return 'concern'
  if (/\b(hooray|congrats|congratulations|🎉|🚢|shipped)\b/i.test(t)) return 'celebrate'
  if (/\b(eureka|figured it out|found it|breakthrough)\b/i.test(t)) return 'eureka'
  if (/\b(let'?s go|you got this|crush it)\b/i.test(t)) return 'fist'
  if (/\b(thank you|thanks|grateful)\b/i.test(t)) return 'bow'
  if (/\b(hi+|hello|hey there|goodbye|bye)\b/i.test(t)) return 'wave'
  if (/\b(phew|relieved|that was close)\b/i.test(t)) return 'relieved'
  if (/\b(zzz|sleepy|good night|late)\b/i.test(t)) return 'sleepy'
  if (/\b(yes\.|exactly\.|agreed\.|correct\.)\b/i.test(t)) return 'nod'
  if (/\b(great|awesome|nice|glad|happy)\b/i.test(t)) return 'happy'
  if (/\b(proud|well done|nailed)\b/i.test(t)) return 'proud'
  return null
}

export function __resetChatDeepAvatarPlayBusForTests() {
  current = null
  seq = 0
  emit()
}
