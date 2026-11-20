/**
 * Lightweight bus for DeepSeek chat companion moods / TTS lips.
 * Dictate listening + chat TTS playback are local to their modules;
 * the avatar subscribes here without prop-drilling through AUI.
 *
 * Lip level is amplitude / vowel approx (not phonemes). Real Web Audio
 * analysis is best-effort; while TTS is marked playing we always fall back
 * to a synthetic envelope so lips still move on iPhone / speechSynthesis.
 *
 * Plan→Build latch lives in `chatDeepAvatarPlanBuild.ts` (re-exported here).
 */
import { useSyncExternalStore } from 'react'
import { isTtsPlaying } from './tts'
import {
  __resetChatDeepAvatarPlanBuildForTests,
  getChatDeepAvatarPlanBuildSettleEpoch,
  subscribeChatDeepAvatarPlanBuild,
} from './chatDeepAvatarPlanBuild'

export type ChatDeepAvatarSignals = {
  listening: boolean
  /** DeepSeek chat TTS (`playDeepseekChatTtsBlob` / streaming auto-speak). */
  chatTtsPlaying: boolean
}

const state: ChatDeepAvatarSignals = {
  listening: false,
  chatTtsPlaying: false,
}

const listeners = new Set<() => void>()

function emit() {
  for (const fn of listeners) fn()
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

function getSnapshot(): ChatDeepAvatarSignals {
  return state
}

export function setChatDeepAvatarListening(listening: boolean) {
  if (state.listening === listening) return
  state.listening = listening
  emit()
}

export function setChatDeepAvatarTtsPlaying(playing: boolean) {
  if (state.chatTtsPlaying === playing) return
  state.chatTtsPlaying = playing
  emit()
}

export function getChatDeepAvatarSignals(): ChatDeepAvatarSignals {
  return state
}

export function useChatDeepAvatarSignals(): ChatDeepAvatarSignals {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/** True when Azure / browser TTS or DeepSeek chat TTS is audibly playing. */
export function isChatAvatarTtsActive(): boolean {
  return state.chatTtsPlaying || isTtsPlaying()
}

/**
 * 0–1 mouth open amount. Synthetic vowel-ish envelope while TTS plays;
 * ~0 when silent. Not a phoneme aligner.
 */
export function getChatDeepAvatarLipLevel(now = performance.now()): number {
  if (!isChatAvatarTtsActive()) return 0
  // Two sine carriers + a slower AM → irregular open/close (vowel approx).
  const a = 0.55 + 0.45 * Math.sin(now / 55)
  const b = 0.35 + 0.3 * Math.sin(now / 37 + 1.7)
  const gate = 0.65 + 0.35 * Math.sin(now / 210)
  return Math.max(0, Math.min(1, a * b * gate))
}

export function useChatDeepAvatarPlanBuildSettleEpoch(): number {
  return useSyncExternalStore(
    subscribeChatDeepAvatarPlanBuild,
    getChatDeepAvatarPlanBuildSettleEpoch,
    () => 0,
  )
}

/** Test helper — reset bus between smoke runs. */
export function __resetChatDeepAvatarSignalsForTests() {
  state.listening = false
  state.chatTtsPlaying = false
  __resetChatDeepAvatarPlanBuildForTests()
  emit()
}

export {
  abortChatDeepAvatarPlanBuild,
  consumeChatDeepAvatarPlanBuild,
  isChatDeepAvatarPlanBuildChainBusy,
  markChatDeepAvatarPlanBuild,
  peekChatDeepAvatarPlanBuild,
  setChatDeepAvatarPlanBuildChainBusy,
  settleChatDeepAvatarPlanBuild,
} from './chatDeepAvatarPlanBuild'
