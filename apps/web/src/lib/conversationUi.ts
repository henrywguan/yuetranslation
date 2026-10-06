import type { ConversationLang } from './types'

/**
 * Conversation language-pure UI (mic button + pane hints).
 *
 * **When adding a Conversation language:** extend `VoiceLang` / `ConversationLang`
 * in `types.ts`, then add a full entry here. Text-only langs (`ceb` / `ilo` / `bcl`) stay
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
  eses: {
    htmlLang: 'es-ES',
    mic: {
      holdOrTapToSpeak: 'Mantén o toca para hablar',
      releaseWhenDone: 'Escuchando — suelta al terminar',
      tapListening: 'Escuchando — pausa o toca para parar',
      speaking: 'Hablando…',
      translating: 'Traduciendo',
    },
    friendLooksHere: 'Tu amigo mira hacia este lado',
    holdFacingYou: 'Sujeta el teléfono mirándote',
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
  th: {
    htmlLang: 'th',
    mic: {
      holdOrTapToSpeak: 'กดค้างหรือแตะเพื่อพูด',
      releaseWhenDone: 'กำลังฟัง — ปล่อยเมื่อพูดจบ',
      tapListening: 'กำลังฟัง — หยุดหรือแตะเพื่อหยุด',
      speaking: 'กำลังพูด…',
      translating: 'กำลังแปล',
    },
    friendLooksHere: 'เพื่อนมองทางนี้',
    holdFacingYou: 'หันโทรศัพท์เข้าหาตัวเอง',
  },
  lo: {
    htmlLang: 'lo',
    mic: {
      holdOrTapToSpeak: 'ກົດຄ້າງ ຫຼື ແຕະເພື່ອເວົ້າ',
      releaseWhenDone: 'ກຳລັງຟັງ — ປ່ອຍເມື່ອເວົ້າຈົບ',
      tapListening: 'ກຳລັງຟັງ — ຫຍຸດ ຫຼື ແຕະເພື່ອຫຍຸດ',
      speaking: 'ກຳລັງເວົ້າ…',
      translating: 'ກຳລັງແປ',
    },
    friendLooksHere: 'ເພື່ອນມອງທາງນີ້',
    holdFacingYou: 'ຫັນໂທລະສັບເຂົ້າຫາຕົວເອງ',
  },
  ko: {
    htmlLang: 'ko-KR',
    mic: {
      holdOrTapToSpeak: '누르거나 길게 눌러 말하기',
      releaseWhenDone: '듣는 중 — 끝나면 손을 떼세요',
      tapListening: '듣는 중 — 멈추거나 다시 누르세요',
      speaking: '말하는 중…',
      translating: '번역 중',
    },
    friendLooksHere: '친구는 이쪽을 보세요',
    holdFacingYou: '화면이 자신을 향하게 드세요',
  },
  ja: {
    htmlLang: 'ja',
    mic: {
      holdOrTapToSpeak: '押すか長押しで話す',
      releaseWhenDone: '聞いています — 終わったら離す',
      tapListening: '聞いています — 停止するかもう一度タップ',
      speaking: '話しています…',
      translating: '翻訳中',
    },
    friendLooksHere: '友だちはこの側を見てください',
    holdFacingYou: '画面を自分に向けて持ってください',
  },
  id: {
    htmlLang: 'id',
    mic: {
      holdOrTapToSpeak: 'Tahan atau ketuk untuk berbicara',
      releaseWhenDone: 'Mendengarkan — lepas jika selesai',
      tapListening: 'Mendengarkan — jeda atau ketuk untuk berhenti',
      speaking: 'Berbicara…',
      translating: 'Menerjemahkan',
    },
    friendLooksHere: 'Teman menghadap sisi ini',
    holdFacingYou: 'Arahkan ponsel ke arah Anda',
  },
  ms: {
    htmlLang: 'ms',
    mic: {
      holdOrTapToSpeak: 'Tahan atau ketik untuk bercakap',
      releaseWhenDone: 'Mendengar — lepaskan bila selesai',
      tapListening: 'Mendengar — jeda atau ketik untuk berhenti',
      speaking: 'Bercakap…',
      translating: 'Menterjemah',
    },
    friendLooksHere: 'Rakan menghadap sisi ini',
    holdFacingYou: 'Halakan telefon ke arah anda',
  },
  pt: {
    htmlLang: 'pt-BR',
    mic: {
      holdOrTapToSpeak: 'Segure ou toque para falar',
      releaseWhenDone: 'Ouvindo — solte ao terminar',
      tapListening: 'Ouvindo — pause ou toque para parar',
      speaking: 'Falando…',
      translating: 'Traduzindo',
    },
    friendLooksHere: 'O amigo olha para este lado',
    holdFacingYou: 'Segure o telefone virado para você',
  },
  fr: {
    htmlLang: 'fr-FR',
    mic: {
      holdOrTapToSpeak: 'Maintenir ou appuyer pour parler',
      releaseWhenDone: 'Écoute — relâchez quand c’est fini',
      tapListening: 'Écoute — pause ou appuyez pour arrêter',
      speaking: 'Parole…',
      translating: 'Traduction',
    },
    friendLooksHere: 'L’ami regarde de ce côté',
    holdFacingYou: 'Tenez le téléphone face à vous',
  },
  hi: {
    htmlLang: 'hi-IN',
    mic: {
      holdOrTapToSpeak: 'बोलने के लिए टैप या होल्ड करें',
      releaseWhenDone: 'सुन रहा हूँ — पूरा होने पर छोड़ें',
      tapListening: 'सुन रहा हूँ — रोकने के लिए फिर टैप करें',
      speaking: 'बोल रहा हूँ…',
      translating: 'अनुवाद हो रहा है',
    },
    friendLooksHere: 'दोस्त इस तरफ़ देखें',
    holdFacingYou: 'फ़ोन अपनी ओर रखें',
  },
  km: {
    htmlLang: 'km',
    mic: {
      holdOrTapToSpeak: 'ចុចឬសង្កត់ដើម្បីនិយាយ',
      releaseWhenDone: 'កំពុងស្តាប់ — រួចហើយសូមលែង',
      tapListening: 'កំពុងស្តាប់ — ផ្អាក ឬចុចម្ដងទៀត',
      speaking: 'កំពុងនិយាយ…',
      translating: 'កំពុងបកប្រែ',
    },
    friendLooksHere: 'មិត្តភក្តិមើលមកផ្នែកនេះ',
    holdFacingYou: 'តម្រង់ទូរស័ព្ទមករកខ្លួនអ្នក',
  },
  my: {
    htmlLang: 'my',
    mic: {
      holdOrTapToSpeak: 'ပြောရန် နှိပ်ပါ သို့မဟုတ် ဖိထားပါ',
      releaseWhenDone: 'နားထောင်နေသည် — ပြီးရင် လွှတ်ပါ',
      tapListening: 'နားထောင်နေသည် — ရပ်ပါ သို့မဟုတ် ထပ်နှိပ်ပါ',
      speaking: 'ပြောနေသည်…',
      translating: 'ဘာသာပြန်နေသည်',
    },
    friendLooksHere: 'သူငယ်ချင်း ဒီဘက်ကို ကြည့်ပါ',
    holdFacingYou: 'ဖုန်းကို ကိုယ့်ဘက်လှည့်ထားပါ',
  },
  jv: {
    htmlLang: 'jv',
    mic: {
      holdOrTapToSpeak: 'Pencet utawa tahan kanggo ngomong',
      releaseWhenDone: 'Ngrungokake — lepaske yen wis rampung',
      tapListening: 'Ngrungokake — mandheg utawa pencet maneh',
      speaking: 'Ngomong…',
      translating: 'Nerjemahake',
    },
    friendLooksHere: 'Kanca madhep sisih iki',
    holdFacingYou: 'Arahake HP menyang sampeyan',
  },
  it: {
    htmlLang: 'it-IT',
    mic: {
      holdOrTapToSpeak: 'Tieni premuto o tocca per parlare',
      releaseWhenDone: 'In ascolto — rilascia quando hai finito',
      tapListening: 'In ascolto — pausa o tocca per fermare',
      speaking: 'Parlando…',
      translating: 'Traduzione',
    },
    friendLooksHere: 'L’amico guarda da questo lato',
    holdFacingYou: 'Tieni il telefono rivolto verso di te',
  },
  de: {
    htmlLang: 'de-DE',
    mic: {
      holdOrTapToSpeak: 'Gedrückt halten oder tippen zum Sprechen',
      releaseWhenDone: 'Hört zu — loslassen wenn fertig',
      tapListening: 'Hört zu — Pause oder tippen zum Stoppen',
      speaking: 'Spricht…',
      translating: 'Übersetzt',
    },
    friendLooksHere: 'Freund schaut auf diese Seite',
    holdFacingYou: 'Handy zu dir zeigen',
  },
  nl: {
    htmlLang: 'nl-NL',
    mic: {
      holdOrTapToSpeak: 'Vasthouden of tikken om te spreken',
      releaseWhenDone: 'Luisteren — loslaten als je klaar bent',
      tapListening: 'Luisteren — pauzeer of tik om te stoppen',
      speaking: 'Spreken…',
      translating: 'Vertalen',
    },
    friendLooksHere: 'Vriend kijkt naar deze kant',
    holdFacingYou: 'Houd de telefoon naar jezelf gericht',
  },
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
