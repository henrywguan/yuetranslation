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
  ta: {
    htmlLang: 'ta-IN',
    mic: {
      holdOrTapToSpeak: 'பேச அழுத்திப் பிடிக்கவும் அல்லது தட்டவும்',
      releaseWhenDone: 'கேட்கிறது — முடிந்ததும் விடுங்கள்',
      tapListening: 'கேட்கிறது — நிறுத்த இடைநிறுத்தவும் அல்லது மீண்டும் தட்டவும்',
      speaking: 'பேசுகிறது…',
      translating: 'மொழிபெயர்க்கிறது…',
    },
    friendLooksHere: 'உங்கள் நண்பர் இந்தப் பக்கம் பார்க்கிறார்',
    holdFacingYou: 'போனை உங்கள் பக்கம் திருப்பிப் பிடிக்கவும்',
  },
  ptpt: {
    htmlLang: 'pt-PT',
    mic: {
      holdOrTapToSpeak: 'Mantenha premido ou toque para falar',
      releaseWhenDone: 'A ouvir — solte quando terminar',
      tapListening: 'A ouvir — faça uma pausa ou toque para parar',
      speaking: 'A falar…',
      translating: 'A traduzir…',
    },
    friendLooksHere: 'O seu amigo olha para este lado',
    holdFacingYou: 'Segure o telemóvel virado para si',
  },
  tr: {
    htmlLang: 'tr-TR',
    mic: {
      holdOrTapToSpeak: 'Konuşmak için basılı tutun veya dokunun',
      releaseWhenDone: 'Dinleniyor — bitince bırakın',
      tapListening: 'Dinleniyor — durdurmak için duraklayın veya dokunun',
      speaking: 'Konuşuluyor…',
      translating: 'Çevriliyor…',
    },
    friendLooksHere: 'Arkadaşınız bu taraftan bakıyor',
    holdFacingYou: 'Telefonu kendinize doğru tutun',
  },
  bn: {
    htmlLang: 'bn-IN',
    mic: {
      holdOrTapToSpeak: 'কথা বলতে চেপে ধরুন বা ট্যাপ করুন',
      releaseWhenDone: 'শুনছি — শেষ হলে ছেড়ে দিন',
      tapListening: 'শুনছি — থামাতে বিরতি দিন বা আবার ট্যাপ করুন',
      speaking: 'বলছি…',
      translating: 'অনুবাদ হচ্ছে…',
    },
    friendLooksHere: 'আপনার বন্ধু এই দিকে তাকাবেন',
    holdFacingYou: 'ফোনটি নিজের দিকে ধরে রাখুন',
  },
  te: {
    htmlLang: 'te-IN',
    mic: {
      holdOrTapToSpeak: 'మాట్లాడటానికి నొక్కి పట్టుకోండి లేదా తట్టండి',
      releaseWhenDone: 'వింటున్నాను — అయిపోయాక వదలండి',
      tapListening: 'వింటున్నాను — ఆపడానికి ఆగండి లేదా మళ్లీ తట్టండి',
      speaking: 'మాట్లాడుతోంది…',
      translating: 'అనువదిస్తోంది…',
    },
    friendLooksHere: 'మీ స్నేహితులు ఈ వైపు చూస్తారు',
    holdFacingYou: 'ఫోన్‌ను మీ వైపు తిప్పి పట్టుకోండి',
  },
  gu: {
    htmlLang: 'gu-IN',
    mic: {
      holdOrTapToSpeak: 'બોલવા માટે દબાવી રાખો અથવા ટૅપ કરો',
      releaseWhenDone: 'સાંભળી રહ્યું છે — પૂરું થાય ત્યારે છોડો',
      tapListening: 'સાંભળી રહ્યું છે — રોકવા માટે થોભો અથવા ફરી ટૅપ કરો',
      speaking: 'બોલી રહ્યું છે…',
      translating: 'અનુવાદ થઈ રહ્યો છે…',
    },
    friendLooksHere: 'તમારા મિત્ર આ બાજુ જોશે',
    holdFacingYou: 'ફોન તમારી તરફ પકડી રાખો',
  },
  kn: {
    htmlLang: 'kn-IN',
    mic: {
      holdOrTapToSpeak: 'ಮಾತನಾಡಲು ಒತ್ತಿ ಹಿಡಿಯಿರಿ ಅಥವಾ ಟ್ಯಾಪ್ ಮಾಡಿ',
      releaseWhenDone: 'ಕೇಳುತ್ತಿದೆ — ಮುಗಿದ ಮೇಲೆ ಬಿಡಿ',
      tapListening: 'ಕೇಳುತ್ತಿದೆ — ನಿಲ್ಲಿಸಲು ವಿರಾಮ ನೀಡಿ ಅಥವಾ ಮತ್ತೆ ಟ್ಯಾಪ್ ಮಾಡಿ',
      speaking: 'ಮಾತನಾಡುತ್ತಿದೆ…',
      translating: 'ಅನುವಾದಿಸುತ್ತಿದೆ…',
    },
    friendLooksHere: 'ನಿಮ್ಮ ಸ್ನೇಹಿತರು ಈ ಕಡೆ ನೋಡುತ್ತಾರೆ',
    holdFacingYou: 'ಫೋನ್ ಅನ್ನು ನಿಮ್ಮ ಕಡೆಗೆ ಹಿಡಿಯಿರಿ',
  },
  pl: {
    htmlLang: 'pl-PL',
    mic: {
      holdOrTapToSpeak: 'Przytrzymaj lub dotknij, aby mówić',
      releaseWhenDone: 'Słucham — puść, gdy skończysz',
      tapListening: 'Słucham — zrób pauzę lub dotknij ponownie, aby zakończyć',
      speaking: 'Mówię…',
      translating: 'Tłumaczę…',
    },
    friendLooksHere: 'Twój rozmówca patrzy z tej strony',
    holdFacingYou: 'Trzymaj telefon ekranem do siebie',
  },
  ro: {
    htmlLang: 'ro-RO',
    mic: {
      holdOrTapToSpeak: 'Ține apăsat sau atinge pentru a vorbi',
      releaseWhenDone: 'Ascult — eliberează când ai terminat',
      tapListening: 'Ascult — fă o pauză sau atinge din nou pentru a opri',
      speaking: 'Vorbesc…',
      translating: 'Traduc…',
    },
    friendLooksHere: 'Prietenul tău se uită din partea aceasta',
    holdFacingYou: 'Ține telefonul îndreptat spre tine',
  },
  cs: {
    htmlLang: 'cs-CZ',
    mic: {
      holdOrTapToSpeak: 'Podržte nebo klepněte a mluvte',
      releaseWhenDone: 'Poslouchám — po dokončení pusťte',
      tapListening: 'Poslouchám — ukončete pauzou nebo dalším klepnutím',
      speaking: 'Mluvím…',
      translating: 'Překládám…',
    },
    friendLooksHere: 'Váš protějšek se dívá z této strany',
    holdFacingYou: 'Držte telefon displejem k sobě',
  },
  el: {
    htmlLang: 'el-GR',
    mic: {
      holdOrTapToSpeak: 'Πατήστε παρατεταμένα ή πατήστε για να μιλήσετε',
      releaseWhenDone: 'Ακούω — αφήστε όταν τελειώσετε',
      tapListening: 'Ακούω — κάντε παύση ή πατήστε ξανά για διακοπή',
      speaking: 'Μιλάω…',
      translating: 'Μεταφράζω…',
    },
    friendLooksHere: 'Ο συνομιλητής σας κοιτάζει από αυτή την πλευρά',
    holdFacingYou: 'Κρατήστε το τηλέφωνο στραμμένο προς εσάς',
  },
  hu: {
    htmlLang: 'hu-HU',
    mic: {
      holdOrTapToSpeak: 'Tartsd lenyomva vagy koppints a beszédhez',
      releaseWhenDone: 'Figyelek — engedd el, ha végeztél',
      tapListening: 'Figyelek — tarts szünetet vagy koppints újra a leállításhoz',
      speaking: 'Beszélek…',
      translating: 'Fordítás…',
    },
    friendLooksHere: 'A beszélgetőtársad erről az oldalról néz',
    holdFacingYou: 'Tartsd a telefont magad felé',
  },
  sv: {
    htmlLang: 'sv-SE',
    mic: {
      holdOrTapToSpeak: 'Håll in eller tryck för att prata',
      releaseWhenDone: 'Lyssnar — släpp när du är klar',
      tapListening: 'Lyssnar — pausa eller tryck igen för att sluta',
      speaking: 'Talar…',
      translating: 'Översätter…',
    },
    friendLooksHere: 'Din vän tittar från den här sidan',
    holdFacingYou: 'Håll telefonen vänd mot dig',
  },
  ru: {
    htmlLang: 'ru-RU',
    mic: {
      holdOrTapToSpeak: 'Удерживайте или нажмите, чтобы говорить',
      releaseWhenDone: 'Слушаю — отпустите, когда закончите',
      tapListening: 'Слушаю — сделайте паузу или нажмите ещё раз, чтобы остановить',
      speaking: 'Говорю…',
      translating: 'Перевожу…',
    },
    friendLooksHere: 'Ваш собеседник смотрит с этой стороны',
    holdFacingYou: 'Держите телефон экраном к себе',
  },
  uk: {
    htmlLang: 'uk-UA',
    mic: {
      holdOrTapToSpeak: 'Утримуйте або торкніться, щоб говорити',
      releaseWhenDone: 'Слухаю — відпустіть, коли закінчите',
      tapListening: 'Слухаю — зробіть паузу або торкніться ще раз, щоб зупинити',
      speaking: 'Говорю…',
      translating: 'Перекладаю…',
    },
    friendLooksHere: 'Ваш співрозмовник дивиться з цього боку',
    holdFacingYou: 'Тримайте телефон екраном до себе',
  },
  he: {
    htmlLang: 'he-IL',
    mic: {
      holdOrTapToSpeak: 'החזיקו או הקישו כדי לדבר',
      releaseWhenDone: 'מקשיב — שחררו כשתסיימו',
      tapListening: 'מקשיב — עצרו לרגע או הקישו שוב כדי להפסיק',
      speaking: 'מדבר…',
      translating: 'מתרגם…',
    },
    friendLooksHere: 'החבר שלכם מסתכל מהצד הזה',
    holdFacingYou: 'החזיקו את הטלפון מול עצמכם',
  },
  fa: {
    htmlLang: 'fa-IR',
    mic: {
      holdOrTapToSpeak: 'برای صحبت کردن نگه دارید یا ضربه بزنید',
      releaseWhenDone: 'در حال گوش دادن — وقتی تمام شد رها کنید',
      tapListening: 'در حال گوش دادن — برای توقف مکث کنید یا دوباره ضربه بزنید',
      speaking: 'در حال صحبت…',
      translating: 'در حال ترجمه…',
    },
    friendLooksHere: 'دوست شما از این طرف نگاه می‌کند',
    holdFacingYou: 'گوشی را رو به خودتان نگه دارید',
  },
  ur: {
    htmlLang: 'ur-IN',
    mic: {
      holdOrTapToSpeak: 'بولنے کے لیے دبائے رکھیں یا ٹیپ کریں',
      releaseWhenDone: 'سن رہا ہے — ختم ہونے پر چھوڑ دیں',
      tapListening: 'سن رہا ہے — روکنے کے لیے وقفہ دیں یا دوبارہ ٹیپ کریں',
      speaking: 'بول رہا ہے…',
      translating: 'ترجمہ ہو رہا ہے…',
    },
    friendLooksHere: 'آپ کے دوست اس طرف دیکھیں گے',
    holdFacingYou: 'فون اپنی طرف رکھ کر پکڑیں',
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
