import { readLocalPrimaryLang, type PrimaryLang } from './primaryLanguagePref'
import { PRIMARY_UI_GLOSS } from './primaryUiGloss.data'

/** Bilingual UI copy: English + 粵語 (+ optional primary-language gloss fields). */
export type Bi = {
  en: string
  zh: string
  jp: string
  tl?: string
  es?: string
  vi?: string
  wuu?: string
  cmn?: string
}

export const ui = {
  brandTag: { en: 'Cantonese Language Tool', zh: '粵語語言工具', jp: 'jyut6 jyu5 jyu5 jin4 gung1 geoi6' },
  backHome: { en: 'Back to JyutTranslate home', zh: '返 JyutTranslate 首頁', jp: 'faan1 JyutTranslate sau2 jap6' },

  modeSolo: { en: 'Solo', zh: '獨白', jp: 'duk6 baak6' },
  modeFace: { en: 'Conversation', zh: '對話', jp: 'deoi3 waa6' },
  /** Short label for landing modes stage tabs. */
  modeFaceShort: { en: 'Conversation', zh: '對話', jp: 'deoi3 waa6' },
  modeCamera: { en: 'Cam', zh: '相機', jp: 'soeng1 gei1' },
  modeTablist: { en: 'Mode', zh: '模式', jp: 'mou4 sik1' },
  modeSoloLine: {
    en: 'Type or speak — English and Cantonese side by side.',
    zh: '打字或說話——英文同粵語並排顯示。',
    jp: 'daa2 zi6 waak6 gong2 waa6 — jing1 man2 tung4 jyut6 jyu5 bing6 paai4 hin2 si6.',
  },
  modeFaceLine: {
    en: 'One phone. Two languages, split screen — perfect for conversations!',
    zh: '一部手機，雙語分屏——最適合對話！',
    jp: 'jat1 bou6 sau2 gei1, soeng1 jyu5 fan1 ping4 — zeoi3 sik1 hap6 deoi3 waa6!',
  },
  modeCameraLine: {
    en: 'Point or upload -- translate signs and documents quickly!',
    zh: '對準或上載——快速翻譯路牌同文件！',
    jp: 'deoi3 zeon2 waak6 soeng5 zoi3 -- faai3 cuk1 faan1 jik6 lou6 paai4 tung4 man4 gin2!',
  },

  camChoiceTitle: {
    en: 'Camera translation',
    zh: '相機翻譯',
    jp: 'soeng1 gei1 faan1 jik6',
  },
  camChoiceBody: {
    en: 'Live AR, upload a photo, or translate a document with layout kept.',
    zh: '即時 AR、上載相片，或翻譯文件並盡量保留排版。',
    jp: 'zik1 si4 AR, soeng5 zoi3 soeng2 pin3, waak6 faan1 jik6 man4 gin2 bing6 zeon6 loeng4 bou2 lau4 paai4 baan2.',
  },
  camChoiceAr: {
    en: 'AR translation',
    zh: 'AR 翻譯',
    jp: 'AR faan1 jik6',
  },
  camChoiceArHint: {
    en: 'Live camera · overlay on signs',
    zh: '即時鏡頭 · 覆蓋路牌文字',
    jp: 'zik1 si4 geng3 tau4 · fuk1 goi3 lou6 paai4 man4 zi6',
  },
  camChoiceUpload: {
    en: 'Upload image',
    zh: '上載相片',
    jp: 'soeng5 zoi3 soeng2 pin3',
  },
  camChoiceUploadHint: {
    en: 'Draw and adjust boxes',
    zh: '手動畫框再翻譯',
    jp: 'sau2 dung6 waak6 kwaang1 zoi3 faan1 jik6',
  },
  camChoiceDocs: {
    en: 'Documents',
    zh: '文件',
    jp: 'man4 gin2',
  },
  camChoiceDocsHint: {
    en: 'PDF · Word · Excel · PowerPoint · text',
    zh: 'PDF · Word · Excel · PowerPoint · 文字',
    jp: 'PDF · Word · Excel · PowerPoint · man4 zi6',
  },
  camChoiceClose: { en: 'Close', zh: '關閉', jp: 'gwaan1 bai3' },
  camDocLead: {
    en: 'Word, Excel, and PowerPoint keep their formatting. PDFs place the translation back on the page — including scans.',
    zh: 'Word、Excel、PowerPoint 會保留原本排版。PDF 譯文放返原來位置，掃描文件都得。',
    jp: 'Word, Excel, PowerPoint wui5 bou2 lau4 jyun4 baan2. PDF jik6 man4 fong3 faan1 jyun4 wai6.',
  },
  camDocFrom: { en: 'From', zh: '原文', jp: 'jyun4 man4' },
  camDocTo: { en: 'To', zh: '譯文', jp: 'jik6 man4' },
  camDocPick: {
    en: 'Choose a document',
    zh: '選擇文件',
    jp: 'syun2 zaak6 man4 gin2',
  },
  camDocFormats: {
    en: 'PDF, DOCX, PPTX, XLSX, TXT · max 8 MB',
    zh: 'PDF、DOCX、PPTX、XLSX、TXT · 最⼤ 8 MB',
    jp: 'PDF, DOCX, PPTX, XLSX, TXT · zeoi3 daai6 8 MB',
  },
  camDocWorking: {
    en: 'Translating document…',
    zh: '正在翻譯文件…',
    jp: 'zing3 zoi6 faan1 jik6 man4 gin2…',
  },
  camDocOffice: {
    en: 'Preserving layout…',
    zh: '保留排版中…',
    jp: 'bou2 lau4 paai4 baan2 zung1…',
  },
  camDocDone: {
    en: 'Ready to download',
    zh: '可以下載',
    jp: 'ho2 ji5 haa6 zoi3',
  },
  /** Bounce-line stages for Cam → Documents (short so letter wave stays readable). */
  camDocStageStarting: {
    en: 'Starting…',
    zh: '開始緊…',
    jp: 'hoi1 ci2 gan2…',
  },
  camDocStageSaving: {
    en: 'Saving pages…',
    zh: '儲存頁面中…',
    jp: 'cou5 cyun4 jip6 min6 zung1…',
  },
  camDocDownload: {
    en: 'Download translation',
    zh: '下載譯文',
    jp: 'haa6 zoi3 jik6 man4',
  },
  camDocPrivacy: {
    en: "Your file is used only for translation. We don't attach it to bug reports.",
    zh: '文件只用於翻譯，唔會附喺錯誤回報入面。',
    jp: 'man4 gin2 zi2 jung6 jyu1 faan1 jik6, m4 wui5 fu6 hai2 cho3 ng6 wui4 bou3.',
  },
  camDocRemaining: {
    en: 'Pages left this month',
    zh: '本月剩餘頁數',
    jp: 'bun2 jyut6 sing4 jyu4 jip6 sou3',
  },
  camDocUnlimited: {
    en: 'Unlimited pages (usage still counted)',
    zh: '頁數無上限（仍會計量）',
    jp: 'jip6 sou3 mou4 soeng6 haan6',
  },
  camDocQuota: {
    en: 'Document page quota exhausted. Upgrade for more pages.',
    zh: '文件頁數已用完。升級可加頁數。',
    jp: 'man4 gin2 jip6 sou3 ji5 jung6 jyun4.',
  },
  camDocNeedPages: {
    en: 'Not enough pages left for this PDF.',
    zh: '剩餘頁數唔夠呢份 PDF。',
    jp: 'sing4 jyu4 jip6 sou3 m4 gau3.',
  },
  camBack: { en: 'Back', zh: '返回', jp: 'faan1 wui4' },
  camCapture: { en: 'Capture & translate', zh: '拍攝並翻譯', jp: 'paak3 sip3 bing6 faan1 jik6' },
  camCaptureHint: {
    en: 'Point at text, then tap the camera to translate',
    zh: '對準文字，再輕按相機翻譯',
    jp: 'deoi3 zeon1 man4 zi6, zoi3 hing1 on3 soeng1 gei1 faan1 jik6',
  },
  camCaptureHintZoomFocus: {
    en: 'Pinch or dial to zoom, tap to focus, then capture',
    zh: '雙指或滑桿放大，輕按對焦，再拍攝',
    jp: 'soeng1 zi2 waak6 waat6 gon1 fong3 daai6, hing1 on3 deoi3 ziu1, zoi3 paak3 sip3',
  },
  camLiveZoom: { en: 'Zoom', zh: '放大', jp: 'fong3 daai6' },
  camClearOverlays: { en: 'Clear translations', zh: '清除翻譯', jp: 'cing1 ceoi4 faan1 jik6' },
  camDetailTitle: { en: 'Translation detail', zh: '翻譯詳情', jp: 'faan1 jik6 coeng4 cing4' },
  camOpenDetails: { en: 'Details', zh: '詳情', jp: 'coeng4 cing4' },
  camOpenDetailsHint: {
    en: 'Tap translation for character details',
    zh: '撳翻譯睇單字詳情',
    jp: 'gam2 faan1 jik6 tai2 daan1 zi6 coeng4 cing4',
  },
  camNoTextFound: {
    en: 'No text found — try again closer or with better light',
    zh: '未偵測到文字——靠近一點或改善光線再試',
    jp: 'mei6 zing1 caak1 dou2 man4 zi6 — kao3 gan6 jat1 dim2 waak6 goi2 sin6 gwong1 sin3 zoi3 si3',
  },
  camRateLimited: {
    en: 'OCR is rate-limited — wait a few seconds, then capture again',
    zh: 'OCR 請求過頻——請稍候幾秒再拍攝',
    jp: 'OCR cing2 kau4 gwo3 pan4 — cing2 siu2 hau6 gei2 miu5 zoi3 paak3 sip3',
  },
  camTranslate: { en: 'Translate', zh: '翻譯', jp: 'faan1 jik6' },
  camAutoDetect: { en: 'Translate all', zh: '全部翻譯', jp: 'cyun4 bou6 faan1 jik6' },
  camDeleteBox: { en: 'Delete box', zh: '刪除選框', jp: 'saan1 ceoi4 syun2 kwaang1' },
  camTargetEn: { en: 'To English', zh: '譯成英文', jp: 'jik6 sing4 jing1 man2' },
  camTargetZh: { en: 'To 中文', zh: '譯成中文', jp: 'jik6 sing4 zung1 man2' },
  camTargetYue: { en: 'To Cantonese', zh: '譯成粵語', jp: 'jik6 sing4 jyut6 jyu5' },
  camTargetCmn: { en: 'To Mandarin', zh: '譯成普通話', jp: 'jik6 sing4 pou2 tung1 waa2' },
  camTargetTl: { en: 'To Tagalog', zh: '譯成他加祿語', jp: 'jik6 sing4 taa1 gaa1 luk6 jyu5' },
  camTargetEs: { en: 'To Spanish(MX)', zh: '譯成西班牙語（MX）', jp: 'jik6 sing4 sai1 baan1 ngaa4 jyu5 (MX)' },
  camTargetVi: { en: 'To Vietnamese', zh: '譯成越南話', jp: 'jik6 sing4 jyut6 naam4 waa2' },
  camTargetCeb: { en: 'To Cebuano', zh: '譯成宿霧話', jp: 'jik6 sing4 suk1 mou6 waa2' },
  camTargetIlo: { en: 'To Ilocano', zh: '譯成伊洛卡诺話', jp: 'jik6 sing4 ji1 lok6 kaa1 nok3 waa2' },
  camTargetBcl: { en: 'To Bikol (Central)', zh: '譯成中比科爾話', jp: 'jik6 sing4 zung1 bei2 ho1 ji5 waa2' },
  camTargetAuto: { en: 'Auto', zh: '自動', jp: 'zi6 dung6' },
  camScanning: { en: 'Scanning…', zh: '掃描中…', jp: 'siu2 miu4 zung1…' },
  camNoVision: {
    en: "OCR not configured — draw boxes and we'll still try translate when text is detected.",
    zh: '未設定 OCR——可手動畫框；偵測到文字後仍會翻譯。',
    jp: 'mei6 cit3 ding6 OCR — ho2 sau2 dung6 waak6 kwaang1; zing1 caak1 dou2 man4 zi6 hau6 jing4 wui5 faan1 jik6.',
  },
  camVisionAuthFailed: {
    en: 'OCR credentials invalid — set AZURE_VISION_KEY and AZURE_VISION_ENDPOINT on the server. Draw boxes manually for now.',
    zh: 'OCR 憑證無效——請在伺服器設定 AZURE_VISION_KEY 與 AZURE_VISION_ENDPOINT。可先手動畫框。',
    jp: 'OCR pang4 zing3 mou4 siu6 — cing2 bei6 fu6 kei4 cit3 ding6 AZURE_VISION_KEY tung4 AZURE_VISION_ENDPOINT. ho2 sin1 sau2 dung6 waak6 kwaang1.',
  },
  camQuota: {
    en: 'Camera scan credits used up this month.',
    zh: '本月相機掃描額度已用完。',
    jp: 'bun2 jyut6 soeng1 gei1 sou3 miu4 ngaak6 dou6 ji5 jung6 jyun4.',
  },
  guestTrialExhaustedLive: {
    en: 'Guest live time used up. Sign in to continue on Free.',
    zh: '訪客即時分鐘已用完。登入後可用免費版繼續。',
    jp: 'haak3 haak3 zik1 si4 fan1 zung1 ji5 jung6 jyun4. dang1 jap6 hau6 ho2 jung6 min5 fai3 baan2.',
  },
  guestTrialExhaustedCam: {
    en: 'Guest camera scans used up. Sign in to continue on Free.',
    zh: '訪客相機掃描已用完。登入後可用免費版繼續。',
    jp: 'haak3 haak3 soeng1 gei1 sou3 miu4 ji5 jung6 jyun4. dang1 jap6 hau6 ho2 jung6 min5 fai3 baan2.',
  },
  guestDocsSignIn: {
    en: 'Sign in to translate documents.',
    zh: '登入後先可以翻譯文件。',
    jp: 'dang1 jap6 hau6 sin1 ho2 ji5 faan1 jik6 man4 gin2.',
  },
  camSignIn: {
    en: 'Sign in to use camera translation',
    zh: '登入後使用相機翻譯',
    jp: 'dang1 jap6 hau6 si2 jung6 soeng1 gei1 faan1 jik6',
  },
  camSaveSnapshot: { en: 'Save photo', zh: '儲存相片', jp: 'cou5 cyun4 soeng1 pin3' },
  camArSaveTitle: { en: 'Save or copy', zh: '儲存或複製', jp: 'cou5 cyun4 waak6 fuk1 zai3' },
  camArSaveBody: {
    en: 'Keep the translated photo, or copy every translation from top to bottom.',
    zh: '儲存帶翻譯嘅相片，或由上至下複製全部翻譯。',
    jp: 'cou5 cyun4 daai3 faan1 jik6 ge3 soeng1 pin3, waak6 jau4 soeng6 zi3 haa6 fuk1 zai3 cyun4 bou6 faan1 jik6.',
  },
  camArSavePhotoHint: {
    en: 'Download the photo with translations',
    zh: '下載帶翻譯嘅相片',
    jp: 'haa6 zoi3 daai3 faan1 jik6 ge3 soeng1 pin3',
  },
  camArCopyTranslations: {
    en: 'Copy translations to clipboard',
    zh: '複製翻譯到剪貼簿',
    jp: 'fuk1 zai3 faan1 jik6 dou3 zin2 tip3 bou6',
  },
  camArCopyTranslationsHint: {
    en: 'All translations, top of image to bottom',
    zh: '由圖像頂至底嘅全部翻譯',
    jp: 'jau4 tou4 zoeng6 deng2 zi3 dai2 ge3 cyun4 bou6 faan1 jik6',
  },
  camArCopiedToast: { en: 'Translations copied', zh: '已複製翻譯', jp: 'ji5 fuk1 zai3 faan1 jik6' },
  camArSaveFailed: {
    en: 'Could not save photo — try again',
    zh: '無法儲存相片——請再試',
    jp: 'mou4 faat3 cou5 cyun4 soeng1 pin3 — cing2 zoi3 si3',
  },
  camCopy: { en: 'Copy', zh: '複製', jp: 'fuk1 zai3' },
  camResults: { en: 'Results', zh: '結果', jp: 'git3 gwo2' },
  camDrawMode: { en: 'Draw box', zh: '畫框', jp: 'waak6 kwaang1' },
  camDrawHint: {
    en: 'Pinch or scroll to zoom · Draw box to add · drag boxes until Translate locks them',
    zh: '雙指或捲動縮放 · 畫框加選區 · 翻譯前可拖動，翻譯後鎖定',
    jp: 'soeng1 zi2 waak6 gu2 dung6 suok1 fong3 · waak6 kwaang1 gaa1 syun2 keoi1 · faan1 jik6 cin4 ho2 to1 dung6 · faan1 jik6 hau6 so2 ding6',
  },
  camMinutesLeft: (formatted: string): Bi => ({
    en: `${formatted} left`,
    zh: `剩餘 ${formatted}`,
    jp: `sang1 jyu4 ${formatted}`,
    es: `${formatted} restantes`,
    tl: `${formatted} natitira`,
    vi: `còn ${formatted}`,
    wuu: `剩余 ${formatted}`,
  }),
  camMinutesUsedUnlimited: (formatted: string): Bi => ({
    en: `${formatted} used / unlimited`,
    zh: `已用 ${formatted}／無限`,
    jp: `ji5 jung6 ${formatted} / mou4 haan6`,
    es: `${formatted} usados / ilimitado`,
    tl: `${formatted} nagamit / walang limit`,
    vi: `đã dùng ${formatted} / không giới hạn`,
    wuu: `已用 ${formatted}／无限`,
  }),
  camScansLeft: (n: string): Bi => ({
    en: `${n} camera scans left`,
    zh: `剩餘 ${n} 次相機掃描`,
    jp: `zi6 jyu4 ${n} ci3 soeng1 gei1 sou3 miu4`,
    es: `${n} escaneos de cámara restantes`,
    tl: `${n} camera scans ang natitira`,
    vi: `còn ${n} lần quét camera`,
    wuu: `剩余 ${n} 次相机扫描`,
  }),
  camScansUsedUnlimited: (n: string): Bi => ({
    en: `${n} camera scans used · unlimited`,
    zh: `已用 ${n} 次相機掃描 · 無限`,
    jp: `ji5 jung6 ${n} ci3 soeng1 gei1 sou3 miu4 · mou4 haan6`,
    es: `${n} escaneos de cámara usados · ilimitado`,
    tl: `${n} camera scans nagamit · walang limit`,
    vi: `đã dùng ${n} lần quét camera · không giới hạn`,
    wuu: `已用 ${n} 次相机扫描 · 无限`,
  }),
  holdOrTapToSpeak: {
    en: 'Hold or tap to speak',
    zh: '按住或輕按講',
    jp: 'on3 zyu6 waak6 hing1 on3 gong2',
  },
  liveMicSignIn: {
    en: 'Sign in required for live mic',
    zh: '即時咪高峰需要登入',
    jp: 'zik1 si4 mai1 gou1 fung1 seoi1 jiu3 dang1 jap6',
  },
  releaseWhenDone: {
    en: 'Listening — release when done',
    zh: '聽緊——鬆手就翻譯',
    jp: 'teng1 gan2 — sung1 sau2 zau6 faan1 jik6',
  },
  /** Sticky tap: auto-stops after a sentence pause, or tap again to finish now. */
  tapListening: {
    en: 'Listening — pause or tap to stop',
    zh: '聽緊——停頓或再撳停',
    jp: 'teng1 gan2 — ting4 dyun6 waak6 zoi3 gam2 ting4',
  },
  speaking: { en: 'Speaking…', zh: '講緊…', jp: 'gong2 gan2…' },
  translating: { en: 'Translating', zh: '翻譯緊', jp: 'faan1 jik6 gan2' },

  direction: { en: 'Direction', zh: '方向', jp: 'fong1 hoeng3' },
  dirEnglish: { en: 'English', zh: '英文', jp: 'jing1 man2' },
  dirJyutjyu: { en: 'Cantonese', zh: '粵語', jp: 'jyut6 jyu5' },
  dirMandarin: { en: 'Mandarin', zh: '普通話', jp: 'pou2 tung1 waa2' },
  dirShanghainese: { en: 'Shanghainese', zh: '上海話', jp: 'soeng6 hoi2 waa2' },
  dirSichuanese: { en: 'Sichuanese', zh: '四川話', jp: 'sei3 cyun1 waa2' },
  dirTagalog: { en: 'Tagalog', zh: '他加祿語', jp: 'taa1 gaa1 luk6 jyu5' },
  dirMexicanSpanish: { en: 'Spanish(MX)', zh: '西班牙語（MX）', jp: 'sai1 baan1 ngaa4 jyu5 (MX)' },
  dirVietnamese: { en: 'Vietnamese', zh: '越南話', jp: 'jyut6 naam4 waa2' },
  dirCebuano: { en: 'Cebuano', zh: '宿霧話', jp: 'suk1 mou6 waa2' },
  dirIlocano: { en: 'Ilocano', zh: '伊洛卡诺話', jp: 'ji1 lok6 kaa1 nok3 waa2' },
  dirBikol: { en: 'Bikol (Central)', zh: '中比科爾話', jp: 'zung1 bei2 ho1 ji5 waa2' },
  textOnlyLangTip: {
    en: 'Text only — type to translate. Speech isn’t available for this language yet.',
    zh: '純文字——請打字翻譯。此語言暫未支援語音。',
    jp: 'ceon4 man4 zi6 — cing2 daa2 zi6 faan1 jik6. ci2 jyu5 jin4 zaam6 mei6 zi1 jyun4 jyu5 jam1.',
  },
  textOnlyLangTipClose: { en: 'Dismiss', zh: '關閉', jp: 'gwaan1 bai3' },
  mxInformalNote: {
    en: 'This line is informal Spanish(MX).',
    zh: '呢句係非正式西班牙語（MX）。',
    jp: 'ni1 geoi3 hai6 fei1 zing3 sik1 sai1 baan1 ngaa4 jyu5 (MX).',
    es: 'Esta línea es español (MX) informal.',
    tl: 'Ang linya na ito ay informal na Spanish(MX).',
    vi: 'Câu này là Spanish(MX) thân mật.',
    wuu: '搿句是非正式西班牙语（MX）。',
  },
  mxFormalize: {
    en: 'Make formal',
    zh: '改成正式',
    jp: 'goi2 sing4 zing3 sik1',
    es: 'Hacer formal',
    tl: 'Gawing pormal',
    vi: 'Chuyển sang trang trọng',
    wuu: '改成正式',
  },
  mxFormalizeNeedSource: {
    en: 'Open details from a full turn to formalize from the source.',
    zh: '由完整對話打開詳情，先可以用原文改正式。',
    jp: 'jau4 jyun4 man4 hoi1 hoi1 soeng4 cing4.',
    es: 'Abre los detalles de un turno completo para formalizar.',
    tl: 'Buksan ang details mula sa full turn para ma-formalize.',
    vi: 'Mở chi tiết từ một lượt đầy đủ để chuyển sang trang trọng.',
    wuu: '由完整对话打开详情，先可以用原文改正式。',
  },
  autoSpeak: { en: 'Auto-speak', zh: '自動朗讀', jp: 'zi6 dung6 long5 duk6' },
  autoSpeakHint: {
    en: 'Play translations aloud automatically after each turn.',
    zh: '每次翻譯後自動朗讀。',
    jp: 'mui5 ci3 faan1 jik6 hau6 zi6 dung6 long5 duk6.',
  },
  autoSpeakFamily: { en: 'Auto-speak (Family)', zh: '自動朗讀（家庭版）', jp: 'zi6 dung6 long5 duk6 (gaa1 ting4 baan2)' },
  primaryLanguage: { en: 'Primary language', zh: '主要語言', jp: 'zyu2 jiu3 jyu5 jin4' },
  primaryLanguageHint: {
    en: 'Sets Solo, Conversation (your side), Cam translations, and the label under the logo.',
    zh: '設定 Solo、對話（你的一側）、Cam 譯文，以及標誌下方名稱。',
    jp: 'Solo, Conversation, Cam tung4 brand tag.',
  },
  speak: { en: 'Play voice', zh: '播放語音', jp: 'bo3 fong3 jyu5 jam1' },
  stopSpeak: { en: 'Stop voice', zh: '停止語音', jp: 'ting4 zi2 jyu5 jam1' },
  speakPro: { en: 'Voice playback', zh: '語音播放', jp: 'jyu5 jam1 bo3 fong3' },
  copyText: { en: 'Copy text', zh: '複製文字', jp: 'fuk6 zai3 man4 zi6' },
  copied: { en: 'Copied', zh: '已複製', jp: 'ji5 fuk6 zai3' },
  copyJyutping: {
    en: 'Copy Jyutping + Chao tone letters',
    zh: '複製粵拼＋趙元任調號',
    jp: 'fuk6 zai3 jyut6 ping3 + diu6 hou6',
  },
  copyJyutpingFamily: {
    en: 'Copy Jyutping + Chao tone letters (Family)',
    zh: '複製粵拼＋趙元任調號（家庭版）',
    jp: 'fuk6 zai3 jyut6 ping3 + diu6 hou6 (gaa1 ting4 baan2)',
  },
  copiedJyutping: {
    en: 'Jyutping copied',
    zh: '已複製粵拼',
    jp: 'ji5 fuk6 zai3 jyut6 ping3',
  },
  clear: { en: 'Clear', zh: '清除', jp: 'cing1 ceoi4' },

  historyTitle: { en: 'History', zh: '紀錄', jp: 'gei3 luk6' },
  historyEmpty: {
    en: 'Past translations show up here for two weeks, then clear on their own.',
    zh: '以前嘅翻譯會喺呢度顯示兩星期，之後會自動清除。',
    jp: 'ji5 cin4 ge3 faan1 jik6 wui5 hai2 ni1 dou6 hin2 si6 loeng5 sing1 kei4, zi1 hau6 wui5 zi6 dung6 cing1 ceoi4.',
  },
  historyLatest: { en: 'Latest', zh: '最新', jp: 'zeoi3 san1' },
  historyExpand: { en: 'Expand', zh: '展開', jp: 'zin2 hoi1' },
  historyCollapse: { en: 'Collapse', zh: '收起', jp: 'sau1 hei2' },
  historyClear: { en: 'Clear history', zh: '清除紀錄', jp: 'cing1 ceoi4 gei3 luk6' },
  historyVariations: { en: 'Other variations', zh: '其他講法', jp: 'kei4 taa1 gong2 faat3' },
  historyBreakdown: {
    en: 'Character breakdown',
    zh: '逐字拆解',
    jp: 'zuk6 zi6 caak3 gaai2',
  },
  loadingVariations: {
    en: 'Loading other variations…',
    zh: '載入其他講法…',
    jp: 'zoi3 jap6 kei4 taa1 gong2 faat3…',
  },
  historyNoDetails: {
    en: 'No extra details for this turn.',
    zh: '呢輪冇額外詳情。',
    jp: 'ni1 leon4 mou5 ngoi6 ngoi6 coeng4 cing4.',
  },

  english: { en: 'English', zh: '英文', jp: 'jing1 man2' },
  cantonese: { en: 'Cantonese', zh: '粵語', jp: 'jyut6 jyu5' },
  speakToTranslate: {
    en: 'Hold or tap the button and speak',
    zh: '按住或輕按掣講嘢',
    jp: 'on3 zyu6 waak6 hing1 on3 zai3 gong2 je5',
  },
  holdFacingYou: { en: 'Hold phone facing you', zh: '手機對住自己', jp: 'sau2 gei1 deoi3 zyu6 zi6 gei2' },
  friendLooksHere: {
    en: 'Friend faces this side',
    zh: '對面朋友望住呢度',
    jp: 'deoi3 min6 pang4 jau5 mong6 zyu6 nei1 dou6',
  },
  yueTranslation: { en: 'Cantonese translation', zh: '粵語翻譯', jp: 'jyut6 jyu5 faan1 jik6' },
  enTranslation: { en: 'English translation', zh: '英文翻譯', jp: 'jing1 man2 faan1 jik6' },

  typeEnglish: { en: 'Type English…', zh: '輸入英文…', jp: 'syu1 jap6 jing1 man2…' },
  typeCantonese: { en: 'Type Cantonese…', zh: '輸入粵語…', jp: 'syu1 jap6 jyut6 jyu5…' },
  /** Solo text fields — single-language placeholders (Apple-style). */
  soloTapTypeEnglish: {
    en: 'Tap to type in English',
    zh: 'Tap to type in English',
    jp: 'dim2 jik6 syu1 jap6 jing1 man2',
  },
  soloTapTypeChinese: {
    en: '輕按輸入中文',
    zh: '輕按輸入中文',
    jp: 'hing1 on3 syu1 jap6 zung1 man2',
  },
  translate: { en: 'Translate', zh: '翻譯', jp: 'faan1 jik6' },
  autoTranslateHint: {
    en: 'Translations start after 2 second pause — or press Enter',
    zh: '停打兩秒後開始翻譯——或者撳 Enter',
    jp: 'ting4 daa2 loeng5 miu5 hau6 hoi1 ci2 faan1 jik6 — waak6 ze2 gam2 Enter',
  },
  result: { en: 'Result', zh: '結果', jp: 'git3 gwo2' },
  definition: { en: 'Definition', zh: '釋義', jp: 'sik1 ji6' },
  close: { en: 'Close', zh: '關閉', jp: 'gwaan1 bai3' },
  charDetail: { en: 'Character detail', zh: '單字詳情', jp: 'daan1 zi6 coeng4 cing4' },
  detailDictionary: { en: 'Dictionary', zh: '詞典', jp: 'ci4 din2' },
  detailDictionaryLoading: {
    en: 'Building a unified entry…',
    zh: '正在整理統一詞條…',
    jp: 'zing3 zoi6 zing2 lei5 tung2 jat1 ci4 tiu4',
  },
  detailSenses: { en: 'Senses', zh: '義項', jp: 'ji6 hong6' },
  detailExamples: { en: 'Examples', zh: '例句', jp: 'lai6 geoi3' },
  detailUsage: { en: 'Usage', zh: '用法', jp: 'jung6 faat3' },
  detailWordBreakdown: { en: 'Word breakdown', zh: '逐詞拆解', jp: 'zuk6 ci4 caak3 gaai2' },
  detailNoWordDetails: {
    en: 'No word details available.',
    zh: '暫無逐詞資料。',
    jp: 'zaam6 mou4 zuk6 ci4 zi1 liu2',
  },
  detailNoAlternatives: {
    en: 'No alternative translations for this phrase.',
    zh: '呢句暫時冇其他譯法。',
    jp: 'ni1 geoi3 zaam6 si4 mou5 kei4 taa1 jik6 faat3.',
  },

  connecting: { en: 'Connecting…', zh: '連接中…', jp: 'lin4 zip3 zung1…' },
  planFree: { en: 'Free', zh: '免費', jp: 'min5 fai3' },
  planFamily: { en: 'Family', zh: '家庭版', jp: 'gaa1 ting4 baan2' },
  planGuest: { en: 'Guest', zh: '訪客', jp: 'fong2 haak3' },
  signIn: { en: 'Sign in', zh: '登入', jp: 'dang1 jap6' },
  signInGoogle: { en: 'Continue with Google', zh: '使用 Google 登入', jp: 'jau6 Google dang1 jap6' },
  signInApple: { en: 'Continue with Apple', zh: '使用 Apple 登入', jp: 'jau6 Apple dang1 jap6' },
  signInOr: { en: 'or', zh: '或', jp: 'waak6' },
  register: { en: 'Create account', zh: '註冊', jp: 'zyu3 caak1' },
  createAccount: { en: 'Need an account? Register', zh: '未有帳戶？註冊', jp: 'mei6 jau5 zoeng3 wu6？zyu3 caak1' },
  signOut: { en: 'Sign out', zh: '登出', jp: 'dang1 ceot1' },
  manageBilling: { en: 'Billing', zh: '帳單', jp: 'zoeng3 daan1' },
  upgrade: { en: 'Upgrade', zh: '升級', jp: 'sing1 kap1' },
  accountHub: { en: 'Account', zh: '帳戶', jp: 'zoeng3 wu6' },
  accountClose: { en: 'Close account', zh: '關閉帳戶', jp: 'gwaan1 bai3 zoeng3 wu6' },
  accountUsername: { en: 'Username', zh: '用戶名稱', jp: 'jung6 wu6 ming4 cing1' },
  accountUsernamePlaceholder: {
    en: 'Choose a username',
    zh: '設定用戶名稱',
    jp: 'cit3 ding6 jung6 wu6 ming4 cing1',
  },
  accountUsernameHint: {
    en: '3–24 characters · letters, numbers, . _ - · once per hour',
    zh: '3–24 字 · 英數 . _ - · 每小時可改一次',
    jp: '3–24 zi6 · jing1 sou3 . _ - · mui5 siu2 si4 ho2 goi2 jat1 ci3',
  },
  accountUsernameSave: { en: 'Save', zh: '儲存', jp: 'cou5 cyun4' },
  accountUsernameEdit: { en: 'Edit username', zh: '更改用戶名稱', jp: 'gong2 goi2 jung6 wu6 ming4 cing1' },
  accountUsernameCancel: { en: 'Cancel', zh: '取消', jp: 'heoi2 siu1' },
  accountPlan: { en: 'Plan', zh: '計劃', jp: 'gai3 waak6' },
  accountRole: { en: 'Role', zh: '角色', jp: 'gok3 sik1' },
  accountUsage: { en: 'This month', zh: '今個月', jp: 'gam1 go3 jyut6' },
  accountUsagePooled: {
    en: 'Shared this month',
    zh: '今個月共用',
    jp: 'gam1 go3 jyut6 gung6 jung6',
  },
  accountHousehold: { en: 'Household seats', zh: '家庭座位', jp: 'gaa1 ting4 zo6 wai2' },
  accountHouseholdPooledHint: {
    en: 'Everyone shares one monthly allowance for live mic, camera, and documents.',
    zh: '全家人共用一個月額——即時咪、相機同文件一齊計。',
    jp: 'cyun4 gaa1 jan4 gung6 jung6 jat1 go3 jyut6 ngaak2 — zik1 si4 mai1, soeng1 gei1 tung4 man4 gin2 jat1 cai4 gai3.',
  },
  accountSeatsUsed: (used: string, limit: string): Bi => ({
    en: `${used} / ${limit} seats`,
    zh: `${used} / ${limit} 個座位`,
    jp: `${used} / ${limit} go3 zo6 wai2`,
  }),
  accountInviteEmail: { en: 'Invite by email', zh: '用电郵邀請', jp: 'jung6 din6 jau4 jiu1 cing2' },
  accountInvitePlaceholder: {
    en: 'family@email.com',
    zh: 'family@email.com',
    jp: 'family@email.com',
  },
  accountInviteSend: { en: 'Send invite', zh: '傳送邀請', jp: 'cyun4 sung3 jiu1 cing2' },
  accountInviteSent: {
    en: 'Invite sent',
    zh: '邀請已送出',
    jp: 'jiu1 cing2 ji5 sung3 ceot1',
  },
  accountInviteSentTo: (email: string): Bi => ({
    en: `Invite sent to ${email}`,
    zh: `已邀請 ${email}`,
    jp: `ji5 jiu1 cing2 ${email}`,
  }),
  accountInvitePending: { en: 'Pending', zh: '待接受', jp: 'doi6 zip3 sau6' },
  accountInviteRevoke: { en: 'Revoke', zh: '取消', jp: 'ceoi4 siu1' },
  accountMemberRemove: { en: 'Remove', zh: '移除', jp: 'ji4 ceoi4' },
  accountMemberYou: { en: 'You', zh: '你', jp: 'nei5' },
  accountMemberOwner: { en: 'Owner', zh: '戶主', jp: 'wu6 zyu2' },
  accountInviteError: {
    en: 'Could not send invite',
    zh: '未能傳送邀請',
    jp: 'mei6 nang4 cyun4 sung3 jiu1 cing2',
  },
  usageDocs: { en: 'Documents', zh: '文件', jp: 'man4 gin2' },
  usageMetersHint: {
    en: 'Double-tap a chart for details',
    zh: '雙擊圖表睇詳情',
    jp: 'soeng1 gik6 tou4 biu2 tai2 coeng4 cing4',
  },
  usageMetersHintTouch: {
    en: 'Tap for exact time · double-tap for details',
    zh: '輕觸睇精確時間 · 雙擊睇詳情',
    jp: 'hing1 zuk1 tai2 zing1 kok3 si4 gaan3 · soeng1 gik6 tai2 coeng4 cing4',
  },
  usageMetersHintMouse: {
    en: 'Hover for exact time · double-click for details',
    zh: '滑過睇精確時間 · 雙擊睇詳情',
    jp: 'waat6 gwo3 tai2 zing1 kok3 si4 gaan3 · soeng1 gik6 tai2 coeng4 cing4',
  },
  usageMetersA11y: {
    en: 'Usage meters. Tap or hover for exact time. Double-tap or press Enter for details. Space toggles exact time.',
    zh: '用量圖表。輕觸或滑過睇精確時間。雙擊或按 Enter 睇詳情。空白鍵切換精確時間。',
    jp: 'jung6 loeng6 tou4 biu2. hing1 zuk1 waak6 waat6 gwo3 tai2 zing1 kok3 si4 gaan3. soeng1 gik6 waak6 on3 Enter tai2 coeng4 cing4. hung1 baak6 gan6 cit3 wun6 zing1 kok3 si4 gaan3.',
  },
  usageMetersLegendYou: { en: 'You', zh: '你', jp: 'nei5' },
  usageMetersLegendFamily: { en: 'Family', zh: '家人', jp: 'gaa1 jan4' },
  usageDetailTitle: {
    en: 'Usage details',
    zh: '用量詳情',
    jp: 'jung6 loeng6 coeng4 cing4',
  },
  usageDetailLead: {
    en: 'These meters reset each calendar month. Unlimited meters still track use so you can see activity.',
    zh: '呢啲用量每個曆月重置。無限嘅項目仍會計數，方便你睇活躍度。',
    jp: 'ne1 di1 jung6 loeng6 mui5 go3 lik6 jyut6 cung4 zi3. mou4 haan6 ge3 hong6 muk6 jing4 wui5 gai3 sou3, fong1 bin6 nei5 tai2 wut6 joek6 dou6.',
  },
  usageDetailLive: {
    en: 'Time the live mic is actively listening in Solo or Conversation.',
    zh: '獨白或對話模式入面，即時咪正在收聽嘅時間。',
    jp: 'duk6 baak6 waak6 deoi3 waa6 mou4 sik1 jap6 min6, zik1 si4 mai1 zing3 zoi6 sau1 teng1 ge3 si4 gaan3.',
  },
  usageDetailVoice: {
    en: 'Characters spoken with tap-to-play or auto-speak. Family/Business are unlimited but still counted.',
    zh: '撳喇叭或自動朗讀嘅字數。家庭／商務版無限但仍會計量。',
    jp: 'gam2 laa3 baa1 waak6 zi6 dung6 long5 duk6 ge3 zi6 sou3. gaa1 ting4 / kei4 gaam3 baan2 mou4 haan6 daan6 jing4 wui5 gai3 loeng4.',
  },
  usageDetailCamera: {
    en: 'Camera scan credits this month (each AR shutter or upload translate). Session time is logged separately for admin.',
    zh: '今個月相機掃描額度（每次 AR 快門或上載翻譯）。使用時長另作管理紀錄。',
    jp: 'gam1 go3 jyut6 soeng1 gei1 sou3 miu4 ngaak6 dou6 (mui5 ci3 AR faai3 mun4 waak6 soeng5 zoi3 faan1 jik6). si2 jung6 si4 coeng4 ling6 zou6 gun2 lei5 gei3 luk6.',
  },
  usageDetailDocs: {
    en: 'Document pages translated in Cam → Documents this month.',
    zh: '今個月喺相機 → 文件翻譯嘅頁數。',
    jp: 'gam1 go3 jyut6 hai2 soeng1 gei1 → man4 gin2 faan1 jik6 ge3 jip6 sou3.',
  },
  usageDetailAiVision: {
    en: 'AI vision OCR fallbacks this month (hard cap — Azure OCR still works when exhausted).',
    zh: '今個月 AI 視覺 OCR 後備次數（有硬上限；用盡後仍可用 Azure OCR）。',
    jp: 'gam1 go3 jyut6 AI si6 gok3 OCR hau6 bei6 ci3 sou3 (jau5 ngaang6 soeng6 haan6; jung6 zeon6 hau6 jing4 ho2 jung6 Azure OCR).',
  },
  accountLive: { en: 'Live mic', zh: '即時咪', jp: 'zik1 si4 mai1' },
  accountVoice: { en: 'Voice', zh: '語音', jp: 'jyu5 jam1' },
  accountAiVision: { en: 'AI vision', zh: 'AI 識字', jp: 'AI sik1 zi6' },
  accountAiVisionUsed: (n: string): Bi => ({
    en: `${n} AI reads`,
    zh: `${n} 次 AI 識字`,
    jp: `${n} ci3 AI sik1 zi6`,
  }),
  accountBadgeDisplay: {
    en: 'Badge shows',
    zh: '角標顯示',
    jp: 'gok3 biu1 hin2 si6',
  },
  accountBadgeLive: { en: 'Live mic', zh: '即時咪', jp: 'zik1 si4 mai1' },
  accountBadgeVoice: { en: 'Voice', zh: '語音', jp: 'jyu5 jam1' },
  accountBadgeCamera: { en: 'Camera', zh: '相機', jp: 'soeng1 gei1' },
  accountBadgeHint: {
    en: 'Choose what appears under your plan badge',
    zh: '選擇計劃角標下方顯示的用量',
    jp: 'syun2 zaak6 gai3 waak6 gok3 biu1 haa6 fong1 hin2 si6 dik1 jung6 loeng6',
  },
  accountTtsVoices: { en: 'Voice playback', zh: '語音朗讀', jp: 'jyu5 jam1 long5 duk6' },
  accountTtsYue: { en: 'Cantonese', zh: '粵語', jp: 'jyut6 jyu5' },
  accountTtsEn: { en: 'English', zh: '英語', jp: 'jing1 jyu5' },
  accountTtsCmn: { en: 'Mandarin', zh: '普通話', jp: 'pou2 tung1 waa2' },
  accountTtsTl: { en: 'Tagalog', zh: '他加祿語', jp: 'taa1 gaa1 luk6 jyu5' },
  accountTtsEs: { en: 'Spanish(MX)', zh: '西班牙語（MX）', jp: 'sai1 baan1 ngaa4 jyu5 (MX)' },
  accountTtsVi: { en: 'Vietnamese', zh: '越南話', jp: 'jyut6 naam4 waa2' },
  accountTtsWuu: { en: 'Shanghainese', zh: '上海話', jp: 'soeng6 hoi2 waa2' },
  accountTtsSichuan: { en: 'Sichuanese', zh: '四川話', jp: 'sei3 cyun1 waa2' },
  accountTtsPreview: { en: 'Preview', zh: '試聽', jp: 'si3 teng1' },
  accountTtsVoiceSettings: { en: 'Voice settings', zh: '語音設定', jp: 'jyu5 jam1 cit3 ding6' },
  accountTtsVoiceModalTitle: { en: 'Voice settings', zh: '語音設定', jp: 'jyu5 jam1 cit3 ding6' },
  accountTtsVoiceModalClose: { en: 'Close', zh: '關閉', jp: 'gwaan1 bai3' },
  bugReportTitle: { en: 'Report a problem', zh: '回報問題', jp: 'wui4 bou3 man6 tai4' },
  bugReportHint: {
    en: 'What went wrong? We attach route and settings — not your translations.',
    zh: '邊方面出問題？我們會附上路由同設定，唔會包含翻譯內容。',
    jp: 'bin1 fong1 min6 ceot1 man6 tai4？',
  },
  bugReportAddNote: { en: 'Add a note (optional)', zh: '補充說明（可選）', jp: 'bou2 cung1 syut6 ming4' },
  bugReportNotePlaceholder: {
    en: 'Add a note (optional)',
    zh: '補充說明（可選）',
    jp: 'bou2 cung1 syut6 ming4',
  },
  bugReportAllowScreenshot: {
    en: 'Allow send screenshot',
    zh: '允許附上截圖',
    jp: 'jeung5 heoi2 fu6 soeng5 zit3 tou4',
  },
  bugReportSend: { en: 'Send report', zh: '送出回報', jp: 'seon3 ceot1 wui4 bou3' },
  bugReportSending: { en: 'Sending…', zh: '送出中…', jp: 'seon3 ceot1 zung1…' },
  bugReportThanks: { en: 'Thanks — we got it', zh: '多謝，已收到', jp: 'do1 ze6，ji5 sau1 dou3' },
  bugReportThanksHint: {
    en: "We'll follow up if we need more detail.",
    zh: '如需更多資料會再聯絡你。',
    jp: 'jyu4 seoi1 geng3 do1 coi3 liu4 wui5 zoi3 lyun4 lok3 nei5。',
  },
  bugReportDone: { en: 'Done', zh: '完成', jp: 'jyun4 sing4' },
  bugReportPickType: { en: 'Pick what went wrong', zh: '請選問題類型', jp: 'cing2 syun2 man6 tai4 leoi6 jing4' },
  bugReportSignInRequired: {
    en: 'Sign in to send a report',
    zh: '請登入後才可回報',
    jp: 'cing2 dang1 jap6 hau6 coi2 ho2 ji5 wui4 bou3',
  },
  bugReportLink: { en: 'Report a bug', zh: '回報問題', jp: 'wui4 bou3 man6 tai4' },
  addToHomeScreen: {
    en: 'Add to Home Screen',
    zh: '加到主畫面',
    jp: 'gaa1 dou3 zyu2 waa2 min6',
  },
  iosHomescreenTipTitle: {
    en: 'Add JyutTranslate to your Home Screen',
    zh: '將 JyutTranslate 加到主畫面',
    jp: 'zoeng1 JyutTranslate gaa1 dou3 zyu2 waa2 min6',
  },
  iosHomescreenTipBody: {
    en: 'Install JyutTranslate to your Home Screen — Open like any other app!',
    zh: '將 JyutTranslate 裝到主畫面——好似其他應用咁開！',
    jp: 'zoeng1 JyutTranslate zong1 dou3 zyu2 waa2 min6 — hou2 ci5 kei4 taa1 jing3 jung6 gam2 hoi1!',
  },
  iosHomescreenShowSteps: {
    en: 'How',
    zh: '點樣',
    jp: 'dim2 joeng2',
  },
  iosHomescreenGotIt: {
    en: 'Got it',
    zh: '知道喇',
    jp: 'zi1 dou3 laa3',
  },
  iosHomescreenDismiss: {
    en: 'Dismiss Home Screen tip',
    zh: '關閉主畫面提示',
    jp: 'gwaan1 bai3 zyu2 waa2 min6 tai4 si6',
  },
  iosHomescreenStep1: {
    en: 'Open the translator (not the homepage), then tap Share in Safari (box with an arrow up).',
    zh: '先打開翻譯器（唔好喺主頁），再喺 Safari 撳「分享」（方框向上箭嘴）。',
    jp: 'sin1 daa2 hoi1 faan1 jik6 hei3 (m4 hou2 hai2 zyu2 jip6), zoi3 hai2 Safari gam2 “fan1 hoeng2” (fong1 kwaang1 hoeng3 soeng6 zin3 zeoi2).',
  },
  iosHomescreenStep2: {
    en: 'Select Add to Home Screen.',
    zh: '揀「加到主畫面」。',
    jp: 'gaan2 “gaa1 dou3 zyu2 waa2 min6”.',
  },
  iosHomescreenSheetHint: {
    en: 'Look for this row in the share sheet',
    zh: '喺分享清單搵呢一行',
    jp: 'hai2 fan1 hoeng2 cing1 daan1 wan2 ni1 jat1 hong4',
  },
  iosHomescreenStep3: {
    en: 'Confirm Add — JyutTranslate appears on your Home Screen with this icon.',
    zh: '確認「加入」——JyutTranslate 會用呢個圖示出現喺主畫面。',
    jp: 'kok3 jing6 “gaa1 jap6” — JyutTranslate wui5 jung6 ni1 go3 tou4 si6 ceot1 jin6 hai2 zyu2 waa2 min6.',
  },
  iosHomescreenGuideTitle: {
    en: 'Install on iPhone',
    zh: '裝到 iPhone',
    jp: 'zong1 dou3 iPhone',
  },
  charsLeft: (formatted: string): Bi => ({
    en: `${formatted} chars left`,
    zh: `剩 ${formatted} 字`,
    jp: `sing6 ${formatted} zi6`,
    es: `${formatted} caracteres restantes`,
    tl: `${formatted} chars ang natitira`,
    vi: `còn ${formatted} ký tự`,
    wuu: `剩 ${formatted} 字`,
  }),
  charsUsedUnlimited: (formatted: string): Bi => ({
    en: `${formatted} used / unlimited`,
    zh: `已用 ${formatted}／無限`,
    jp: `ji5 jung6 ${formatted} / mou4 haan6`,
    es: `${formatted} usados / ilimitado`,
    tl: `${formatted} nagamit / walang limit`,
    vi: `đã dùng ${formatted} / không giới hạn`,
    wuu: `已用 ${formatted}／无限`,
  }),
  hoursLeft: (n: number): Bi => ({
    en: `${n}h left`,
    zh: `剩 ${n} 小時`,
    jp: `sing6 ${n} siu2 si4`,
    es: `${n}h restantes`,
    tl: `${n}h natitira`,
    vi: `còn ${n} giờ`,
    wuu: `剩 ${n} 小时`,
  }),
  minsLeft: (n: number): Bi => ({
    en: `${n}m left`,
    zh: `剩 ${n} 分鐘`,
    jp: `sing6 ${n} fan1 zung1`,
    es: `${n}m restantes`,
    tl: `${n}m natitira`,
    vi: `còn ${n} phút`,
    wuu: `剩 ${n} 分钟`,
  }),
  secsLeft: (n: number): Bi => ({
    en: `${n}s left`,
    zh: `剩 ${n} 秒`,
    jp: `sing6 ${n} miu5`,
    es: `${n}s restantes`,
    tl: `${n}s natitira`,
    vi: `còn ${n} giây`,
    wuu: `剩 ${n} 秒`,
  }),
  /** Compact live mic: used + remaining, e.g. "3m used · 17m left". */
  liveUsedRemaining: (used: string, left: string): Bi => ({
    en: `${used} used · ${left} left`,
    zh: `已用 ${used} · 剩 ${left}`,
    jp: `ji5 jung6 ${used} · sing6 ${left}`,
    es: `${used} usados · ${left} restantes`,
    tl: `${used} nagamit · ${left} natitira`,
    vi: `đã dùng ${used} · còn ${left}`,
    wuu: `已用 ${used} · 剩 ${left}`,
  }),

  lightTheme: { en: 'Light', zh: '淺色', jp: 'cin2 sik1' },
  darkTheme: { en: 'Dark', zh: '深色', jp: 'sam1 sik1' },

  navFeatures: { en: 'Features', zh: '功能', jp: 'gung1 nang4' },
  navTones: { en: 'Tones', zh: '聲調', jp: 'sing1 diu6' },
  navCreators: { en: 'Creators', zh: '創作者', jp: 'cong3 zok3 ze2' },
  navPricing: { en: 'Pricing', zh: '價錢', jp: 'gaa3 cin4' },
  navLaunch: { en: 'Launch app', zh: '開啟應用', jp: 'hoi1 kai2 jing3 jung6' },

  tonesKicker: { en: 'Cantonese tones', zh: '粵語聲調', jp: 'jyut6 jyu5 sing1 diu6' },
  tonesHeroTitle: {
    en: 'Refresher on the 6 tones',
    zh: '六個粵語聲調',
    jp: 'luk6 go3 jyut6 jyu5 sing1 diu6',
  },
  tonesHeroSub: {
    en: 'Same word. Different tone.',
    zh: '同一個音，唔同聲調。',
    jp: 'tung4 jat1 go3 jam1, m4 tung4 sing1 diu6.',
  },
  tonesTap: { en: 'Tap a box to hear it', zh: '撳盒仔聽聲', jp: 'gam2 hap6 zai2 teng1 sing1' },
  modesTonesChip: {
    en: '6 tones →',
    zh: '六個聲調 →',
    jp: 'luk6 go3 sing1 diu6 →',
  },
  tonesTwinsTitle: {
    en: 'The importance of using the right tone',
    zh: '差一個聲調，意思完全唔同。',
    jp: 'caa1 jat1 go3 sing1 diu6, ji3 si1 jyun4 cyun4 m4 tung4.',
  },
  tonesBuy: { en: 'buy', zh: '買', jp: 'maai5' },
  tonesSell: { en: 'sell', zh: '賣', jp: 'maai6' },
  tonesStoryHint: {
    en: 'Swipe or tap the arrows',
    zh: '左右滑動或撳箭咀',
    jp: 'jau6 zo2 waat6 dung6 waak6 gam2 zin3 jin3 zeoi2',
  },
  tonesStoryPrev: { en: 'Previous tone story', zh: '上一個聲調故事', jp: 'soeng6 jat1 go3 sing1 diu6 gu3 si6' },
  tonesStoryNext: { en: 'Next tone story', zh: '下一個聲調故事', jp: 'haa6 jat1 go3 sing1 diu6 gu3 si6' },
  tonesStoryBuyHead: { en: 'BUY', zh: '買', jp: 'maai5' },
  tonesStorySellHead: { en: 'SELL', zh: '賣', jp: 'maai6' },
  tonesStoryBuyScene: {
    en: 'You walk up to the stall…',
    zh: '你行近個檔口……',
    jp: 'nei5 haang4 gan6 go3 dong2 hau2…',
  },
  tonesStorySellScene: {
    en: "Now you're on the other side…",
    zh: '而家換你喺檔口嗰邊……',
    jp: 'ji4 gaa1 wun6 nei5 hai2 dong2 hau2 go2 bin1…',
  },
  tonesStoryBuyLine: {
    en: 'Tone 5 climbs — soft rise on 買',
    zh: '第五聲向上——買字輕輕升',
    jp: 'dai6 ng5 sing1 hoeng3 soeng6 — maai5 zi6 hing1 hing1 sing1',
  },
  tonesStorySellLine: {
    en: 'Tone 6 stays low — flat 賣',
    zh: '第六聲低平——賣字沉底',
    jp: 'dai6 luk6 sing1 dai1 ping4 — maai6 zi6 cam4 dai2',
  },
  tonesCtaTitle: {
    en: 'Hear tones while you speak',
    zh: '一邊講一邊聽到聲調',
    jp: 'jat1 bin1 gong2 jat1 bin1 teng1 dou2 sing1 diu6',
  },
  tonesCtaBody: {
    en: 'JyutTranslate draws Jyutping under every Cantonese line.',
    zh: 'JyutTranslate 會喺每句粵語下面畫出粵拼。',
    jp: 'JyutTranslate wui5 hai2 mui5 geoi3 jyut6 jyu5 haa6 min6 waak6 ceot1 jyut6 ping3.',
  },
  tonesOpenApp: { en: 'Open translator', zh: '開啟翻譯器', jp: 'hoi1 kai2 faan1 jik6 hei3' },

  // —— Creator kit (#/creators) ——
  creatorsKicker: { en: 'For creators', zh: '專為創作者', jp: 'zyun1 wai6 cong3 zok3 ze2' },
  creatorsHeroTitle: {
    en: 'Jyutping + Chao tone letters, ready to paste',
    zh: '粵拼＋趙元任調號，一鍵複製',
    jp: 'jyut6 ping3 + ziu6 jyun4 jam4 diu6 hou6, jat1 gin6 fuk6 zai3',
  },
  creatorsHeroSub: {
    en: 'Download the fonts that show Cantonese and Jyutping + Chao tone letters correctly — then copy pronunciation from JyutTranslate into CapCut, Instagram, and your editor.',
    zh: '下載正確顯示粵語同粵拼＋趙元任調號嘅字體——再喺 JyutTranslate 複製讀音，貼去 CapCut、Instagram 同你嘅剪輯軟件。',
    jp: 'haa6 zoi3 zing3 kok3 hin2 si6 jyut6 jyu5 tung4 ziu6 jyun4 jam4 diu6 hou6 ge3 zi6 tai2 — zoi3 hai2 JyutTranslate fuk6 zai3 duk6 jam1, tip3 heoi3 CapCut, Instagram tung4 nei5 ge3 zin2 cap6 jyun4 gin6.',
  },
  creatorsTocLabel: { en: 'On this page', zh: '本頁內容', jp: 'bun2 jip6 noi6 jung4' },
  creatorsTocFonts: { en: 'Fonts', zh: '字體', jp: 'zi6 tai2' },
  creatorsTocCopy: { en: 'Copy button', zh: '複製按鈕', jp: 'fuk6 zai3 on3 nau2' },
  creatorsTocEditors: { en: 'Editors', zh: '剪輯軟件', jp: 'zin2 cap6 jyun4 gin6' },

  creatorsFontsTitle: {
    en: 'Download Noto Sans HK + Noto Sans',
    zh: '下載 Noto Sans HK 同 Noto Sans',
    jp: 'haa6 zoi3 Noto Sans HK tung4 Noto Sans',
  },
  creatorsFontsLead: {
    en: 'Use both. HK covers Hong Kong Chinese characters; Noto Sans carries Latin letters and Jyutping + Chao tone letters (˥ ˧˥ ˧ ˨˩ ˩˧ ˨).',
    zh: '兩款都要用。HK 負責香港漢字；Noto Sans 負責拉丁字母同粵拼＋趙元任調號（˥ ˧˥ ˧ ˨˩ ˩˧ ˨）。',
    jp: 'loeng5 fun2 dou1 jiu3 jung6. HK fu6 zaak3 hoeng1 gong2 hon3 zi6; Noto Sans fu6 zaak3 laai1 ding1 zi6 mou5 tung4 ziu6 jyun4 jam4 diu6 hou6.',
  },
  creatorsFontHkTitle: { en: 'Noto Sans HK', zh: 'Noto Sans HK', jp: 'Noto Sans HK' },
  creatorsFontHkHint: {
    en: 'For Chinese characters only (HK glyph set). Pair with Noto Sans for Jyutping + Chao tone letters.',
    zh: '只用於漢字（香港字形）。粵拼＋趙元任調號請配 Noto Sans。',
    jp: 'zi2 jung6 jyu1 hon3 zi6 (hoeng1 gong2 zi6 jing4). jyut6 ping3 + diu6 hou6 cing2 pui3 Noto Sans.',
  },
  creatorsFontSansTitle: { en: 'Noto Sans', zh: 'Noto Sans', jp: 'Noto Sans' },
  creatorsFontSansHint: {
    en: 'Required for Jyutping + Chao tone letters to display correctly (˥ ˧˥ ˧ ˨˩ ˩˧ ˨). Also covers English / Jyutping Latin.',
    zh: '要正確顯示粵拼＋趙元任調號（˥ ˧˥ ˧ ˨˩ ˩˧ ˨）必須用呢款。亦覆蓋英文／粵拼拉丁字母。',
    jp: 'jiu3 zing3 kok3 hin2 si6 ziu6 jyun4 jam4 diu6 hou6 bit1 seoi1 jung6 ni1 fun2. jik6 fu6 goi3 jing1 man4 / jyut6 ping3 laai1 ding1 zi6 mou5.',
  },
  creatorsDownloadHk: { en: 'Download Noto Sans HK', zh: '下載 Noto Sans HK', jp: 'haa6 zoi3 Noto Sans HK' },
  creatorsDownloadSans: { en: 'Download Noto Sans', zh: '下載 Noto Sans', jp: 'haa6 zoi3 Noto Sans' },
  creatorsFontSpecimen: { en: 'View on Google Fonts', zh: '喺 Google Fonts 睇', jp: 'hai2 Google Fonts tai2' },
  creatorsPairTitle: {
    en: 'Why you need both fonts',
    zh: '點解要兩款字體',
    jp: 'dim2 gaai2 jiu3 loeng5 fun2 zi6 tai2',
  },
  creatorsPairBody: {
    en: 'Noto Sans HK does not include Chao tone letters (˥ ˨˩). If captions only use HK, ˥ ˨˩ often fall back to tofu boxes or the wrong face. Install Noto Sans for romanization + tones, and Noto Sans HK for 漢字.',
    zh: 'Noto Sans HK 唔包趙元任調號（˥ ˨˩）。字幕淨用 HK 時，˥ ˨˩ 好多時會變方格或者跳錯字體。粵拼＋趙元任調號用 Noto Sans，漢字用 Noto Sans HK。',
    jp: 'Noto Sans HK m4 baau1 ziu6 jyun4 jam4 diu6 hou6. zi6 mok6 zing6 jung6 HK si4, ˥ ˨˩ hou2 do1 si4 wui5 bin3 fong1 gaak3 waak6 ze2 tiu3 co3 zi6 tai2.',
  },
  creatorsPreviewLabel: { en: 'Preview (paste target)', zh: '預覽（貼上目標）', jp: 'jyu6 laam5 (tip3 soeng5 muk6 biu1)' },
  creatorsFontLicense: {
    en: 'Fonts are SIL Open Font License via Google Fonts — free to use in videos and posts.',
    zh: '字體經 Google Fonts 以 SIL Open Font License 發佈——影片同帖文都可免費使用。',
    jp: 'zi6 tai2 ging1 Google Fonts ji5 SIL Open Font License faat3 bou3 — jing2 pin2 tung4 tip3 man4 dou1 ho2 min5 fai3 si2 jung6.',
  },

  creatorsCopyTitle: {
    en: 'How to use the Copy Jyutping + Chao tone letters button',
    zh: '點樣用「複製粵拼＋趙元任調號」掣',
    jp: 'dim2 joeng2 jung6 “fuk6 zai3 jyut6 ping3 + diu6 hou6” zai3',
  },
  creatorsCopyLead: {
    en: 'Family and Business unlock one-tap copy of Jyutping + Chao tone letters — perfect for Reels captions and lesson overlays.',
    zh: '家庭版同商業版開通一鍵複製粵拼＋趙元任調號——好啱 Reels 字幕同課堂疊字。',
    jp: 'gaa1 ting4 baan2 tung4 soeng1 jip6 baan2 hoi1 tung1 jat1 gin6 fuk6 zai3 jyut6 ping3 + ziu6 jyun4 jam4 diu6 hou6 — hou2 ngaam1 Reels zi6 mok6 tung4 fo3 tong4 dip6 zi6.',
  },
  creatorsCopyStep1Title: { en: 'Open the translator', zh: '開啟翻譯器', jp: 'hoi1 kai2 faan1 jik6 hei3' },
  creatorsCopyStep1Body: {
    en: 'Go to Solo (or Conversation). Translate or type a Cantonese line so Han characters appear in the result.',
    zh: '去 Solo（或者對話模式）。翻譯或輸入一句粵語，結果出現漢字。',
    jp: 'heoi3 Solo (waak6 ze2 deoi3 waa6 mou4 sik1). faan1 jik6 waak6 syu1 jap6 jat1 geoi3 jyut6 jyu5, git3 gwo2 ceot1 jin6 hon3 zi6.',
  },
  creatorsCopyStep2Title: { en: 'Open Details', zh: '打開詳情', jp: 'daa2 hoi1 coeng4 cing4' },
  creatorsCopyStep2Body: {
    en: 'Tap the Cantonese result to open Details — Jyutping under each line, Chao tone letters in the breakdown.',
    zh: '撳粵語結果打開詳情——每句下面有粵拼，拆解入面有趙元任調號。',
    jp: 'gam2 jyut6 jyu5 git3 gwo2 daa2 hoi1 coeng4 cing4 — mui5 geoi3 haa6 min6 jau5 jyut6 ping3, caak3 gaai2 jap6 min6 jau5 ziu6 jyun4 jam4 diu6 hou6.',
  },
  creatorsCopyStep3Title: {
    en: 'Tap Copy Jyutping + Chao tone letters',
    zh: '撳「複製粵拼＋趙元任調號」',
    jp: 'gam2 “fuk6 zai3 jyut6 ping3 + diu6 hou6”',
  },
  creatorsCopyStep3Body: {
    en: 'Look for the Jyutping copy control (different icon from plain Han copy). On Free, it opens Family upgrade.',
    zh: '搵粵拼複製掣（圖示同普通漢字複製唔同）。免費版會打開家庭版升級。',
    jp: 'wan2 jyut6 ping3 fuk6 zai3 zai3 (tou4 si6 tung4 pou2 tung1 hon3 zi6 fuk6 zai3 m4 tung4). min5 fai3 baan2 wui5 daa2 hoi1 gaa1 ting4 baan2 sing1 kap1.',
  },
  creatorsCopyStep4Title: { en: 'Paste into your editor', zh: '貼去剪輯軟件', jp: 'tip3 heoi3 zin2 cap6 jyun4 gin6' },
  creatorsCopyStep4Body: {
    en: 'Paste into CapCut / Canva text, or a Notes doc first. You should see syllables like teng1˥ (Jyutping + Chao tone letters) — not missing boxes.',
    zh: '貼去 CapCut／Canva 文字，或者先貼去備忘錄。應該見到 teng1˥ 呢類粵拼＋趙元任調號——唔好係方格。',
    jp: 'tip3 heoi3 CapCut / Canva man4 zi6, waak6 ze2 sin1 tip3 heoi3 bei6 mong4 luk6. jing1 goi1 gin3 dou2 teng1˥ ni1 leoi6 jam1 zit3 tung4 diu6 hou6 — m4 hou2 hai6 fong1 gaak3.',
  },
  creatorsCopyStep5Title: {
    en: 'Set the text font to Noto Sans',
    zh: '將字幕字體設成 Noto Sans',
    jp: 'zoeng1 zi6 mok6 zi6 tai2 cit3 sing4 Noto Sans',
  },
  creatorsCopyStep5Body: {
    en: 'Apply Noto Sans (and Noto Sans HK for 漢字 if your tool supports dual fonts). Export, then post.',
    zh: '套用 Noto Sans（若軟件支援雙字體，漢字用 Noto Sans HK）。輸出再發佈。',
    jp: 'tou3 jung6 Noto Sans (joek6 jyun4 gin6 zi1 wun6 soeng1 zi6 tai2, hon3 zi6 jung6 Noto Sans HK). syu1 ceot1 zoi3 faat3 bou3.',
  },
  creatorsDemoLabel: {
    en: 'Try it here (Family / Business)',
    zh: '喺呢度試（家庭版／商業版）',
    jp: 'hai2 ni1 dou6 si3 (gaa1 ting4 baan2 / soeng1 jip6 baan2)',
  },
  creatorsDemoHint: {
    en: 'Free plans open the Family upgrade sheet instead of copying.',
    zh: '免費版會打開家庭版升級，而唔係直接複製。',
    jp: 'min5 fai3 baan2 wui5 daa2 hoi1 gaa1 ting4 baan2 sing1 kap1, ji4 m4 hai6 zik6 zip3 fuk6 zai3.',
  },
  creatorsSeeFamily: { en: 'See Family plans', zh: '睇家庭版方案', jp: 'tai2 gaa1 ting4 baan2 fong1 on3' },

  creatorsEditorsTitle: {
    en: 'Load custom fonts in your editor',
    zh: '喺剪輯軟件加入自訂字體',
    jp: 'hai2 zin2 cap6 jyun4 gin6 gaa1 jap6 zi6 ding6 zi6 tai2',
  },
  creatorsEditorsLead: {
    en: 'Import Noto Sans (and Noto Sans HK for 漢字) in Instagram Reels, CapCut, Canva, or your NLE — Jyutping + Chao tone letters needs Noto Sans.',
    zh: '喺 Instagram Reels、CapCut、Canva 或你嘅剪輯軟件匯入 Noto Sans（漢字另加 Noto Sans HK）——粵拼＋趙元任調號需要 Noto Sans。',
    jp: 'hai2 Instagram Reels, CapCut, Canva waak6 nei5 ge3 zin2 cap6 jyun4 gin6 wui6 jap6 Noto Sans (hon3 zi6 ling6 gaa1 Noto Sans HK) — ziu6 jyun4 jam1 diu6 hou6 jiu3 Noto Sans.',
  },
  creatorsCapcutTitle: { en: 'CapCut', zh: 'CapCut', jp: 'CapCut' },
  creatorsCapcut1: {
    en: 'Download Noto Sans + Noto Sans HK zips above; unzip on your phone or computer.',
    zh: '喺上面下載 Noto Sans 同 Noto Sans HK 壓縮包；喺手機或電腦解壓。',
    jp: 'hai2 soeng6 min6 haa6 zoi3 Noto Sans tung4 Noto Sans HK aat3 cuk1 baau1; hai2 sau2 gei1 waak6 din6 nou5 gaai2 aat3.',
  },
  creatorsCapcut2: {
    en: 'In CapCut, add Text → open the Font menu → Import / Brand / Default fonts (label varies by version).',
    zh: '喺 CapCut 加文字 → 打開字體選單 → 匯入／品牌／預設字體（名稱視版本而定）。',
    jp: 'hai2 CapCut gaa1 man4 zi6 → daa2 hoi1 zi6 tai2 syun2 daan1 → wui6 jap6 / pang4 paai4 / jyu6 cit3 zi6 tai2.',
  },
  creatorsCapcut3: {
    en: 'Import the .ttf / .otf files for Noto Sans (and Noto Sans HK for Han).',
    zh: '匯入 Noto Sans 嘅 .ttf／.otf（漢字另加 Noto Sans HK）。',
    jp: 'wui6 jap6 Noto Sans ge3 .ttf / .otf (hon3 zi6 ling6 gaa1 Noto Sans HK).',
  },
  creatorsCapcut4: {
    en: 'Paste your Jyutping + Chao tone letters string; set that text layer to Noto Sans.',
    zh: '貼上粵拼＋趙元任調號；將呢層文字設為 Noto Sans。',
    jp: 'tip3 soeng5 jyut6 ping3 + diu6 hou6; zoeng1 ni1 cang4 man4 zi6 cit3 wai4 Noto Sans.',
  },
  creatorsCapcut5: {
    en: 'Export the video, then Share to Instagram Reels / TikTok / Shorts.',
    zh: '匯出影片，再分享去 Instagram Reels／TikTok／Shorts。',
    jp: 'wui6 ceot1 jing2 pin2, zoi3 fan1 hoeng2 heoi3 Instagram Reels / TikTok / Shorts.',
  },
  creatorsIgTitle: { en: 'Instagram (Reels / Stories)', zh: 'Instagram（Reels／限時動態）', jp: 'Instagram (Reels / haan6 si4 dung6 taai3)' },
  creatorsIgNote: {
    en: 'Reels can import custom fonts — use Noto Sans so Jyutping + Chao tone letters (˥ ˨˩ …) renders correctly.',
    zh: 'Reels 可以匯入自訂字體——用 Noto Sans 先正確顯示粵拼＋趙元任調號（˥ ˨˩ …）。',
    jp: 'Reels ho2 ji5 wui6 jap6 zi6 ding6 zi6 tai2 — jung6 Noto Sans sin1 zing3 kok3 hin2 si6 ziu6 jyun4 jam1 diu6 hou6.',
  },
  creatorsIg1: {
    en: 'Save the Noto Sans (+ Noto Sans HK) files to your phone, then open Reels → Text (Aa).',
    zh: '將 Noto Sans（同 Noto Sans HK）存入手機，再開 Reels → 文字（Aa）。',
    jp: 'zoeng1 Noto Sans (tung4 Noto Sans HK) cyun4 jap6 sau2 gei1, zoi3 hoi1 Reels → man4 zi6 (Aa).',
  },
  creatorsIg2: {
    en: 'In the font picker, choose Add / Custom / Import (label varies), then pick the Noto Sans .ttf / .otf.',
    zh: '喺字體選擇器揀「新增／自訂／匯入」（名稱視版本），再揀 Noto Sans 嘅 .ttf／.otf。',
    jp: 'hai2 zi6 tai2 syun2 zaak6 hei3 gaan2 “san1 zang1 / zi6 ding6 / wui6 jap6”, zoi3 gaan2 Noto Sans ge3 .ttf / .otf.',
  },
  creatorsIg3: {
    en: 'Paste your Jyutping + Chao tone letters string onto the text layer set to Noto Sans. For 漢字, add a second layer with Noto Sans HK if needed.',
    zh: '將粵拼＋趙元任調號貼上已設 Noto Sans 嘅文字層。漢字如需，另加一層用 Noto Sans HK。',
    jp: 'zoeng1 jyut6 ping3 + diu6 hou6 tip3 soeng5 ji5 cit3 Noto Sans ge3 man4 zi6 cang4. hon3 zi6 jyu4 seoi1, ling6 gaa1 jat1 cang4 jung6 Noto Sans HK.',
  },
  creatorsCanvaTitle: { en: 'Canva', zh: 'Canva', jp: 'Canva' },
  creatorsCanva1: {
    en: 'Canva Pro: Brand Kit → Upload fonts → add Noto Sans (+ HK for Han if needed).',
    zh: 'Canva Pro：品牌套件 → 上載字體 → 加入 Noto Sans（漢字需要時再加 HK）。',
    jp: 'Canva Pro: pang4 paai4 tou3 gin6 → soeng5 zoi3 zi6 tai2 → gaa1 jap6 Noto Sans.',
  },
  creatorsCanva2: {
    en: 'Free Canva: design on desktop with system-installed Noto, or export text as SVG/PNG from another tool.',
    zh: '免費 Canva：喺已安裝 Noto 嘅電腦設計，或用其他工具將文字匯出成 SVG／PNG。',
    jp: 'min5 fai3 Canva: hai2 ji5 on1 cong3 Noto ge3 din6 nou5 cit3 gai3, waak6 jung6 kei4 taa1 gung1 geoi6 zoeng1 man4 zi6 wui6 ceot1 sing4 SVG / PNG.',
  },
  creatorsCanva3: {
    en: 'Paste Jyutping + Chao tone letters, set font to Noto Sans, download MP4 / PNG for Instagram.',
    zh: '貼上粵拼＋趙元任調號，字體選 Noto Sans，下載 MP4／PNG 再發 Instagram。',
    jp: 'tip3 soeng5 jyut6 ping3 + diu6 hou6, zi6 tai2 syun2 Noto Sans, haa6 zoi3 MP4 / PNG zoi3 faat3 Instagram.',
  },
  creatorsDesktopTitle: {
    en: 'Premiere, Final Cut, DaVinci Resolve',
    zh: 'Premiere、Final Cut、DaVinci Resolve',
    jp: 'Premiere, Final Cut, DaVinci Resolve',
  },
  creatorsDesktop1: {
    en: 'Install both font families at the OS level (Font Book on Mac; Settings → Fonts on Windows).',
    zh: '喺系統安裝兩款字體（Mac 用字體冊；Windows 用設定 → 字型）。',
    jp: 'hai2 hai6 tung2 on1 cong3 loeng5 fun2 zi6 tai2 (Mac jung6 zi6 tai2 caak3; Windows jung6 cit3 ding6 → zi6 jing4).',
  },
  creatorsDesktop2: {
    en: 'Restart the NLE if fonts do not appear, then set title / caption layers to Noto Sans.',
    zh: '若字體未出現請重開剪輯軟件，再將字幕層設為 Noto Sans。',
    jp: 'joek6 zi6 tai2 mei6 ceot1 jin6 cing2 cung4 hoi1 zin2 cap6 jyun4 gin6, zoi3 zoeng1 zi6 mok6 cang4 cit3 wai4 Noto Sans.',
  },
  creatorsDesktop3: {
    en: 'For 漢字 + Chao in one graphic, use two text layers (HK + Sans) or a tool that supports font fallback stacks.',
    zh: '同一畫面要漢字＋調號，可用兩層文字（HK + Sans），或支援字體後備堆疊嘅工具。',
    jp: 'tung4 jat1 waa2 min6 jiu3 hon3 zi6 + diu6 hou6, ho2 jung6 loeng5 cang4 man4 zi6 (HK + Sans), waak6 zi1 wun6 zi6 tai2 hau6 bei6 deoi1 dip6 ge3 gung1 geoi6.',
  },
  creatorsOtherTitle: { en: 'VN, InShot, and others', zh: 'VN、InShot 及其他', jp: 'VN, InShot tung4 kei4 taa1' },
  creatorsOtherBody: {
    en: 'Look for Import font / Add font in the text panel. Prefer editors that accept .ttf/.otf from Files. If tone contour marks still box, the active face is not Noto Sans — switch fonts and re-paste.',
    zh: '喺文字面板搵「匯入字體／新增字體」。優先用可從檔案讀 .ttf／.otf 嘅軟件。若調號仲係方格，代表而家唔係 Noto Sans——換字體再貼一次。',
    jp: 'hai2 man4 zi6 min6 baan2 wan2 “wui6 jap6 zi6 tai2 / san1 zang1 zi6 tai2”. jau4 sin1 jung6 ho2 cung4 dong2 on3 duk6 .ttf / .otf ge3 jyun4 gin6.',
  },

  creatorsCtaTitle: {
    en: 'Copy tones. Ship clearer Cantonese.',
    zh: '複製調號，做出更清楚嘅粵語內容。',
    jp: 'fuk6 zai3 diu6 hou6, zou6 ceot1 gang3 cing1 co2 ge3 jyut6 jyu5 noi6 jung4.',
  },
  creatorsCtaBody: {
    en: 'Open JyutTranslate, translate a line, and try Copy Jyutping + Chao tone letters on Family.',
    zh: '打開 JyutTranslate，翻譯一句，用家庭版試「複製粵拼＋趙元任調號」。',
    jp: 'daa2 hoi1 JyutTranslate, faan1 jik6 jat1 geoi3, jung6 gaa1 ting4 baan2 si3 “fuk6 zai3 jyut6 ping3 + diu6 hou6”.',
  },
  creatorsCtaButton: { en: 'Open translator', zh: '開啟翻譯器', jp: 'hoi1 kai2 faan1 jik6 hei3' },

  footerCreators: { en: 'Creators', zh: '創作者', jp: 'cong3 zok3 ze2' },

  heroEyebrow: {
    en: 'Cantonese Language Tool',
    zh: '粵語翻譯器',
    jp: 'jyut6 jyu5 faan1 jik6 hei3',
  },
  /** English-line teaser tip on the hero eyebrow. */
  heroMultilangTipTrigger: {
    en: 'Multi-Language support coming soon',
    zh: '多語言支援即將推出',
    jp: 'do1 jyu5 jin4 zi1 wun6 zak1 zoeng1 teoi1 ceot1',
  },
  heroMultilangTipTitle: {
    en: 'Multi-Language Support',
    zh: '多語言支援',
    jp: 'do1 jyu5 jin4 zi1 wun6',
  },
  heroMultilangTipLead: {
    en: 'Here are our currently supported languages.',
    zh: '以下係我哋而家支援嘅語言。',
    jp: 'ji5 haa6 hai6 ngo5 dei6 ji4 gaa1 zi1 wun6 ge3 jyu5 jin4.',
  },
  /** Static label beside the lizard word-spin (uiverse kennyotsu/fresh-lizard-20). */
  heroMultilangTipLoading: {
    en: 'Supported',
    zh: '支援',
    jp: 'zi1 wun6',
  },
  heroMultilangTipAsk: {
    en: 'Do you have any suggestions?',
    zh: '有冇想建議嘅語言？',
    jp: 'jau5 mou5 soeng2 gin3 ji5 ge3 jyu5 jin4?',
  },
  heroMultilangTipMail: {
    en: 'help@jyuttranslate.com',
    zh: 'help@jyuttranslate.com',
    jp: 'help@jyuttranslate.com',
  },
  heroTitle: {
    en: 'JyutTranslate',
    zh: '粵語翻譯器',
    jp: 'jyut6 jyu5 faan1 jik6 hei3',
  },
  heroSub: {
    en: 'Live Cantonese translation with Jyutping — Use Conversation mode to help you bridge the communication!',
    zh: '即時英粵翻譯連粵拼——用對話模式幫你打通溝通橋梁！',
    jp: 'zik1 si4 jing1 jyut6 faan1 jik6 lin4 jyut6 ping3 — jung6 deoi3 waa6 mou4 sik1 bong1 nei5 daa2 tung1 kau3 tung1 kiu4 loeng4!',
  },
  launchTranslator: { en: 'Launch translator', zh: '開啟翻譯器', jp: 'hoi1 kai2 faan1 jik6 hei3' },
  tryDemo: { en: 'Try the demo ↓', zh: '試用示範 ↓', jp: 'si3 jung6 si6 faan6 ↓' },
  statDeepseek: {
    en: 'Powered by DeepSeek AI',
    zh: '由 DeepSeek AI 驅動',
    jp: 'jau4 DeepSeek AI keoi1 dung6',
  },
  statModes: { en: 'modes', zh: '種模式', jp: 'zung2 mou4 sik1' },
  statJyutping: { en: 'Jyutping on every line', zh: '每句都有粵拼', jp: 'mui5 geoi3 dou1 jau5 jyut6 ping3' },

  modesKicker: { en: '3 Modes', zh: '三種模式', jp: 'saam1 zung2 mou4 sik1' },
  modesTitle: {
    en: 'One app, 3 translation methods',
    zh: '一個應用，三種翻譯方式',
    jp: 'jat1 go3 jing3 jung6, saam1 zung2 faan1 jik6 fong1 sik1',
  },

  featJpTitle: { en: 'Jyutping built in', zh: '內建粵拼', jp: 'noi6 gin3 jyut6 ping3' },
  featJpDesc: {
    en: 'Romanization and Jyutping + Chao tone letters under every Cantonese line, so you can learn as you speak.',
    zh: '每句粵語下面都有粵拼同聲調，一邊講一邊學。',
    jp: 'mui5 geoi3 jyut6 jyu5 haa6 min6 dou1 jau5 jyut6 ping3 tung4 sing1 diu6, jat1 bin1 gong2 jat1 bin1 hok6.',
  },
  featJpAside: {
    en: "(And for my ABC's)",
    zh: '',
    jp: '',
  },
  featHkTitle: { en: 'Hong Kong Cantonese', zh: '香港粵語', jp: 'hoeng1 gong2 jyut6 jyu5' },
  featHkDesc: {
    en: 'Tuned for colloquial 粵語 (係, 唔, 喺, 咗) — not Mandarin or formal written Chinese.',
    zh: '專為口語粵語調校（係、唔、喺、咗）——唔係普通話，亦唔係書面語。',
    jp: 'zyun1 wai6 hau2 jyu5 jyut6 jyu5 tiu4 gaau3 (hai6, m4, hai2, zo2) — m4 hai6 pou2 tung1 waa2, jik6 m4 hai6 syu1 min2 jyu5.',
  },
  featFastTitle: { en: 'Character breakdown', zh: '逐字拆解', jp: 'zuk6 zi6 caak3 gaai2' },
  featFastDesc: {
    en: 'Click on results to open a detailed character breakdown. Learn how to say every word.',
    zh: '撳結果就可以打開詳細拆字，學識點講每一個字。',
    jp: 'gam2 git3 gwo2 zau6 ho2 ji5 daa2 hoi1 coeng4 sai3 caak3 zi6, hok6 sik1 dim2 gong2 mui5 jat1 go3 zi6.',
  },
  featHostTitle: { en: 'AR Camera translation', zh: 'AR 相機翻譯', jp: 'AR soeng1 gei1 faan1 jik6' },
  featJpTag: { en: 'Learn as you speak', zh: '邊講邊學', jp: 'jat1 bin1 gong2 jat1 bin1 hok6' },
  featHkTag: { en: 'Colloquial 粵語', zh: '口語粵語', jp: 'hau2 jyu5 jyut6 jyu5' },
  featHkExHai: { en: 'is / yes', zh: '係／肯定', jp: 'hai6' },
  featHkExM: { en: 'not', zh: '否定', jp: 'm4' },
  featHkExHai2: { en: 'at / in', zh: '喺度', jp: 'hai2' },
  featHkExZo: { en: 'past tense marker', zh: '完成語氣', jp: 'zo2' },
  featFastTag: { en: 'Tap any word', zh: '撳字詳解', jp: 'gam2 zi6 coeng4 gaai2' },
  featHostTag: { en: 'Live AR overlay', zh: '即時 AR 覆蓋', jp: 'zik1 si4 AR fuk1 goi3' },
  featHostDesc: {
    en: 'Hit capture and watch the translations update!',
    zh: '對準相機，睇住譯文即時更新！',
    jp: 'deoi3 zeon1 soeng1 gei1, tai2 zyu6 jik6 man4 zik1 si4 gang1 san1!',
  },

  demoKicker: { en: 'Try it now', zh: '而家試吓', jp: 'ji4 gaa1 si3 haa5' },
  demoTitle: {
    en: 'Try Solo mode, live',
    zh: '試用獨白模式，即時見',
    jp: 'si3 jung6 duk6 baak6 mou4 sik1, zik1 si4 gin3',
  },
  demoBody: {
    en: 'Type in English — the Cantonese line updates below. Tap a sample to start.',
    zh: '打英文——粵語會喺下面更新。撳樣本試吓。',
    jp: 'daa2 jing1 man2 — jyut6 jyu5 wui5 hai2 haa6 min6 gang1 san1. gam2 joeng6 bun2 si3 haa5.',
  },
  demoTypeEn: { en: 'Type English', zh: '打英文', jp: 'daa2 jing1 man2' },
  demoPlaceholder: { en: 'Say something…', zh: '講啲咩…', jp: 'gong2 di1 me1…' },
  demoLive: { en: 'Solo mode', zh: '獨白模式', jp: 'duk6 baak6 mou4 sik1' },
  demoCantonese: { en: 'Cantonese', zh: '廣東話', jp: 'gwong2 dung1 waa2' },
  demoApiError: {
    en: 'Live API not reachable from here — this runs against your deployed backend.',
    zh: '即時 API 喺度連唔到——呢個要對住你部署嘅後端先得。',
    jp: 'zik1 si4 API hai2 dou6 lin4 m4 dou3 — ni1 go3 jiu3 deoi3 zyu6 nei5 bou3 syu2 ge3 hau6 dyun1 sin1 dak1.',
  },
  demoModeBanner: {
    en: 'Demo mode: no model key loaded. Add OPENAI_API_KEY (and OPENAI_BASE_URL if needed) to apps/api/.env, then restart npm run dev:api.',
    zh: '示範模式：未載入翻譯密鑰。喺 apps/api/.env 加 OPENAI_API_KEY（同埋需要嘅 OPENAI_BASE_URL），再重啟 npm run dev:api。',
    jp: 'si6 faan6 mou4 sik1: mei6 zoi3 jap6 faan1 jik6 mat6 joek6. hai2 apps/api/.env gaa1 OPENAI_API_KEY (tung4 maai4 seoi1 jiu3 ge3 OPENAI_BASE_URL), zoi3 cung4 hei2 npm run dev:api.',
  },

  pricingKicker: { en: 'Pricing', zh: '價錢', jp: 'gaa3 cin4' },
  pricingTitle: {
    en: 'Start free. Upgrade for more talk-time.',
    zh: '免費開始。升級享更多通話時間。',
    jp: 'min5 fai3 hoi1 ci2. sing1 kap1 hoeng2 gang3 do1 tung1 waa6 si4 gaan3.',
  },
  mostPopular: { en: 'Most popular', zh: '最受歡迎', jp: 'zeoi3 sau6 fun1 jing4' },
  getStarted: { en: 'Get started', zh: '立即開始', jp: 'laap6 zik1 hoi1 ci2' },
  goFamily: { en: 'Go Family', zh: '升級家庭版', jp: 'sing1 kap1 gaa1 ting4 baan2' },
  comparePlans: { en: 'Compare all plans →', zh: '比較全部計劃 →', jp: 'bei2 gaau3 cyun4 bou6 gai3 waak6 →' },

  freeFeatLive1h: {
    en: '~1 hour of live translation / month',
    zh: '每月大約一小時即時翻譯',
    jp: 'mui5 jyut6 daai6 joek3 jat1 siu2 si4 zik1 si4 faan1 jik6',
  },
  freeFeatText: {
    en: 'Unlimited text translation',
    zh: '無限文字翻譯',
    jp: 'mou4 haan6 man4 zi6 faan1 jik6',
  },
  freeFeatModes: {
    en: 'Solo, Conversation & Camera',
    zh: '獨白、對話同相機',
    jp: 'duk6 baak6, deoi3 waa6 tung4 soeng1 gei1',
  },
  freeFeatCamera: {
    en: '120 camera scans / month',
    zh: '每月 120 次相機掃描',
    jp: 'mui5 jyut6 120 ci3 soeng1 gei1 sou3 miu4',
  },
  freeFeatTts: {
    en: 'Tap-to-play voice — free with limitations',
    zh: '撳喇叭播語音——免費但有限制',
    jp: 'gam2 laa3 baa1 bo3 jyu5 jam1 — min5 fai3 daan6 jau5 haan6 zai3',
  },
  familyFeatLive8h: {
    en: '~8 hours of live translation / month',
    zh: '每月大約八小時即時翻譯',
    jp: 'mui5 jyut6 daai6 joek3 baat3 siu2 si4 zik1 si4 faan1 jik6',
  },
  familyFeatSeats: {
    en: 'Up to 4 shared users',
    zh: '最多 4 位共用用戶',
    jp: 'zeoi3 do1 4 wai2 gung6 jung6 jung6 wu6',
  },
  familyFeatCamera: {
    en: '800 camera scans / month',
    zh: '每月 800 次相機掃描',
    jp: 'mui5 jyut6 800 ci3 soeng1 gei1 sou3 miu4',
  },
  familyFeatTts: {
    en: 'Unlimited tap-to-play + auto-speak',
    zh: '無限撳喇叭播語音＋自動朗讀',
    jp: 'mou4 haan6 gam2 laa3 baa1 bo3 jyu5 jam1 + zi6 dung6 long5 duk6',
  },
  familyFeatQuality: {
    en: 'Priority, natural Cantonese quality',
    zh: '優先、自然嘅粵語質素',
    jp: 'jau4 sin1, zi6 jin4 ge3 jyut6 jyu5 zat1 sou3',
  },
  familyFeatEverything: {
    en: 'Everything in Free',
    zh: '包含免費版全部功能',
    jp: 'bau1 ham4 min5 fai3 baan2 cyun4 bou6 gung1 nang4',
  },

  /** Compact homepage pricing teaser (3 lines max). */
  landFreeLive: {
    en: '~1 hr live / month',
    zh: '每月約一小時即時',
    jp: 'mui5 jyut6 joek3 jat1 siu2 si4 zik1 si4',
  },
  landFreeText: {
    en: 'Unlimited text',
    zh: '無限文字翻譯',
    jp: 'mou4 haan6 man4 zi6 faan1 jik6',
  },
  landFreeCam: {
    en: '120 cam scans / month',
    zh: '每月 120 次相機掃描',
    jp: 'mui5 jyut6 120 ci3 soeng1 gei1 sou3 miu4',
  },
  landFamilyLive: {
    en: '~8 hours live / month',
    zh: '每月約八小時即時',
    jp: 'mui5 jyut6 joek3 baat3 siu2 si4 zik1 si4',
  },
  landFamilyCam: {
    en: '800 cam scans / month',
    zh: '每月 800 次相機掃描',
    jp: 'mui5 jyut6 800 ci3 soeng1 gei1 sou3 miu4',
  },
  landFamilySpeak: {
    en: 'Auto-speak + unlimited voice',
    zh: '自動朗讀＋無限語音',
    jp: 'zi6 dung6 long5 duk6 + mou4 haan6 jyu5 jam1',
  },
  landFamilyQuality: {
    en: 'Priority Cantonese quality',
    zh: '優先粵語質素',
    jp: 'jau4 sin1 jyut6 jyu5 zat1 sou3',
  },
  landAnnualHint: {
    en: 'from $8.99/mo billed yearly',
    zh: '年繳低至 $8.99／月',
    jp: 'nin4 gaau2 dai1 zi3 $8.99／jyut6',
  },

  ctaReady: {
    en: 'Ready to be understood?',
    zh: '準備好俾人聽明未？',
    jp: 'zeon2 bei6 hou2 bei2 jan4 teng1 ming4 mei6?',
  },
  ctaBody: {
    en: 'Open JyutTranslate and have your first bilingual conversation in seconds.',
    zh: '開啟 JyutTranslate，幾秒之內就可以開始雙語對話。',
    jp: 'hoi1 kai2 JyutTranslate, gei2 miu5 zi1 noi6 zau6 ho2 ji5 hoi1 ci2 soeng1 jyu5 deoi3 waa6.',
  },
  footerTagline: {
    en: 'Cantonese Language Tool',
    zh: '粵語語言工具',
    jp: 'jyut6 jyu5 jyu5 jin4 gung1 geoi6',
  },
  footerCopyright: {
    en: 'JyutTranslate © 2026',
    zh: 'JyutTranslate © 2026',
    jp: '',
  },
  footerContact: { en: 'Contact', zh: '聯絡', jp: 'lyun4 lok3' },
  footerPrivacy: { en: 'Privacy', zh: '私隱', jp: 'si1 jan2' },
  footerTerms: { en: 'Terms', zh: '條款', jp: 'tiu4 fun2' },
  footerDeleteAccount: { en: 'Delete account', zh: '刪除帳戶', jp: 'saan1 ceoi4 wu6 hau2' },
  legalPrivacyEyebrow: { en: 'Privacy', zh: '私隱政策', jp: 'si1 jan2 zing3 caak3' },
  legalTermsEyebrow: { en: 'Terms', zh: '服務條款', jp: 'fuk6 mou6 tiu4 fun2' },
  legalDeleteEyebrow: {
    en: 'Account deletion',
    zh: '刪除帳戶',
    jp: 'saan1 ceoi4 wu6 hau2',
  },
  legalEffective: {
    en: 'Effective September 1, 2026',
    zh: '生效日期：2026年9月1日',
    jp: 'sing1 haau6 jat6 kei4: 2026 nin4 9 jyut6 1 jat6',
  },
  authLegalLead: {
    en: 'By continuing, you agree to our',
    zh: '繼續即表示你同意我哋嘅',
    jp: 'gai3 zuk6 zik1 biu2 si6 nei5 tung4 ji3 ngo5 dei6 ge3',
  },
  authLegalAnd: { en: 'and', zh: '同', jp: 'tung4' },

  ppEyebrow: { en: 'Pricing', zh: '價錢', jp: 'gaa3 cin4' },
  ppTitle: {
    en: 'Pricing that scales with your conversations',
    zh: '價錢跟住你嘅對話增長',
    jp: 'gaa3 cin4 gan1 zyu6 nei5 ge3 deoi3 waa6 zang1 zoeng2',
  },
  ppSub: {
    en: 'Start free. Upgrade for more live talk-time and cam translations!',
    zh: '免費開始。升級享更多即時通話時間同相機翻譯！',
    jp: 'min5 fai3 hoi1 ci2. sing1 kap1 hoeng2 gang3 do1 zik1 si4 tung1 waa6 si4 gaan3 tung4 soeng1 gei1 faan1 jik6!',
  },
  monthly: { en: 'Monthly', zh: '月費', jp: 'jyut6 fai3' },
  annual: { en: 'Annual', zh: '年費', jp: 'nin4 fai3' },
  save20: { en: 'save ~20%', zh: '慳大約兩成', jp: 'haan1 daai6 joek3 loeng5 sing4' },
  billedAnnually: { en: 'billed annually', zh: '按年收費', jp: 'on3 nin4 sau1 fai3' },
  billedAnnuallyTotal: (total: string): Bi => ({
    en: `$${total} billed annually`,
    zh: `年繳 $${total}`,
    jp: `nin4 gaau2 $${total}`,
  }),
  planBusiness: { en: 'Business', zh: '商務版', jp: 'soeng1 mou6 baan2' },
  tagFree: { en: 'For trying it out', zh: '試用啱啱好', jp: 'si3 jung6 aam1 aam1 hou2' },
  tagFamily: { en: 'For regular conversations', zh: '日常傾計用', jp: 'jat6 soeng4 king1 gai2 jung6' },
  tagBusiness: {
    en: 'For teams & heavy live use',
    zh: '團隊同高用量即時翻譯',
    jp: 'tyun4 deoi6 tung4 gou1 jung6 loeng6 zik1 si4 faan1 jik6',
  },
  goBusiness: { en: 'Go Business', zh: '升級商務版', jp: 'sing1 kap1 soeng1 mou6 baan2' },
  businessFeatLive40: {
    en: '~40 hours of live translation / month (fair use)',
    zh: '每月大約四十小時即時翻譯（合理使用）',
    jp: 'mui5 jyut6 daai6 joek3 sei3 sap6 siu2 si4 zik1 si4 faan1 jik6 (hap6 lei5 si2 jung6)',
  },
  businessFeatSeats: {
    en: 'Up to 10 shared users',
    zh: '最多 10 位共用用戶',
    jp: 'zeoi3 do1 10 wai2 gung6 jung6 jung6 wu6',
  },
  businessFeatCamera: {
    en: 'Unlimited camera translation (metered)',
    zh: '無限相機翻譯（仍會計量）',
    jp: 'mou4 haan6 soeng1 gei1 faan1 jik6 (jing4 wui5 gai3 loeng4)',
  },
  businessFeatPower: {
    en: 'Headroom for Conversation Mode & long talks',
    zh: '對話模式同長對話有足夠空間',
    jp: 'deoi3 waa6 mou4 sik1 tung4 coeng4 deoi3 waa6 jau5 kau3 gau3 hung1 gaan1',
  },
  businessFeatEverything: {
    en: 'Everything in Family',
    zh: '包含家庭版全部功能',
    jp: 'bau1 ham4 gaa1 ting4 baan2 cyun4 bou6 gung1 nang4',
  },
  businessFeatSupport: {
    en: 'Priority support',
    zh: '優先支援',
    jp: 'jau4 sin1 zi1 wun4',
  },

  compareKicker: { en: 'Compare', zh: '比較', jp: 'bei2 gaau3' },
  compareTitle: {
    en: 'Every plan, side by side',
    zh: '每個計劃，並排睇',
    jp: 'mui5 go3 gai3 waak6, bing6 paai4 tai2',
  },
  cmpLive: { en: 'Live translation / month', zh: '每月即時翻譯', jp: 'mui5 jyut6 zik1 si4 faan1 jik6' },
  cmpText: { en: 'Text translation', zh: '文字翻譯', jp: 'man4 zi6 faan1 jik6' },
  cmpJp: { en: 'Jyutping romanization', zh: '粵拼羅馬拼音', jp: 'jyut6 ping3 lo4 maa5 ping3 jam1' },
  cmpWugniu: { en: 'Wugniu romanization', zh: '吳拼（吳語學堂）', jp: 'ng4 ping3 (ng4 jyu5 hok6 tong4)' },
  cmpSandhi: { en: 'Sandhi domain', zh: '連讀變調域', jp: 'lin4 duk6 bin3 diu6 wik6' },
  cmpIpa: { en: 'IPA pronunciation', zh: '國際音標', jp: 'gwok3 zai3 jam1 biu1' },
  camTargetWuu: { en: 'To Shanghainese', zh: '譯成上海話', jp: 'jik6 sing4 soeng6 hoi2 waa2' },
  camTargetSichuan: { en: 'To Sichuanese', zh: '譯成四川話', jp: 'jik6 sing4 sei3 cyun1 waa2' },
  cmpModes: {
    en: 'Solo · Conversation · Cam',
    zh: '獨白 · 對話 · 相機',
    jp: 'duk6 baak6 · deoi3 waa6 · soeng1 gei1',
  },
  cmpCamera: { en: 'Camera translation', zh: '相機翻譯', jp: 'soeng1 gei1 faan1 jik6' },
  cmpTts: { en: 'Tap-to-play voice', zh: '撳喇叭播語音', jp: 'gam2 laa3 baa1 bo3 jyu5 jam1' },
  cmpAutoSpeak: { en: 'Auto-speak after translate', zh: '翻譯後自動朗讀', jp: 'faan1 jik6 hau6 zi6 dung6 long5 duk6' },
  cmpQuality: { en: 'Cantonese quality', zh: '粵語質素', jp: 'jyut6 jyu5 zat1 sou3' },
  cmpSeats: { en: 'Seats', zh: '座位', jp: 'zo6 wai2' },
  cmpSupport: { en: 'Support', zh: '支援', jp: 'zi1 wun4' },
  valMetered: { en: 'Metered', zh: '有上限', jp: 'jau5 soeng6 haan6' },
  val1h: { en: '1 hour', zh: '一小時', jp: 'jat1 siu2 si4' },
  val8h: { en: '8 hours', zh: '八小時', jp: 'baat3 siu2 si4' },
  val40h: { en: '~40 hours*', zh: '大約四十小時*', jp: 'daai6 joek3 sei3 sap6 siu2 si4*' },
  valSeat1: { en: '1', zh: '1', jp: '' },
  valSeat4: { en: '4 pooled', zh: '4 個共用', jp: '4 go3 gung6 jung6' },
  valSeat10: { en: '10 pooled', zh: '10 個共用', jp: '10 go3 gung6 jung6' },
  valCamFree: { en: '120 scans / mo', zh: '每月 120 次', jp: 'mui5 jyut6 120 ci3' },
  valCamFamily: { en: '800 scans / mo', zh: '每月 800 次', jp: 'mui5 jyut6 800 ci3' },
  valCamBusiness: { en: 'Unlimited (metered)', zh: '無限（仍計量）', jp: 'mou4 haan6 (jing4 gai3 loeng4)' },
  valUnlimitedPlain: { en: 'Unlimited', zh: '無限', jp: 'mou4 haan6' },
  valStandard: { en: 'Standard', zh: '標準', jp: 'biu1 zeon2' },
  valPriority: { en: 'Priority', zh: '優先', jp: 'jau4 sin1' },
  valCommunity: { en: 'Community', zh: '社區', jp: 'se5 keoi1' },
  valEmail: { en: 'Email', zh: '電郵', jp: 'din6 jau4' },
  camMinutesCardTitle: {
    en: 'What are camera scans?',
    zh: '咩係相機掃描？',
    jp: 'me1 hai6 soeng1 gei1 sou3 miu4?',
  },
  camMinutesCardBody: {
    en: 'Each Cam shutter or upload translate uses one scan credit (Azure Vision OCR once — not continuous polling). Free includes 120 scans per month. Family includes 800. Business is unlimited but still tracked. Time spent in the Cam UI is logged for admin only and does not spend scan credits.',
    zh: '每次相機快門或上載翻譯用一格掃描額度（一次 Azure Vision OCR——唔會持續輪詢）。免費版每月 120 次。家庭版 800 次。商務版無限但仍會計量。喺相機介面嘅時間只作管理紀錄，唔扣掃描額度。',
    jp: 'mui5 ci3 soeng1 gei1 faai3 mun4 waak6 soeng5 zoi3 faan1 jik6 jung6 jat1 gaak3 sou3 miu4 ngaak6 dou6 (jat1 ci3 Azure Vision OCR — m4 wui5 ci4 zuk6 leon4 seon2). min5 fai3 baan2 mui5 jyut6 120 ci3. gaa1 ting4 baan2 800 ci3. kei4 gaam3 baan2 mou4 haan6 daan6 jing4 wui5 gai3 loeng4. hai2 soeng1 gei1 gaai3 min6 ge3 si4 gaan3 zi2 zou6 gun2 lei5 gei3 luk6, m4 kau3 sou3 miu4 ngaak6 dou6.',
  },
  fairUseNote: {
    en: '* Business live hours are a soft fair-use cap (~40 hrs/mo) so speech costs stay sustainable. Family camera is capped at 800 scans/mo; Business camera is unlimited but counted.',
    zh: '* 商務版即時時數係合理使用上限（大約每月四十小時），等語音成本可以持續。家庭版相機每月 800 次掃描；商務版相機無限但仍會計量。',
    jp: '* kei4 gaam3 baan2 zik1 si4 si4 sou3 hai6 hap6 lei5 si2 jung6 soeng6 haan6 (daai6 joek3 mui5 jyut6 sei3 sap6 siu2 si4), dang2 jyu5 jam1 sing4 bun2 ho2 ji5 ci4 zuk6. gaa1 ting4 baan2 soeng1 gei1 mui5 jyut6 800 ci3 sou3 miu4; kei4 gaam3 baan2 soeng1 gei1 mou4 haan6 daan6 jing4 wui5 gai3 loeng4.',
  },

  faqKicker: { en: 'FAQ', zh: '常見問題', jp: 'soeng4 gin3 man6 tai4' },
  faqTitle: { en: 'Good questions', zh: '好問題', jp: 'hou2 man6 tai4' },
  faq1q: {
    en: 'Do I need my own API keys?',
    zh: '我需唔需要自己嘅 API 密鑰？',
    jp: 'ngo5 seoi1 m4 seoi1 jiu3 zi6 gei2 ge3 API mat6 joek6?',
  },
  faq1a: {
    en: 'No. Guests can try tap-to-play voice; Free includes a monthly voice-char limit. Family/Business add unlimited voice, auto-speak, and more live mic time. If you self-host, plug in your own Azure/OpenAI keys.',
    zh: '唔使。訪客可以試撳喇叭播語音；免費版有每月語音字數上限。家庭版／商務版有無限語音、自動朗讀同更多即時咪高峰時間。如果自己托管，可以改用你嘅 Azure／OpenAI 密鑰。',
    jp: 'm4 sai2. fong2 haak3 ho2 ji5 si3 gam2 laa3 baa1 bo3 jyu5 jam1; min5 fai3 baan2 jau5 mui5 jyut6 jyu5 jam1 zi6 sou3 soeng6 haan6. zyun1 jip6 / kei4 gaam3 baan2 jau5 mou4 haan6 jyu5 jam1, zi6 dung6 long5 duk6 tung4 gang3 do1 zik1 si4 mai1 gou1 fung1 si4 gaan3. jyu4 gwo2 zi6 gei2 tok3 gun2, ho2 ji5 goi2 jung6 nei5 ge3 Azure / OpenAI mat6 joek6.',
  },
  faq2q: {
    en: 'What counts as a “live minute”?',
    zh: '咩叫做「即時分鐘」？',
    jp: 'me1 giu3 zou6 “zik1 si4 fan1 zung1”?',
  },
  faq2a: {
    en: 'Time the microphone is actively listening in Solo or Conversation Mode. Text never uses live minutes. Camera uses its own monthly scan credits (session time is logged separately).',
    zh: '獨白或對話模式入面，咪高峰正在收聽嘅時間。文字翻譯唔用即時分鐘。相機用自己嘅每月掃描額度（使用時長另作紀錄）。',
    jp: 'duk6 baak6 waak6 deoi3 waa6 mou4 sik1 jap6 min6, mai1 gou1 fung1 zing3 zoi6 sau1 teng1 ge3 si4 gaan3. man4 zi6 faan1 jik6 m4 jung6 zik1 si4 fan1 zung1. soeng1 gei1 jung6 zi6 gei2 ge3 mui5 jyut6 sou3 miu4 ngaak6 dou6 (si2 jung6 si4 coeng4 ling6 zou6 gei3 luk6).',
  },
  faq3q: {
    en: 'Can I run it on my own server?',
    zh: '可唔可以喺自己伺服器跑？',
    jp: 'ho2 m4 ho2 ji5 hai2 zi6 gei2 si1 fuk6 hei3 paau2?',
  },
  faq3a: {
    en: 'Yes — you can self-host the Vite app + Express API with your own Azure Speech, Azure Vision, and OpenAI/DeepSeek keys.',
    zh: '可以——你可以自己托管 Vite 應用＋Express 接口，並使用你自己嘅 Azure Speech、Azure Vision 同 OpenAI／DeepSeek 密鑰。',
    jp: 'ho2 ji5 — nei5 ho2 ji5 zi6 gei2 tok3 gun2 Vite jing3 jung6 + Express zip3 hau2, bing6 si2 jung6 nei5 zi6 gei2 ge3 Azure Speech, Azure Vision tung4 OpenAI / DeepSeek mat6 joek6.',
  },
  faq4q: {
    en: 'Can I cancel anytime?',
    zh: '可唔可以隨時取消？',
    jp: 'ho2 m4 ho2 ji5 ceoi4 si4 ceoi2 siu1?',
  },
  faq4a: {
    en: 'Yes, but refunds are up to my discretion. No refunds guaranteed.',
    zh: '可以，不過退款由我決定，唔保證退款。',
    jp: 'ho2 ji5, bat1 gwo3 teoi3 fun2 jau4 ngo5 kyut3 ding6, m4 bou2 zing3 teoi3 fun2.',
  },
  stillQuestions: { en: 'Still have questions?', zh: '仍然有問題？', jp: 'jing4 jin4 jau5 man6 tai4?' },
  stillBody: {
    en: 'Open the app to try it, or head back to the homepage for features.',
    zh: '開啟應用試吓，或者返去首頁睇功能。',
    jp: 'hoi1 kai2 jing3 jung6 si3 haa5, waak6 ze2 faan1 heoi3 sau2 jap6 tai2 gung1 nang4.',
  },
  backToApp: { en: 'Back to the app', zh: '返去應用', jp: 'faan1 heoi3 jing3 jung6' },
}

export function biPlain(b: Bi, primary?: PrimaryLang): string {
  const lang = primary ?? (typeof localStorage !== 'undefined' ? readLocalPrimaryLang() : 'yue')
  if (lang === 'tl' || lang === 'es' || lang === 'vi' || lang === 'wuu') {
    const fromBi = b[lang]
    if (typeof fromBi === 'string' && fromBi.trim()) return `${b.en} ${fromBi.trim()}`
    const row = PRIMARY_UI_GLOSS[b.en]
    const gloss = row?.[lang]
    if (typeof gloss === 'string' && gloss.trim()) return `${b.en} ${gloss.trim()}`
  }
  // Cantonese primary: Chinese leads (matches zh-first chrome).
  if (lang === 'yue') return `${b.zh} ${b.en}`
  return `${b.en} ${b.zh}`
}

/** Cam → Documents progress lines for TranslateThinking (page-aware stages). */
export type DocThinkingPhase = 'starting' | 'reading' | 'translating' | 'ocr' | 'office' | 'saving'

export function docThinkingCopy(
  phase: DocThinkingPhase,
  page = 0,
  total = 0,
): Bi {
  switch (phase) {
    case 'starting':
      return ui.camDocStageStarting
    case 'office':
      return ui.camDocOffice
    case 'saving':
      return total > 1
        ? {
            en: `Saving ${total} pages…`,
            zh: `儲存 ${total} 頁中…`,
            jp: `cou5 cyun4 ${total} jip6 zung1…`,
          }
        : ui.camDocStageSaving
    case 'reading':
      return {
        en: total > 1 ? `Reading page ${page} of ${total}` : `Reading page ${page}`,
        zh: total > 1 ? `讀緊第 ${page}／${total} 頁` : `讀緊第 ${page} 頁`,
        jp: total > 1
          ? `duk6 gan2 dai6 ${page} / ${total} jip6`
          : `duk6 gan2 dai6 ${page} jip6`,
      }
    case 'translating':
      return {
        en: total > 1 ? `Translating page ${page} of ${total}` : `Translating page ${page}`,
        zh: total > 1 ? `翻譯緊第 ${page}／${total} 頁` : `翻譯緊第 ${page} 頁`,
        jp: total > 1
          ? `faan1 jik6 gan2 dai6 ${page} / ${total} jip6`
          : `faan1 jik6 gan2 dai6 ${page} jip6`,
      }
    case 'ocr':
      return {
        en: total > 1 ? `Scanning page ${page} of ${total}` : `Scanning page ${page}`,
        zh: total > 1 ? `掃描緊第 ${page}／${total} 頁` : `掃描緊第 ${page} 頁`,
        jp: total > 1
          ? `sou3 miu4 gan2 dai6 ${page} / ${total} jip6`
          : `sou3 miu4 gan2 dai6 ${page} jip6`,
      }
  }
}
