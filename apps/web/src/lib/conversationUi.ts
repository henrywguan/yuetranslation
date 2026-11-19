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
  ml: {
    htmlLang: 'ml-IN',
    mic: {
      holdOrTapToSpeak: 'സംസാരിക്കാൻ അമർത്തിപ്പിടിക്കുക അല്ലെങ്കിൽ ടാപ്പ് ചെയ്യുക',
      releaseWhenDone: 'കേൾക്കുന്നു — കഴിഞ്ഞാൽ വിടുക',
      tapListening: 'കേൾക്കുന്നു — നിർത്താൻ ഇടവേള എടുക്കുക അല്ലെങ്കിൽ വീണ്ടും ടാപ്പ് ചെയ്യുക',
      speaking: 'സംസാരിക്കുന്നു…',
      translating: 'വിവർത്തനം ചെയ്യുന്നു…',
    },
    friendLooksHere: 'നിങ്ങളുടെ സുഹൃത്ത് ഈ വശത്തേക്ക് നോക്കുന്നു',
    holdFacingYou: 'ഫോൺ നിങ്ങൾക്ക് അഭിമുഖമായി പിടിക്കുക',
  },
  mr: {
    htmlLang: 'mr-IN',
    mic: {
      holdOrTapToSpeak: 'बोलण्यासाठी दाबून धरा किंवा टॅप करा',
      releaseWhenDone: 'ऐकत आहे — झाल्यावर सोडा',
      tapListening: 'ऐकत आहे — थांबवण्यासाठी थांबा किंवा पुन्हा टॅप करा',
      speaking: 'बोलत आहे…',
      translating: 'भाषांतर करत आहे…',
    },
    friendLooksHere: 'तुमचा मित्र या बाजूला पाहतो',
    holdFacingYou: 'फोन तुमच्याकडे तोंड करून धरा',
  },
  pa: {
    htmlLang: 'pa-IN',
    mic: {
      holdOrTapToSpeak: 'ਬੋਲਣ ਲਈ ਦਬਾ ਕੇ ਰੱਖੋ ਜਾਂ ਟੈਪ ਕਰੋ',
      releaseWhenDone: 'ਸੁਣ ਰਿਹਾ ਹੈ — ਪੂਰਾ ਹੋਣ ਤੇ ਛੱਡੋ',
      tapListening: 'ਸੁਣ ਰਿਹਾ ਹੈ — ਰੋਕਣ ਲਈ ਰੁਕੋ ਜਾਂ ਦੁਬਾਰਾ ਟੈਪ ਕਰੋ',
      speaking: 'ਬੋਲ ਰਿਹਾ ਹੈ…',
      translating: 'ਅਨੁਵਾਦ ਹੋ ਰਿਹਾ ਹੈ…',
    },
    friendLooksHere: 'ਤੁਹਾਡਾ ਦੋਸਤ ਇਸ ਪਾਸੇ ਵੇਖੇਗਾ',
    holdFacingYou: 'ਫ਼ੋਨ ਆਪਣੇ ਵੱਲ ਕਰਕੇ ਫੜੋ',
  },
  or: {
    htmlLang: 'or-IN',
    mic: {
      holdOrTapToSpeak: 'କହିବାକୁ ଦବାଇ ଧରନ୍ତୁ କିମ୍ବା ଟାପ୍ କରନ୍ତୁ',
      releaseWhenDone: 'ଶୁଣୁଛି — ସରିଲେ ଛାଡ଼ନ୍ତୁ',
      tapListening: 'ଶୁଣୁଛି — ବନ୍ଦ କରିବାକୁ ଅପେକ୍ଷା କରନ୍ତୁ କିମ୍ବା ପୁଣି ଟାପ୍ କରନ୍ତୁ',
      speaking: 'କହୁଛି…',
      translating: 'ଅନୁବାଦ ହେଉଛି…',
    },
    friendLooksHere: 'ଆପଣଙ୍କ ବନ୍ଧୁ ଏହି ପାଖକୁ ଚାହିଁବେ',
    holdFacingYou: 'ଫୋନ୍‌କୁ ନିଜ ଆଡ଼କୁ କରି ଧରନ୍ତୁ',
  },
  si: {
    htmlLang: 'si-LK',
    mic: {
      holdOrTapToSpeak: 'කතා කිරීමට ඔබාගෙන සිටින්න හෝ තට්ටු කරන්න',
      releaseWhenDone: 'සවන් දෙමින් — ඉවර වූ විට අත්හරින්න',
      tapListening: 'සවන් දෙමින් — නැවැත්වීමට නවතින්න හෝ නැවත තට්ටු කරන්න',
      speaking: 'කතා කරමින්…',
      translating: 'පරිවර්තනය කරමින්…',
    },
    friendLooksHere: 'ඔබේ මිතුරා මේ පැත්ත බලයි',
    holdFacingYou: 'දුරකථනය ඔබ දෙසට හරවා අල්ලාගන්න',
  },
  ne: {
    htmlLang: 'ne-NP',
    mic: {
      holdOrTapToSpeak: 'बोल्न थिचिराख्नुहोस् वा ट्याप गर्नुहोस्',
      releaseWhenDone: 'सुन्दै छ — सकिएपछि छोड्नुहोस्',
      tapListening: 'सुन्दै छ — रोक्न रोकिनुहोस् वा फेरि ट्याप गर्नुहोस्',
      speaking: 'बोल्दै छ…',
      translating: 'अनुवाद गर्दै…',
    },
    friendLooksHere: 'तपाईंको साथी यो तर्फ हेर्छ',
    holdFacingYou: 'फोन आफूतिर फर्काएर समात्नुहोस्',
  },
  da: {
    htmlLang: 'da-DK',
    mic: {
      holdOrTapToSpeak: 'Hold nede eller tryk for at tale',
      releaseWhenDone: 'Lytter — slip, når du er færdig',
      tapListening: 'Lytter — hold en pause eller tryk igen for at stoppe',
      speaking: 'Taler…',
      translating: 'Oversætter…',
    },
    friendLooksHere: 'Din ven kigger på denne side',
    holdFacingYou: 'Hold telefonen vendt mod dig selv',
  },
  nb: {
    htmlLang: 'nb-NO',
    mic: {
      holdOrTapToSpeak: 'Hold inne eller trykk for å snakke',
      releaseWhenDone: 'Lytter — slipp når du er ferdig',
      tapListening: 'Lytter — ta en pause eller trykk igjen for å stoppe',
      speaking: 'Snakker…',
      translating: 'Oversetter…',
    },
    friendLooksHere: 'Vennen din ser mot denne siden',
    holdFacingYou: 'Hold telefonen vendt mot deg selv',
  },
  fi: {
    htmlLang: 'fi-FI',
    mic: {
      holdOrTapToSpeak: 'Pidä painettuna tai napauta puhuaksesi',
      releaseWhenDone: 'Kuuntelen — päästä irti, kun olet valmis',
      tapListening: 'Kuuntelen — pidä tauko tai napauta uudelleen lopettaaksesi',
      speaking: 'Puhun…',
      translating: 'Käännän…',
    },
    friendLooksHere: 'Ystäväsi katsoo tälle puolelle',
    holdFacingYou: 'Pidä puhelinta itseäsi kohti',
  },
  sk: {
    htmlLang: 'sk-SK',
    mic: {
      holdOrTapToSpeak: 'Podržte alebo klepnite a hovorte',
      releaseWhenDone: 'Počúvam — pustite, keď skončíte',
      tapListening: 'Počúvam — urobte pauzu alebo klepnite znova na zastavenie',
      speaking: 'Hovorím…',
      translating: 'Prekladám…',
    },
    friendLooksHere: 'Váš priateľ sa pozerá z tejto strany',
    holdFacingYou: 'Držte telefón obrátený k sebe',
  },
  hr: {
    htmlLang: 'hr-HR',
    mic: {
      holdOrTapToSpeak: 'Držite ili dodirnite za govor',
      releaseWhenDone: 'Slušam — otpustite kad završite',
      tapListening: 'Slušam — napravite stanku ili ponovno dodirnite za zaustavljanje',
      speaking: 'Govorim…',
      translating: 'Prevodim…',
    },
    friendLooksHere: 'Vaš prijatelj gleda s ove strane',
    holdFacingYou: 'Držite telefon okrenut prema sebi',
  },
  ca: {
    htmlLang: 'ca-ES',
    mic: {
      holdOrTapToSpeak: 'Mantén premut o toca per parlar',
      releaseWhenDone: 'Escoltant — deixa anar quan acabis',
      tapListening: 'Escoltant — fes una pausa o torna a tocar per aturar',
      speaking: 'Parlant…',
      translating: 'Traduint…',
    },
    friendLooksHere: 'El teu amic mira cap a aquest costat',
    holdFacingYou: 'Sosté el telèfon de cara a tu',
  },
  az: {
    htmlLang: 'az-AZ',
    mic: {
      holdOrTapToSpeak: 'Danışmaq üçün basıb saxlayın və ya toxunun',
      releaseWhenDone: 'Dinləyirəm — bitirəndə buraxın',
      tapListening: 'Dinləyirəm — fasilə verin və ya dayandırmaq üçün yenidən toxunun',
      speaking: 'Danışıram…',
      translating: 'Tərcümə edirəm…',
    },
    friendLooksHere: 'Dostunuz bu tərəfə baxır',
    holdFacingYou: 'Telefonu özünüzə tərəf tutun',
  },
  kk: {
    htmlLang: 'kk-KZ',
    mic: {
      holdOrTapToSpeak: 'Сөйлеу үшін басып тұрыңыз немесе түртіңіз',
      releaseWhenDone: 'Тыңдап тұрмын — аяқтаған соң жіберіңіз',
      tapListening: 'Тыңдап тұрмын — үзіліс жасаңыз немесе тоқтату үшін қайта түртіңіз',
      speaking: 'Сөйлеп жатырмын…',
      translating: 'Аударып жатырмын…',
    },
    friendLooksHere: 'Сіздің досыңыз осы жаққа қарап тұр',
    holdFacingYou: 'Телефонды өзіңізге қаратып ұстаңыз',
  },
  uz: {
    htmlLang: 'uz-UZ',
    mic: {
      holdOrTapToSpeak: 'Gapirish uchun bosib turing yoki bosing',
      releaseWhenDone: 'Tinglayapman — tugatgach qo‘yib yuboring',
      tapListening: 'Tinglayapman — to‘xtab turing yoki to‘xtatish uchun yana bosing',
      speaking: 'Gapiryapman…',
      translating: 'Tarjima qilyapman…',
    },
    friendLooksHere: 'Do‘stingiz shu tomonga qarayapti',
    holdFacingYou: 'Telefonni o‘zingizga qaratib ushlang',
  },
  bg: {
    htmlLang: 'bg-BG',
    mic: {
      holdOrTapToSpeak: 'Задръжте или докоснете, за да говорите',
      releaseWhenDone: 'Слушам — пуснете, когато приключите',
      tapListening: 'Слушам — направете пауза или докоснете отново, за да спрете',
      speaking: 'Говоря…',
      translating: 'Превеждам…',
    },
    friendLooksHere: 'Вашият събеседник гледа от тази страна',
    holdFacingYou: 'Дръжте телефона с екрана към себе си',
  },
  sr: {
    htmlLang: 'sr-Cyrl-RS',
    mic: {
      holdOrTapToSpeak: 'Држите или додирните да говорите',
      releaseWhenDone: 'Слушам — пустите кад завршите',
      tapListening: 'Слушам — направите паузу или поново додирните да зауставите',
      speaking: 'Говорим…',
      translating: 'Преводим…',
    },
    friendLooksHere: 'Ваш пријатељ гледа са ове стране',
    holdFacingYou: 'Држите телефон окренут ка себи',
  },
  sw: {
    htmlLang: 'sw-KE',
    mic: {
      holdOrTapToSpeak: 'Shikilia au gusa ili uzungumze',
      releaseWhenDone: 'Nasikiliza — achia ukimaliza',
      tapListening: 'Nasikiliza — nyamaza kidogo au gusa tena ili kusimamisha',
      speaking: 'Naongea…',
      translating: 'Natafsiri…',
    },
    friendLooksHere: 'Rafiki yako anatazama upande huu',
    holdFacingYou: 'Shikilia simu ikikuelekea',
  },
  af: {
    htmlLang: 'af-ZA',
    mic: {
      holdOrTapToSpeak: 'Hou ingedruk of tik om te praat',
      releaseWhenDone: 'Luister — los wanneer jy klaar is',
      tapListening: 'Luister — maak ’n pouse of tik weer om te stop',
      speaking: 'Praat…',
      translating: 'Vertaal…',
    },
    friendLooksHere: 'Jou vriend kyk van hierdie kant af',
    holdFacingYou: 'Hou die foon na jou toe gedraai',
  },
  et: {
    htmlLang: 'et-EE',
    mic: {
      holdOrTapToSpeak: 'Hoia all või puuduta, et rääkida',
      releaseWhenDone: 'Kuulan — lase lahti, kui oled valmis',
      tapListening: 'Kuulan — tee paus või puuduta uuesti, et peatada',
      speaking: 'Räägin…',
      translating: 'Tõlgin…',
    },
    friendLooksHere: 'Sinu sõber vaatab sellele poole',
    holdFacingYou: 'Hoia telefoni enda poole',
  },
  lv: {
    htmlLang: 'lv-LV',
    mic: {
      holdOrTapToSpeak: 'Turiet nospiestu vai pieskarieties, lai runātu',
      releaseWhenDone: 'Klausos — atlaidiet, kad esat pabeidzis',
      tapListening: 'Klausos — veiciet pauzi vai pieskarieties vēlreiz, lai apturētu',
      speaking: 'Runāju…',
      translating: 'Tulkoju…',
    },
    friendLooksHere: 'Jūsu draugs skatās uz šo pusi',
    holdFacingYou: 'Turiet tālruni ar ekrānu pret sevi',
  },
  lt: {
    htmlLang: 'lt-LT',
    mic: {
      holdOrTapToSpeak: 'Palaikykite arba palieskite, kad kalbėtumėte',
      releaseWhenDone: 'Klausau — atleiskite, kai baigsite',
      tapListening: 'Klausau — padarykite pauzę arba palieskite dar kartą, kad sustabdytumėte',
      speaking: 'Kalbu…',
      translating: 'Verčiu…',
    },
    friendLooksHere: 'Jūsų draugas žiūri į šią pusę',
    holdFacingYou: 'Laikykite telefoną nukreiptą į save',
  },
  ga: {
    htmlLang: 'ga-IE',
    mic: {
      holdOrTapToSpeak: 'Coinnigh síos nó tapáil le labhairt',
      releaseWhenDone: 'Ag éisteacht — lig uait nuair a bheidh tú críochnaithe',
      tapListening: 'Ag éisteacht — déan sos nó tapáil arís chun stopadh',
      speaking: 'Ag labhairt…',
      translating: 'Ag aistriú…',
    },
    friendLooksHere: 'Tá do chara ag féachaint ar an taobh seo',
    holdFacingYou: 'Coinnigh an fón os do chomhair',
  },
  cy: {
    htmlLang: 'cy-GB',
    mic: {
      holdOrTapToSpeak: 'Daliwch neu tapiwch i siarad',
      releaseWhenDone: 'Yn gwrando — gadewch fynd pan fyddwch wedi gorffen',
      tapListening: 'Yn gwrando — oedwch neu tapiwch eto i stopio',
      speaking: 'Yn siarad…',
      translating: 'Yn cyfieithu…',
    },
    friendLooksHere: 'Mae eich ffrind yn edrych ar yr ochr hon',
    holdFacingYou: 'Daliwch y ffôn yn wynebu atoch chi',
  },
  eu: {
    htmlLang: 'eu-ES',
    mic: {
      holdOrTapToSpeak: 'Eutsi sakatuta edo ukitu hitz egiteko',
      releaseWhenDone: 'Entzuten — askatu amaitzen duzunean',
      tapListening: 'Entzuten — egin pausa edo ukitu berriro gelditzeko',
      speaking: 'Hitz egiten…',
      translating: 'Itzultzen…',
    },
    friendLooksHere: 'Zure lagunak alde honetara begiratzen du',
    holdFacingYou: 'Eduki telefonoa zure aldera begira',
  },
  gl: {
    htmlLang: 'gl-ES',
    mic: {
      holdOrTapToSpeak: 'Mantén premido ou toca para falar',
      releaseWhenDone: 'Escoitando — solta cando remates',
      tapListening: 'Escoitando — fai unha pausa ou toca de novo para parar',
      speaking: 'Falando…',
      translating: 'Traducindo…',
    },
    friendLooksHere: 'O teu amigo mira cara a este lado',
    holdFacingYou: 'Sostén o teléfono de cara a ti',
  },
  mt: {
    htmlLang: 'mt-MT',
    mic: {
      holdOrTapToSpeak: 'Żomm jew mses biex titkellem',
      releaseWhenDone: 'Qed nisma’ — ħalli meta tispiċċa',
      tapListening: 'Qed nisma’ — agħmel pawża jew mses mill-ġdid biex twaqqaf',
      speaking: 'Qed nitkellem…',
      translating: 'Qed nittraduċi…',
    },
    friendLooksHere: 'Sieħbek qed iħares lejn din in-naħa',
    holdFacingYou: 'Żomm it-telefon quddiemek',
  },
  is: {
    htmlLang: 'is-IS',
    mic: {
      holdOrTapToSpeak: 'Haltu inni eða ýttu til að tala',
      releaseWhenDone: 'Hlusta — slepptu þegar þú ert búinn',
      tapListening: 'Hlusta — taktu hlé eða ýttu aftur til að stöðva',
      speaking: 'Tala…',
      translating: 'Þýði…',
    },
    friendLooksHere: 'Vinur þinn horfir á þessa hlið',
    holdFacingYou: 'Haltu símanum snúnum að þér',
  },
  bs: {
    htmlLang: 'bs-BA',
    mic: {
      holdOrTapToSpeak: 'Držite ili dodirnite da govorite',
      releaseWhenDone: 'Slušam — pustite kad završite',
      tapListening: 'Slušam — napravite pauzu ili ponovo dodirnite da zaustavite',
      speaking: 'Govorim…',
      translating: 'Prevodim…',
    },
    friendLooksHere: 'Vaš prijatelj gleda s ove strane',
    holdFacingYou: 'Držite telefon okrenut prema sebi',
  },
  sq: {
    htmlLang: 'sq-AL',
    mic: {
      holdOrTapToSpeak: 'Mbaje shtypur ose prek për të folur',
      releaseWhenDone: 'Po dëgjoj — lëshoje kur të mbarosh',
      tapListening: 'Po dëgjoj — bëj pauzë ose prek sërish për të ndaluar',
      speaking: 'Po flas…',
      translating: 'Po përkthej…',
    },
    friendLooksHere: 'Miku yt po shikon nga kjo anë',
    holdFacingYou: 'Mbaje telefonin me ekranin nga ti',
  },
  zu: {
    htmlLang: 'zu-ZA',
    mic: {
      holdOrTapToSpeak: 'Bamba noma uthinte ukuze ukhulume',
      releaseWhenDone: 'Ngiyalalela — yekela uma usuqedile',
      tapListening: 'Ngiyalalela — misa kancane noma uthinte futhi ukuze umise',
      speaking: 'Ngiyakhuluma…',
      translating: 'Ngiyahumusha…',
    },
    friendLooksHere: 'Umngani wakho ubheke kule ndawo',
    holdFacingYou: 'Bamba ifoni ibheke kuwe',
  },
  so: {
    htmlLang: 'so-SO',
    mic: {
      holdOrTapToSpeak: 'Hay ama taabo si aad u hadasho',
      releaseWhenDone: 'Waan dhegaysanayaa — sii daa marka aad dhammayso',
      tapListening: 'Waan dhegaysanayaa — nasasho yar qaado ama mar kale taabo si aad u joojiso',
      speaking: 'Waan hadlayaa…',
      translating: 'Waan tarjumayaa…',
    },
    friendLooksHere: 'Saaxiibkaa wuxuu eegayaa dhinacan',
    holdFacingYou: 'Hayso taleefanka isagoo kuu jeeda',
  },
  as: {
    htmlLang: 'as-IN',
    mic: {
      holdOrTapToSpeak: 'কবলৈ ধৰি ৰাখক বা টেপ কৰক',
      releaseWhenDone: 'শুনি আছোঁ — শেষ হ’লে এৰি দিয়ক',
      tapListening: 'শুনি আছোঁ — বিৰতি দিয়ক বা বন্ধ কৰিবলৈ পুনৰ টেপ কৰক',
      speaking: 'কৈ আছোঁ…',
      translating: 'অনুবাদ কৰি আছোঁ…',
    },
    friendLooksHere: 'আপোনাৰ বন্ধুয়ে এইফালে চাই আছে',
    holdFacingYou: 'ফোনটো আপোনাৰ ফালে মুখ কৰি ধৰক',
  },
  mk: {
    htmlLang: 'mk-MK',
    mic: {
      holdOrTapToSpeak: 'Држете или допрете за да зборувате',
      releaseWhenDone: 'Слушам — пуштете кога ќе завршите',
      tapListening: 'Слушам — направете пауза или допрете повторно за да запрете',
      speaking: 'Зборувам…',
      translating: 'Преведувам…',
    },
    friendLooksHere: 'Вашиот пријател гледа од оваа страна',
    holdFacingYou: 'Држете го телефонот свртен кон вас',
  },
  mn: {
    htmlLang: 'mn-MN',
    mic: {
      holdOrTapToSpeak: 'Ярихын тулд удаан дарна уу эсвэл товшино уу',
      releaseWhenDone: 'Сонсож байна — дууссаны дараа тавиарай',
      tapListening: 'Сонсож байна — түр зогсоно уу эсвэл зогсоохын тулд дахин товшино уу',
      speaking: 'Ярьж байна…',
      translating: 'Орчуулж байна…',
    },
    friendLooksHere: 'Таны найз энэ тал руу харж байна',
    holdFacingYou: 'Утсаа өөрийн тал руу харуулан барина уу',
  },
  ps: {
    htmlLang: 'ps-AF',
    mic: {
      holdOrTapToSpeak: 'د خبرو کولو لپاره ونیسئ یا ټچ کړئ',
      releaseWhenDone: 'اورم — کله چې بشپړ کړئ پرې یې ږدئ',
      tapListening: 'اورم — ځنډ وکړئ یا د درولو لپاره بیا ټچ کړئ',
      speaking: 'خبرې کوم…',
      translating: 'ژباړم…',
    },
    friendLooksHere: 'ستاسو ملګری دې لوري ته ګوري',
    holdFacingYou: 'تلیفون خپل لوري ته مخامخ ونیسئ',
  },
  hy: {
    htmlLang: 'hy-AM',
    mic: {
      holdOrTapToSpeak: 'Սեղմած պահեք կամ հպեք՝ խոսելու համար',
      releaseWhenDone: 'Լսում եմ — բաց թողեք, երբ ավարտեք',
      tapListening: 'Լսում եմ — դադար տվեք կամ նորից հպեք՝ կանգնեցնելու համար',
      speaking: 'Խոսում եմ…',
      translating: 'Թարգմանում եմ…',
    },
    friendLooksHere: 'Ձեր ընկերը նայում է այս կողմը',
    holdFacingYou: 'Պահեք հեռախոսը դեպի ձեզ',
  },
  ka: {
    htmlLang: 'ka-GE',
    mic: {
      holdOrTapToSpeak: 'დააჭირეთ და გააჩერეთ ან შეეხეთ სალაპარაკოდ',
      releaseWhenDone: 'ვუსმენ — გაუშვით, როცა დაასრულებთ',
      tapListening: 'ვუსმენ — შეაჩერეთ ან კვლავ შეეხეთ გასაჩერებლად',
      speaking: 'ვლაპარაკობ…',
      translating: 'ვთარგმნი…',
    },
    friendLooksHere: 'თქვენი მეგობარი ამ მხარეს უყურებს',
    holdFacingYou: 'ტელეფონი თქვენსკენ შემოაბრუნეთ',
  },
  am: {
    htmlLang: 'am-ET',
    mic: {
      holdOrTapToSpeak: 'ለመናገር ተጭነው ይያዙ ወይም ይንኩ',
      releaseWhenDone: 'እያዳመጥኩ ነው — ሲጨርሱ ይልቀቁ',
      tapListening: 'እያዳመጥኩ ነው — ለአፍታ ያቁሙ ወይም ለማቆም እንደገና ይንኩ',
      speaking: 'እየተናገርኩ ነው…',
      translating: 'እየተረጎምኩ ነው…',
    },
    friendLooksHere: 'ጓደኛዎ ወደዚህ በኩል እያየ ነው',
    holdFacingYou: 'ስልኩን ወደ እርስዎ አዙረው ይያዙ',
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
