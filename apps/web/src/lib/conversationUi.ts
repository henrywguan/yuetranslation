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
    htmlLang: 'ja-JP',
    mic: {
      holdOrTapToSpeak: 'タップまたは長押しで話す',
      releaseWhenDone: '聞いています — 話したら離してください',
      tapListening: '聞いています — もう一度タップで停止',
      speaking: '話しています…',
      translating: '翻訳中…',
    },
    friendLooksHere: 'お友達はこちらを見てください',
    holdFacingYou: '画面を自分に向けて持ってください',
  },
  id: {
    htmlLang: 'id-ID',
    mic: {
      holdOrTapToSpeak: 'Tahan atau ketuk untuk bicara',
      releaseWhenDone: 'Mendengar — lepas kalau sudah',
      tapListening: 'Mendengar — jeda atau ketuk lagi untuk berhenti',
      speaking: 'Sedang bicara…',
      translating: 'Menerjemahkan…',
    },
    friendLooksHere: 'Teman lihat ke sisi ini',
    holdFacingYou: 'Arahkan ponsel ke arahmu',
  },
  ms: {
    htmlLang: 'ms-MY',
    mic: {
      holdOrTapToSpeak: 'Tahan atau ketuk untuk bercakap',
      releaseWhenDone: 'Mendengar — lepaskan bila selesai',
      tapListening: 'Mendengar — jeda atau ketuk lagi untuk berhenti',
      speaking: 'Sedang bercakap…',
      translating: 'Menterjemah…',
    },
    friendLooksHere: 'Kawan tengok sebelah ni',
    holdFacingYou: 'Halakan telefon ke arah awak',
  },
  pt: {
    htmlLang: 'pt-BR',
    mic: {
      holdOrTapToSpeak: 'Segure ou toque para falar',
      releaseWhenDone: 'Ouvindo — solte quando terminar',
      tapListening: 'Ouvindo — pause ou toque para parar',
      speaking: 'Falando…',
      translating: 'Traduzindo',
    },
    friendLooksHere: 'Seu amigo olha para este lado',
    holdFacingYou: 'Segure o telefone virado para você',
  },
  fr: {
    htmlLang: 'fr-FR',
    mic: {
      holdOrTapToSpeak: 'Maintenir ou appuyer pour parler',
      releaseWhenDone: 'Écoute — relâchez une fois terminé',
      tapListening: 'Écoute — pause ou appuyez pour arrêter',
      speaking: 'En train de parler…',
      translating: 'Traduction…',
    },
    friendLooksHere: 'Votre ami regarde de ce côté',
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
      holdOrTapToSpeak: 'ចុច ឬសង្កត់ដើម្បីនិយាយ',
      releaseWhenDone: 'កំពុងស្តាប់ — លែងពេលនិយាយរួច',
      tapListening: 'កំពុងស្តាប់ — ផ្អាក ឬចុចម្ដងទៀតដើម្បីឈប់',
      speaking: 'កំពុងនិយាយ…',
      translating: 'កំពុងបកប្រែ',
    },
    friendLooksHere: 'មិត្តភក្តិមើលមកផ្នែកនេះ',
    holdFacingYou: 'តម្រង់ទូរស័ព្ទមករកខ្លួនអ្នក',
  },
  my: {
    htmlLang: 'my',
    mic: {
      holdOrTapToSpeak: 'ပြောဖို့ နှိပ်ပါ သို့မဟုတ် ဖိထားပါ',
      releaseWhenDone: 'နားထောင်နေတယ် — ပြီးရင် လွှတ်လိုက်ပါ',
      tapListening: 'နားထောင်နေတယ် — ရပ်ပါ သို့မဟုတ် ထပ်နှိပ်ပါ',
      speaking: 'ပြောနေတယ်…',
      translating: 'ဘာသာပြန်နေတယ်',
    },
    friendLooksHere: 'သူငယ်ချင်း ဒီဘက်ကို ကြည့်ပါ',
    holdFacingYou: 'ဖုန်းကို ကိုယ့်ဘက်လှည့်ထားပါ',
  },
  jv: {
    htmlLang: 'jv-ID',
    mic: {
      holdOrTapToSpeak: 'Tahan utawa pencet kanggo ngomong',
      releaseWhenDone: 'Ngrungokake — lepaske yen wis rampung',
      tapListening: 'Ngrungokake — jeda utawa pencet maneh',
      speaking: 'Lagi ngomong…',
      translating: 'Nerjemahake…',
    },
    friendLooksHere: 'Kanca madhep sisih iki',
    holdFacingYou: 'Arahake HP menyang kowe',
  },
  it: {
    htmlLang: 'it-IT',
    mic: {
      holdOrTapToSpeak: 'Tieni premuto o tocca per parlare',
      releaseWhenDone: 'In ascolto — rilascia una volta terminato',
      tapListening: 'In ascolto — pausa o tocca per fermare',
      speaking: 'Sto parlando…',
      translating: 'Traduzione…',
    },
    friendLooksHere: 'Il tuo amico guarda da questo lato',
    holdFacingYou: 'Tieni il telefono rivolto verso di te',
  },
  de: {
    htmlLang: 'de-DE',
    mic: {
      holdOrTapToSpeak: 'Gedrückt halten oder tippen zum Sprechen',
      releaseWhenDone: 'Hört zu — loslassen, wenn fertig',
      tapListening: 'Hört zu — Pause oder tippen zum Stoppen',
      speaking: 'Am Sprechen…',
      translating: 'Übersetzung…',
    },
    friendLooksHere: 'Dein Freund schaut auf diese Seite',
    holdFacingYou: 'Handy zu dir zeigen',
  },
  nl: {
    htmlLang: 'nl-NL',
    mic: {
      holdOrTapToSpeak: 'Vasthouden of tikken om te spreken',
      releaseWhenDone: 'Luisteren — laat los als je klaar bent',
      tapListening: 'Luisteren — pauzeer of tik om te stoppen',
      speaking: 'Aan het spreken…',
      translating: 'Vertalen…',
    },
    friendLooksHere: 'Je vriend kijkt naar deze kant',
    holdFacingYou: 'Houd de telefoon naar jezelf gericht',
  },
  ar: {
    htmlLang: 'ar-EG',
    mic: {
      holdOrTapToSpeak: 'اضغط مطوّلاً أو اضغط للتحدث',
      releaseWhenDone: 'بسمعك — سيب الزرار لما تخلّص',
      tapListening: 'بسمعك — استنى شوية أو دوس تاني عشان توقّف',
      speaking: 'بيتكلم…',
      translating: 'بيترجم…',
    },
    friendLooksHere: 'صاحبك يبص من الناحية دي',
    holdFacingYou: 'خلّي الموبايل ناحيتك',
  },
  arsa: {
    htmlLang: 'ar-SA',
    mic: {
      holdOrTapToSpeak: 'اضغط مطوّلاً أو انقر للتحدث',
      releaseWhenDone: 'جارٍ الاستماع — ارفع إصبعك عند الانتهاء',
      tapListening: 'جارٍ الاستماع — توقّف قليلاً أو انقر مجدداً للإيقاف',
      speaking: 'جارٍ التحدث…',
      translating: 'جارٍ الترجمة…',
    },
    friendLooksHere: 'ينظر صديقك من هذه الجهة',
    holdFacingYou: 'أمسك الهاتف باتجاهك',
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
