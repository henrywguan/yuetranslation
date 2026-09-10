import type { ConversationLang } from './types'

/**
 * Conversation language-pure UI (mic button + pane hints).
 *
 * **When adding a Conversation language:** extend `VoiceLang` / `ConversationLang`
 * in `types.ts`, then add a full entry here. Text-only langs (`ceb` / `ilo`) stay
 * off this map — they are Solo + Cam only.
 *
 * `Record<ConversationLang, …>` makes `tsc` fail until Conversation copy exists —
 * do not special-case individual langs in ConversationView / LiveHoldButton.
 */

export type LiveMicKey =
  | 'holdOrTapToSpeak'
  | 'releaseWhenDone'
  | 'tapListening'
  | 'speaking'
  | 'translating'

export type ConversationPaneUi = {
  /** BCP-47 for `lang=` on mic label / hints. */
  htmlLang: string
  mic: Record<LiveMicKey, string>
  friendLooksHere: string
  holdFacingYou: string
}

const ZH_MIC: Record<LiveMicKey, string> = {
  holdOrTapToSpeak: '按住或輕按講',
  releaseWhenDone: '聽緊——鬆手就翻譯',
  tapListening: '聽緊——停頓或再撳停',
  speaking: '講緊…',
  translating: '翻譯緊',
}

const ZH_FRIEND = '對面朋友望住呢度'
const ZH_YOU = '手機對住自己'

/**
 * Exhaustive map: every `Lang` must have native Conversation chrome.
 * Chinese varieties share Traditional Chinese mic/hint copy; htmlLang differs.
 */
export const CONVERSATION_PANE_UI: Record<ConversationLang, ConversationPaneUi> = {
  en: {
    htmlLang: 'en',
    mic: {
      holdOrTapToSpeak: 'Hold or tap to speak',
      releaseWhenDone: 'Listening — release when done',
      tapListening: 'Listening — pause or tap to stop',
      speaking: 'Speaking…',
      translating: 'Translating',
    },
    friendLooksHere: 'Friend faces this side',
    holdFacingYou: 'Hold phone facing you',
  },
  yue: {
    htmlLang: 'zh-HK',
    mic: ZH_MIC,
    friendLooksHere: ZH_FRIEND,
    holdFacingYou: ZH_YOU,
  },
  cmn: {
    htmlLang: 'zh-CN',
    mic: ZH_MIC,
    friendLooksHere: ZH_FRIEND,
    holdFacingYou: ZH_YOU,
  },
  wuu: {
    htmlLang: 'wuu-CN',
    mic: ZH_MIC,
    friendLooksHere: ZH_FRIEND,
    holdFacingYou: ZH_YOU,
  },
  sichuan: {
    htmlLang: 'zh-CN-sichuan',
    mic: ZH_MIC,
    friendLooksHere: ZH_FRIEND,
    holdFacingYou: ZH_YOU,
  },
  tl: {
    htmlLang: 'tl',
    mic: {
      holdOrTapToSpeak: 'Pindutin o hawakan para magsalita',
      releaseWhenDone: 'Nakikinig — bitawan kapag tapos na',
      tapListening: 'Nakikinig — tumigil o pindutin ulit',
      speaking: 'Nagsasalita…',
      translating: 'Isinasalin',
    },
    friendLooksHere: 'Tumingin dito ang kaibigan',
    holdFacingYou: 'Hawakan ang telepono patungo sa iyo',
  },
  es: {
    htmlLang: 'es-MX',
    mic: {
      holdOrTapToSpeak: 'Mantén o toca para hablar',
      releaseWhenDone: 'Escuchando — suelta al terminar',
      tapListening: 'Escuchando — pausa o toca para parar',
      speaking: 'Hablando…',
      translating: 'Traduciendo',
    },
    friendLooksHere: 'Tu amigo mira hacia este lado',
    holdFacingYou: 'Sostén el teléfono mirándote',
  },
  vi: {
    htmlLang: 'vi-VN',
    mic: {
      holdOrTapToSpeak: 'Giữ hoặc chạm để nói',
      releaseWhenDone: 'Đang nghe — thả ra khi xong',
      tapListening: 'Đang nghe — tạm dừng hoặc chạm để dừng',
      speaking: 'Đang nói…',
      translating: 'Đang dịch',
    },
    friendLooksHere: 'Bạn nhìn về phía này',
    holdFacingYou: 'Hướng điện thoại về phía bạn',
  },
}

export function conversationPaneUi(lang: ConversationLang): ConversationPaneUi {
  return CONVERSATION_PANE_UI[lang]
}

export function conversationLabelHtmlLang(lang: ConversationLang): string {
  return CONVERSATION_PANE_UI[lang].htmlLang
}

export function liveMicLabel(key: LiveMicKey, lang: ConversationLang): string {
  return CONVERSATION_PANE_UI[lang].mic[key]
}

export function conversationPaneHint(lang: ConversationLang, kind: 'friend' | 'you'): string {
  const pane = CONVERSATION_PANE_UI[lang]
  return kind === 'friend' ? pane.friendLooksHere : pane.holdFacingYou
}
