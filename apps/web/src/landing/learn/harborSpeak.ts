/**
 * Harbor Quest TTS — always auto-plays in-quest audio.
 * Independent of Account Hub Auto-speak (Solo / Conversation Family pref).
 */
import type { Lang } from '../../lib/types'
import { useYueStore } from '../../lib/store'
import { holdHarborBgmDuck, releaseHarborBgmDuck } from './harborBgm'

/** Duck BGM and speak Cantonese (Harbor pier / arena / 港灣). */
export async function speakHarborTts(text: string, lang: Lang = 'yue'): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) return
  holdHarborBgmDuck()
  try {
    await useYueStore.getState().speakManual(trimmed, lang)
  } finally {
    releaseHarborBgmDuck()
  }
}
