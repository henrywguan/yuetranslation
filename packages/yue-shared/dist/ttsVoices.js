/** Curated Azure Neural TTS voices (API + web). */
export const DEFAULT_YUE_VOICE = 'zh-HK-HiuMaanNeural';
export const DEFAULT_EN_VOICE = 'en-US-JennyNeural';
export const DEFAULT_CMN_VOICE = 'zh-CN-XiaoxiaoNeural';
/** Shanghainese (Wu) — Azure locale wuu-CN. */
export const DEFAULT_WUU_VOICE = 'wuu-CN-XiaotongNeural';
/** Sichuanese (Chengdu) — Azure locale zh-CN-sichuan. */
export const DEFAULT_SICHUAN_VOICE = 'zh-CN-sichuan-YunxiNeural';
export const DEFAULT_TL_VOICE = 'fil-PH-BlessicaNeural';
/** Mexican Spanish (es-MX) — always the `es` code. Never Spain. */
export const DEFAULT_ES_VOICE = 'es-MX-DaliaNeural';
/** Peninsular / Castilian Spanish (es-ES) — always the `eses` code. Never Mexico. */
export const DEFAULT_ESES_VOICE = 'es-ES-ElviraNeural';
export const DEFAULT_VI_VOICE = 'vi-VN-HoaiMyNeural';
export const DEFAULT_TH_VOICE = 'th-TH-PremwadeeNeural';
export const DEFAULT_LO_VOICE = 'lo-LA-KeomanyNeural';
export const DEFAULT_KO_VOICE = 'ko-KR-SunHiNeural';
export const DEFAULT_JA_VOICE = 'ja-JP-NanamiNeural';
export const DEFAULT_ID_VOICE = 'id-ID-GadisNeural';
export const DEFAULT_MS_VOICE = 'ms-MY-YasminNeural';
export const DEFAULT_PT_VOICE = 'pt-BR-FranciscaNeural';
export const DEFAULT_FR_VOICE = 'fr-FR-DeniseNeural';
export const DEFAULT_HI_VOICE = 'hi-IN-AnanyaNeural';
export const DEFAULT_KM_VOICE = 'km-KH-SreymomNeural';
export const DEFAULT_MY_VOICE = 'my-MM-NilarNeural';
export const DEFAULT_JV_VOICE = 'jv-ID-SitiNeural';
export const DEFAULT_IT_VOICE = 'it-IT-ElsaNeural';
export const DEFAULT_DE_VOICE = 'de-DE-KatjaNeural';
export const DEFAULT_NL_VOICE = 'nl-NL-FennaNeural';
export const DEFAULT_AR_VOICE = 'ar-EG-SalmaNeural';
export const DEFAULT_ARSA_VOICE = 'ar-SA-ZariyahNeural';
export const YUE_VOICES = [
    {
        id: 'zh-HK-HiuMaanNeural',
        lang: 'yue',
        xmlLang: 'zh-HK',
        labelEn: 'Hiu Maan · Female',
        labelZh: '曉曼 · 女聲',
        gender: 'female',
    },
    {
        id: 'zh-HK-HiuGaaiNeural',
        lang: 'yue',
        xmlLang: 'zh-HK',
        labelEn: 'Hiu Gaai · Female',
        labelZh: '曉佳 · 女聲',
        gender: 'female',
    },
    {
        id: 'zh-HK-WanLungNeural',
        lang: 'yue',
        xmlLang: 'zh-HK',
        labelEn: 'Wan Lung · Male',
        labelZh: '雲龍 · 男聲',
        gender: 'male',
    },
];
export const EN_VOICES = [
    {
        id: 'en-US-JennyNeural',
        lang: 'en',
        xmlLang: 'en-US',
        labelEn: 'Jenny · US Female',
        labelZh: 'Jenny · 美式女聲',
        gender: 'female',
    },
    {
        id: 'en-US-GuyNeural',
        lang: 'en',
        xmlLang: 'en-US',
        labelEn: 'Guy · US Male',
        labelZh: 'Guy · 美式男聲',
        gender: 'male',
    },
    {
        id: 'en-US-AriaNeural',
        lang: 'en',
        xmlLang: 'en-US',
        labelEn: 'Aria · US Female',
        labelZh: 'Aria · 美式女聲',
        gender: 'female',
    },
    {
        id: 'en-GB-SoniaNeural',
        lang: 'en',
        xmlLang: 'en-GB',
        labelEn: 'Sonia · UK Female',
        labelZh: 'Sonia · 英式女聲',
        gender: 'female',
    },
    {
        id: 'en-GB-RyanNeural',
        lang: 'en',
        xmlLang: 'en-GB',
        labelEn: 'Ryan · UK Male',
        labelZh: 'Ryan · 英式男聲',
        gender: 'male',
    },
    {
        id: 'en-AU-NatashaNeural',
        lang: 'en',
        xmlLang: 'en-AU',
        labelEn: 'Natasha · AU Female',
        labelZh: 'Natasha · 澳式女聲',
        gender: 'female',
    },
];
export const TL_VOICES = [
    {
        id: 'fil-PH-BlessicaNeural',
        lang: 'tl',
        xmlLang: 'fil-PH',
        labelEn: 'Blessica · Female',
        labelZh: 'Blessica · 女聲',
        gender: 'female',
    },
    {
        id: 'fil-PH-AngeloNeural',
        lang: 'tl',
        xmlLang: 'fil-PH',
        labelEn: 'Angelo · Male',
        labelZh: 'Angelo · 男聲',
        gender: 'male',
    },
];
export const ES_VOICES = [
    {
        id: 'es-MX-DaliaNeural',
        lang: 'es',
        xmlLang: 'es-MX',
        labelEn: 'Dalia · Mexican Female',
        labelZh: 'Dalia · 墨西哥女聲',
        gender: 'female',
    },
    {
        id: 'es-MX-JorgeNeural',
        lang: 'es',
        xmlLang: 'es-MX',
        labelEn: 'Jorge · Mexican Male',
        labelZh: 'Jorge · 墨西哥男聲',
        gender: 'male',
    },
];
export const ES_ES_VOICES = [
    {
        id: 'es-ES-ElviraNeural',
        lang: 'eses',
        xmlLang: 'es-ES',
        labelEn: 'Elvira · Spain Female',
        labelZh: 'Elvira · 西班牙女聲',
        gender: 'female',
    },
    {
        id: 'es-ES-AlvaroNeural',
        lang: 'eses',
        xmlLang: 'es-ES',
        labelEn: 'Álvaro · Spain Male',
        labelZh: 'Álvaro · 西班牙男聲',
        gender: 'male',
    },
];
export const VI_VOICES = [
    {
        id: 'vi-VN-HoaiMyNeural',
        lang: 'vi',
        xmlLang: 'vi-VN',
        labelEn: 'Hoài My · Female',
        labelZh: 'Hoài My · 女聲',
        gender: 'female',
    },
    {
        id: 'vi-VN-NamMinhNeural',
        lang: 'vi',
        xmlLang: 'vi-VN',
        labelEn: 'Nam Minh · Male',
        labelZh: 'Nam Minh · 男聲',
        gender: 'male',
    },
];
export const TH_VOICES = [
    {
        id: 'th-TH-PremwadeeNeural',
        lang: 'th',
        xmlLang: 'th-TH',
        labelEn: 'Premwadee · Female',
        labelZh: 'Premwadee · 女聲',
        gender: 'female',
    },
    {
        id: 'th-TH-NiwatNeural',
        lang: 'th',
        xmlLang: 'th-TH',
        labelEn: 'Niwat · Male',
        labelZh: 'Niwat · 男聲',
        gender: 'male',
    },
];
export const LO_VOICES = [
    {
        id: 'lo-LA-KeomanyNeural',
        lang: 'lo',
        xmlLang: 'lo-LA',
        labelEn: 'Keomany · Female',
        labelZh: 'Keomany · 女聲',
        gender: 'female',
    },
    {
        id: 'lo-LA-ChanthavongNeural',
        lang: 'lo',
        xmlLang: 'lo-LA',
        labelEn: 'Chanthavong · Male',
        labelZh: 'Chanthavong · 男聲',
        gender: 'male',
    },
];
export const KO_VOICES = [
    {
        id: 'ko-KR-SunHiNeural',
        lang: 'ko',
        xmlLang: 'ko-KR',
        labelEn: 'Sun-Hi · Female',
        labelZh: 'Sun-Hi · 女聲',
        gender: 'female',
    },
    {
        id: 'ko-KR-InJoonNeural',
        lang: 'ko',
        xmlLang: 'ko-KR',
        labelEn: 'InJoon · Male',
        labelZh: 'InJoon · 男聲',
        gender: 'male',
    },
];
export const JA_VOICES = [
    {
        id: 'ja-JP-NanamiNeural',
        lang: 'ja',
        xmlLang: 'ja-JP',
        labelEn: 'Nanami · Female',
        labelZh: 'Nanami · 女聲',
        gender: 'female',
    },
    {
        id: 'ja-JP-KeitaNeural',
        lang: 'ja',
        xmlLang: 'ja-JP',
        labelEn: 'Keita · Male',
        labelZh: 'Keita · 男聲',
        gender: 'male',
    },
];
export const ID_VOICES = [
    {
        id: 'id-ID-GadisNeural',
        lang: 'id',
        xmlLang: 'id-ID',
        labelEn: 'Gadis · Female',
        labelZh: 'Gadis · 女聲',
        gender: 'female',
    },
    {
        id: 'id-ID-ArdiNeural',
        lang: 'id',
        xmlLang: 'id-ID',
        labelEn: 'Ardi · Male',
        labelZh: 'Ardi · 男聲',
        gender: 'male',
    },
];
export const MS_VOICES = [
    {
        id: 'ms-MY-YasminNeural',
        lang: 'ms',
        xmlLang: 'ms-MY',
        labelEn: 'Yasmin · Female',
        labelZh: 'Yasmin · 女聲',
        gender: 'female',
    },
    {
        id: 'ms-MY-OsmanNeural',
        lang: 'ms',
        xmlLang: 'ms-MY',
        labelEn: 'Osman · Male',
        labelZh: 'Osman · 男聲',
        gender: 'male',
    },
];
export const PT_VOICES = [
    {
        id: 'pt-BR-FranciscaNeural',
        lang: 'pt',
        xmlLang: 'pt-BR',
        labelEn: 'Francisca · Female',
        labelZh: 'Francisca · 女聲',
        gender: 'female',
    },
    {
        id: 'pt-BR-AntonioNeural',
        lang: 'pt',
        xmlLang: 'pt-BR',
        labelEn: 'Antonio · Male',
        labelZh: 'Antonio · 男聲',
        gender: 'male',
    },
];
export const FR_VOICES = [
    {
        id: 'fr-FR-DeniseNeural',
        lang: 'fr',
        xmlLang: 'fr-FR',
        labelEn: 'Denise · Female',
        labelZh: 'Denise · 女聲',
        gender: 'female',
    },
    {
        id: 'fr-FR-HenriNeural',
        lang: 'fr',
        xmlLang: 'fr-FR',
        labelEn: 'Henri · Male',
        labelZh: 'Henri · 男聲',
        gender: 'male',
    },
];
export const HI_VOICES = [
    {
        id: 'hi-IN-AnanyaNeural',
        lang: 'hi',
        xmlLang: 'hi-IN',
        labelEn: 'Ananya · Female',
        labelZh: 'Ananya · 女聲',
        gender: 'female',
    },
    {
        id: 'hi-IN-AaravNeural',
        lang: 'hi',
        xmlLang: 'hi-IN',
        labelEn: 'Aarav · Male',
        labelZh: 'Aarav · 男聲',
        gender: 'male',
    },
];
export const KM_VOICES = [
    {
        id: 'km-KH-SreymomNeural',
        lang: 'km',
        xmlLang: 'km-KH',
        labelEn: 'Sreymom · Female',
        labelZh: 'Sreymom · 女聲',
        gender: 'female',
    },
    {
        id: 'km-KH-PisethNeural',
        lang: 'km',
        xmlLang: 'km-KH',
        labelEn: 'Piseth · Male',
        labelZh: 'Piseth · 男聲',
        gender: 'male',
    },
];
export const MY_VOICES = [
    {
        id: 'my-MM-NilarNeural',
        lang: 'my',
        xmlLang: 'my-MM',
        labelEn: 'Nilar · Female',
        labelZh: 'Nilar · 女聲',
        gender: 'female',
    },
    {
        id: 'my-MM-ThihaNeural',
        lang: 'my',
        xmlLang: 'my-MM',
        labelEn: 'Thiha · Male',
        labelZh: 'Thiha · 男聲',
        gender: 'male',
    },
];
export const JV_VOICES = [
    {
        id: 'jv-ID-SitiNeural',
        lang: 'jv',
        xmlLang: 'jv-ID',
        labelEn: 'Siti · Female',
        labelZh: 'Siti · 女聲',
        gender: 'female',
    },
    {
        id: 'jv-ID-DimasNeural',
        lang: 'jv',
        xmlLang: 'jv-ID',
        labelEn: 'Dimas · Male',
        labelZh: 'Dimas · 男聲',
        gender: 'male',
    },
];
export const IT_VOICES = [
    {
        id: 'it-IT-ElsaNeural',
        lang: 'it',
        xmlLang: 'it-IT',
        labelEn: 'Elsa · Female',
        labelZh: 'Elsa · 女聲',
        gender: 'female',
    },
    {
        id: 'it-IT-DiegoNeural',
        lang: 'it',
        xmlLang: 'it-IT',
        labelEn: 'Diego · Male',
        labelZh: 'Diego · 男聲',
        gender: 'male',
    },
];
export const DE_VOICES = [
    {
        id: 'de-DE-KatjaNeural',
        lang: 'de',
        xmlLang: 'de-DE',
        labelEn: 'Katja · Female',
        labelZh: 'Katja · 女聲',
        gender: 'female',
    },
    {
        id: 'de-DE-ConradNeural',
        lang: 'de',
        xmlLang: 'de-DE',
        labelEn: 'Conrad · Male',
        labelZh: 'Conrad · 男聲',
        gender: 'male',
    },
];
export const NL_VOICES = [
    {
        id: 'nl-NL-FennaNeural',
        lang: 'nl',
        xmlLang: 'nl-NL',
        labelEn: 'Fenna · Female',
        labelZh: 'Fenna · 女聲',
        gender: 'female',
    },
    {
        id: 'nl-NL-MaartenNeural',
        lang: 'nl',
        xmlLang: 'nl-NL',
        labelEn: 'Maarten · Male',
        labelZh: 'Maarten · 男聲',
        gender: 'male',
    },
];
export const AR_VOICES = [
    {
        id: 'ar-EG-SalmaNeural',
        lang: 'ar',
        xmlLang: 'ar-EG',
        labelEn: 'Salma · Female',
        labelZh: 'Salma · 女聲',
        gender: 'female',
    },
    {
        id: 'ar-EG-ShakirNeural',
        lang: 'ar',
        xmlLang: 'ar-EG',
        labelEn: 'Shakir · Male',
        labelZh: 'Shakir · 男聲',
        gender: 'male',
    },
];
export const ARSA_VOICES = [
    {
        id: 'ar-SA-ZariyahNeural',
        lang: 'arsa',
        xmlLang: 'ar-SA',
        labelEn: 'Zariyah · Female',
        labelZh: 'Zariyah · 女聲',
        gender: 'female',
    },
    {
        id: 'ar-SA-HamedNeural',
        lang: 'arsa',
        xmlLang: 'ar-SA',
        labelEn: 'Hamed · Male',
        labelZh: 'Hamed · 男聲',
        gender: 'male',
    },
];
export const CMN_VOICES = [
    {
        id: 'zh-CN-XiaoxiaoNeural',
        lang: 'cmn',
        xmlLang: 'zh-CN',
        labelEn: 'Xiaoxiao · Female',
        labelZh: '晓晓 · 女声',
        gender: 'female',
    },
    {
        id: 'zh-CN-YunxiNeural',
        lang: 'cmn',
        xmlLang: 'zh-CN',
        labelEn: 'Yunxi · Male',
        labelZh: '云希 · 男声',
        gender: 'male',
    },
];
export const WUU_VOICES = [
    {
        id: 'wuu-CN-XiaotongNeural',
        lang: 'wuu',
        xmlLang: 'wuu-CN',
        labelEn: 'Xiaotong · Female',
        labelZh: '晓彤 · 女声',
        gender: 'female',
    },
    {
        id: 'wuu-CN-YunzheNeural',
        lang: 'wuu',
        xmlLang: 'wuu-CN',
        labelEn: 'Yunzhe · Male',
        labelZh: '云哲 · 男声',
        gender: 'male',
    },
];
export const SICHUAN_VOICES = [
    {
        id: 'zh-CN-sichuan-YunxiNeural',
        lang: 'sichuan',
        xmlLang: 'zh-CN-sichuan',
        labelEn: 'Yunxi · Chengdu Male',
        labelZh: '云希 · 成都男声',
        gender: 'male',
    },
];
const YUE_SET = new Set(YUE_VOICES.map((v) => v.id));
const EN_SET = new Set(EN_VOICES.map((v) => v.id));
const CMN_SET = new Set(CMN_VOICES.map((v) => v.id));
const WUU_SET = new Set(WUU_VOICES.map((v) => v.id));
const SICHUAN_SET = new Set(SICHUAN_VOICES.map((v) => v.id));
const TL_SET = new Set(TL_VOICES.map((v) => v.id));
const ES_SET = new Set(ES_VOICES.map((v) => v.id));
const ES_ES_SET = new Set(ES_ES_VOICES.map((v) => v.id));
const VI_SET = new Set(VI_VOICES.map((v) => v.id));
const TH_SET = new Set(TH_VOICES.map((v) => v.id));
const LO_SET = new Set(LO_VOICES.map((v) => v.id));
const KO_SET = new Set(KO_VOICES.map((v) => v.id));
const JA_SET = new Set(JA_VOICES.map((v) => v.id));
const ID_SET = new Set(ID_VOICES.map((v) => v.id));
const MS_SET = new Set(MS_VOICES.map((v) => v.id));
const PT_SET = new Set(PT_VOICES.map((v) => v.id));
const FR_SET = new Set(FR_VOICES.map((v) => v.id));
const HI_SET = new Set(HI_VOICES.map((v) => v.id));
const KM_SET = new Set(KM_VOICES.map((v) => v.id));
const MY_SET = new Set(MY_VOICES.map((v) => v.id));
const JV_SET = new Set(JV_VOICES.map((v) => v.id));
const IT_SET = new Set(IT_VOICES.map((v) => v.id));
const DE_SET = new Set(DE_VOICES.map((v) => v.id));
const NL_SET = new Set(NL_VOICES.map((v) => v.id));
const AR_SET = new Set(AR_VOICES.map((v) => v.id));
const ARSA_SET = new Set(ARSA_VOICES.map((v) => v.id));
const ALL = new Map([
    ...YUE_VOICES,
    ...EN_VOICES,
    ...CMN_VOICES,
    ...WUU_VOICES,
    ...SICHUAN_VOICES,
    ...TL_VOICES,
    ...ES_VOICES,
    ...ES_ES_VOICES,
    ...VI_VOICES,
    ...TH_VOICES,
    ...LO_VOICES,
    ...KO_VOICES,
    ...JA_VOICES,
    ...ID_VOICES,
    ...MS_VOICES,
    ...PT_VOICES,
    ...FR_VOICES,
    ...HI_VOICES,
    ...KM_VOICES,
    ...MY_VOICES,
    ...JV_VOICES,
    ...IT_VOICES,
    ...DE_VOICES,
    ...NL_VOICES,
    ...AR_VOICES,
    ...ARSA_VOICES,
].map((v) => [v.id, v]));
export function isYueVoice(id) {
    return YUE_SET.has(id);
}
export function isEnVoice(id) {
    return EN_SET.has(id);
}
export function isCmnVoice(id) {
    return CMN_SET.has(id);
}
export function isWuuVoice(id) {
    return WUU_SET.has(id);
}
export function isSichuanVoice(id) {
    return SICHUAN_SET.has(id);
}
export function isTlVoice(id) {
    return TL_SET.has(id);
}
export function isEsVoice(id) {
    return ES_SET.has(id);
}
export function isEsesVoice(id) {
    return ES_ES_SET.has(id);
}
export function isViVoice(id) {
    return VI_SET.has(id);
}
export function isThVoice(id) {
    return TH_SET.has(id);
}
export function isLoVoice(id) {
    return LO_SET.has(id);
}
export function isKoVoice(id) {
    return KO_SET.has(id);
}
export function resolveYueVoice(id) {
    return id && isYueVoice(id) ? id : DEFAULT_YUE_VOICE;
}
export function resolveEnVoice(id) {
    return id && isEnVoice(id) ? id : DEFAULT_EN_VOICE;
}
export function resolveCmnVoice(id) {
    return id && isCmnVoice(id) ? id : DEFAULT_CMN_VOICE;
}
export function resolveWuuVoice(id) {
    return id && isWuuVoice(id) ? id : DEFAULT_WUU_VOICE;
}
export function resolveSichuanVoice(id) {
    return id && isSichuanVoice(id) ? id : DEFAULT_SICHUAN_VOICE;
}
export function resolveTlVoice(id) {
    return id && isTlVoice(id) ? id : DEFAULT_TL_VOICE;
}
export function resolveEsVoice(id) {
    return id && isEsVoice(id) ? id : DEFAULT_ES_VOICE;
}
export function resolveEsesVoice(id) {
    return id && isEsesVoice(id) ? id : DEFAULT_ESES_VOICE;
}
export function resolveViVoice(id) {
    return id && isViVoice(id) ? id : DEFAULT_VI_VOICE;
}
export function resolveThVoice(id) {
    return id && isThVoice(id) ? id : DEFAULT_TH_VOICE;
}
export function resolveLoVoice(id) {
    return id && isLoVoice(id) ? id : DEFAULT_LO_VOICE;
}
export function resolveKoVoice(id) {
    return id && isKoVoice(id) ? id : DEFAULT_KO_VOICE;
}
export function isJaVoice(id) {
    return JA_SET.has(id);
}
export function resolveJaVoice(id) {
    return id && isJaVoice(id) ? id : DEFAULT_JA_VOICE;
}
export function isIdVoice(id) {
    return ID_SET.has(id);
}
export function resolveIdVoice(id) {
    return id && isIdVoice(id) ? id : DEFAULT_ID_VOICE;
}
export function isMsVoice(id) {
    return MS_SET.has(id);
}
export function resolveMsVoice(id) {
    return id && isMsVoice(id) ? id : DEFAULT_MS_VOICE;
}
export function isPtVoice(id) {
    return PT_SET.has(id);
}
export function resolvePtVoice(id) {
    return id && isPtVoice(id) ? id : DEFAULT_PT_VOICE;
}
export function isFrVoice(id) {
    return FR_SET.has(id);
}
export function resolveFrVoice(id) {
    return id && isFrVoice(id) ? id : DEFAULT_FR_VOICE;
}
export function isHiVoice(id) {
    return HI_SET.has(id);
}
export function resolveHiVoice(id) {
    return id && isHiVoice(id) ? id : DEFAULT_HI_VOICE;
}
export function isKmVoice(id) {
    return KM_SET.has(id);
}
export function resolveKmVoice(id) {
    return id && isKmVoice(id) ? id : DEFAULT_KM_VOICE;
}
export function isMyVoice(id) {
    return MY_SET.has(id);
}
export function resolveMyVoice(id) {
    return id && isMyVoice(id) ? id : DEFAULT_MY_VOICE;
}
export function isJvVoice(id) {
    return JV_SET.has(id);
}
export function resolveJvVoice(id) {
    return id && isJvVoice(id) ? id : DEFAULT_JV_VOICE;
}
export function isItVoice(id) {
    return IT_SET.has(id);
}
export function resolveItVoice(id) {
    return id && isItVoice(id) ? id : DEFAULT_IT_VOICE;
}
export function isDeVoice(id) {
    return DE_SET.has(id);
}
export function resolveDeVoice(id) {
    return id && isDeVoice(id) ? id : DEFAULT_DE_VOICE;
}
export function isNlVoice(id) {
    return NL_SET.has(id);
}
export function isArVoice(id) {
    return AR_SET.has(id);
}
export function isArsaVoice(id) {
    return ARSA_SET.has(id);
}
export function resolveNlVoice(id) {
    return id && isNlVoice(id) ? id : DEFAULT_NL_VOICE;
}
export function resolveArVoice(id) {
    return id && isArVoice(id) ? id : DEFAULT_AR_VOICE;
}
export function resolveArsaVoice(id) {
    return id && isArsaVoice(id) ? id : DEFAULT_ARSA_VOICE;
}
export function voiceMeta(id) {
    return ALL.get(id);
}
/** Pick Azure voice + xml:lang for a speak request. */
export function resolveSpeakVoice(lang, preferredYue, preferredEn, preferredCmn, preferredWuu, preferredSichuan, preferredTl, preferredEs, override, preferredVi, preferredEses, preferredTh, preferredLo, preferredKo, preferredJa, preferredId, preferredMs, preferredPt, preferredFr, preferredHi, preferredKm, preferredMy, preferredJv, preferredIt, preferredDe, preferredNl, preferredAr, preferredArsa) {
    const isEn = lang === 'en' || lang === 'en-US' || lang === 'en-GB' || lang === 'en-AU';
    const isCmn = lang === 'cmn' || lang === 'zh-CN' || lang === 'zh-Hans';
    const isWuu = lang === 'wuu' || lang === 'wuu-CN';
    const isSichuan = lang === 'sichuan' || lang === 'zh-CN-sichuan';
    const isTl = lang === 'tl' || lang === 'fil' || lang === 'fil-PH';
    /** Mexican Spanish only — es-ES belongs to `isEses`, never here. */
    const isEs = lang === 'es' || lang === 'es-MX' || lang === 'es-mx';
    /** Peninsular / Castilian Spanish (Spain) — `eses` code, es-ES locale. */
    const isEses = lang === 'eses' || lang === 'es-ES' || lang === 'es-es';
    const isVi = lang === 'vi' || lang === 'vi-VN' || lang === 'vi-vn';
    const isTh = lang === 'th' || lang === 'th-TH' || lang === 'th-th';
    const isLo = lang === 'lo' || lang === 'lo-LA' || lang === 'lo-la';
    const isKo = lang === 'ko' || lang === 'ko-KR' || lang === 'ko-kr';
    const isJa = lang === 'ja' || lang === 'ja-JP' || lang === 'ja-jp';
    const isId = lang === 'id' || lang === 'id-ID' || lang === 'id-id';
    const isMs = lang === 'ms' || lang === 'ms-MY' || lang === 'ms-my';
    const isPt = lang === 'pt' || lang === 'pt-BR' || lang === 'pt-br';
    const isFr = lang === 'fr' || lang === 'fr-FR' || lang === 'fr-fr';
    const isHi = lang === 'hi' || lang === 'hi-IN' || lang === 'hi-in';
    const isKm = lang === 'km' || lang === 'km-KH' || lang === 'km-kh';
    const isMy = lang === 'my' || lang === 'my-MM' || lang === 'my-mm';
    const isJv = lang === 'jv' || lang === 'jv-ID' || lang === 'jv-id';
    const isIt = lang === 'it' || lang === 'it-IT' || lang === 'it-it';
    const isDe = lang === 'de' || lang === 'de-DE' || lang === 'de-de';
    const isNl = lang === 'nl' || lang === 'nl-NL' || lang === 'nl-nl';
    const isAr = lang === 'ar' || lang === 'ar-EG' || lang === 'ar-eg';
    const isArsa = lang === 'arsa' || lang === 'ar-SA' || lang === 'ar-sa';
    if (override) {
        const meta = voiceMeta(override);
        if (meta) {
            if (isEn && meta.lang === 'en')
                return { voice: meta.id, xmlLang: meta.xmlLang };
            if (isCmn && meta.lang === 'cmn')
                return { voice: meta.id, xmlLang: meta.xmlLang };
            if (isWuu && meta.lang === 'wuu')
                return { voice: meta.id, xmlLang: meta.xmlLang };
            if (isSichuan && meta.lang === 'sichuan')
                return { voice: meta.id, xmlLang: meta.xmlLang };
            if (isTl && meta.lang === 'tl')
                return { voice: meta.id, xmlLang: meta.xmlLang };
            if (isEs && meta.lang === 'es')
                return { voice: meta.id, xmlLang: meta.xmlLang };
            if (isEses && meta.lang === 'eses')
                return { voice: meta.id, xmlLang: meta.xmlLang };
            if (isVi && meta.lang === 'vi')
                return { voice: meta.id, xmlLang: meta.xmlLang };
            if (isTh && meta.lang === 'th')
                return { voice: meta.id, xmlLang: meta.xmlLang };
            if (isLo && meta.lang === 'lo')
                return { voice: meta.id, xmlLang: meta.xmlLang };
            if (isKo && meta.lang === 'ko')
                return { voice: meta.id, xmlLang: meta.xmlLang };
            if (isJa && meta.lang === 'ja')
                return { voice: meta.id, xmlLang: meta.xmlLang };
            if (isId && meta.lang === 'id')
                return { voice: meta.id, xmlLang: meta.xmlLang };
            if (isMs && meta.lang === 'ms')
                return { voice: meta.id, xmlLang: meta.xmlLang };
            if (isPt && meta.lang === 'pt')
                return { voice: meta.id, xmlLang: meta.xmlLang };
            if (isFr && meta.lang === 'fr')
                return { voice: meta.id, xmlLang: meta.xmlLang };
            if (isHi && meta.lang === 'hi')
                return { voice: meta.id, xmlLang: meta.xmlLang };
            if (isKm && meta.lang === 'km')
                return { voice: meta.id, xmlLang: meta.xmlLang };
            if (isMy && meta.lang === 'my')
                return { voice: meta.id, xmlLang: meta.xmlLang };
            if (isJv && meta.lang === 'jv')
                return { voice: meta.id, xmlLang: meta.xmlLang };
            if (isIt && meta.lang === 'it')
                return { voice: meta.id, xmlLang: meta.xmlLang };
            if (isDe && meta.lang === 'de')
                return { voice: meta.id, xmlLang: meta.xmlLang };
            if (isNl && meta.lang === 'nl')
                return { voice: meta.id, xmlLang: meta.xmlLang };
            if (isAr && meta.lang === 'ar')
                return { voice: meta.id, xmlLang: meta.xmlLang };
            if (isArsa && meta.lang === 'arsa')
                return { voice: meta.id, xmlLang: meta.xmlLang };
            if (!isEn &&
                !isCmn &&
                !isWuu &&
                !isSichuan &&
                !isTl &&
                !isEs &&
                !isEses &&
                !isVi &&
                !isTh &&
                !isLo &&
                !isKo &&
                !isJa &&
                !isId &&
                !isMs &&
                !isPt &&
                !isFr &&
                !isHi &&
                !isKm &&
                !isMy &&
                !isJv &&
                !isIt &&
                !isDe &&
                !isNl &&
                !isAr &&
                !isArsa &&
                meta.lang === 'yue') {
                return { voice: meta.id, xmlLang: meta.xmlLang };
            }
        }
    }
    if (isEn) {
        const id = resolveEnVoice(preferredEn);
        return { voice: id, xmlLang: voiceMeta(id).xmlLang };
    }
    if (isCmn) {
        const id = resolveCmnVoice(preferredCmn);
        return { voice: id, xmlLang: voiceMeta(id).xmlLang };
    }
    if (isWuu) {
        const id = resolveWuuVoice(preferredWuu);
        return { voice: id, xmlLang: voiceMeta(id).xmlLang };
    }
    if (isSichuan) {
        const id = resolveSichuanVoice(preferredSichuan);
        return { voice: id, xmlLang: voiceMeta(id).xmlLang };
    }
    if (isTl) {
        const id = resolveTlVoice(preferredTl);
        return { voice: id, xmlLang: voiceMeta(id).xmlLang };
    }
    if (isEses) {
        const id = resolveEsesVoice(preferredEses);
        return { voice: id, xmlLang: voiceMeta(id).xmlLang };
    }
    if (isEs) {
        const id = resolveEsVoice(preferredEs);
        return { voice: id, xmlLang: voiceMeta(id).xmlLang };
    }
    if (isVi) {
        const id = resolveViVoice(preferredVi);
        return { voice: id, xmlLang: voiceMeta(id).xmlLang };
    }
    if (isTh) {
        const id = resolveThVoice(preferredTh);
        return { voice: id, xmlLang: voiceMeta(id).xmlLang };
    }
    if (isLo) {
        const id = resolveLoVoice(preferredLo);
        return { voice: id, xmlLang: voiceMeta(id).xmlLang };
    }
    if (isKo) {
        const id = resolveKoVoice(preferredKo);
        return { voice: id, xmlLang: voiceMeta(id).xmlLang };
    }
    if (isJa) {
        const id = resolveJaVoice(preferredJa);
        return { voice: id, xmlLang: voiceMeta(id).xmlLang };
    }
    if (isId) {
        const id = resolveIdVoice(preferredId);
        return { voice: id, xmlLang: voiceMeta(id).xmlLang };
    }
    if (isMs) {
        const id = resolveMsVoice(preferredMs);
        return { voice: id, xmlLang: voiceMeta(id).xmlLang };
    }
    if (isPt) {
        const id = resolvePtVoice(preferredPt);
        return { voice: id, xmlLang: voiceMeta(id).xmlLang };
    }
    if (isFr) {
        const id = resolveFrVoice(preferredFr);
        return { voice: id, xmlLang: voiceMeta(id).xmlLang };
    }
    if (isHi) {
        const id = resolveHiVoice(preferredHi);
        return { voice: id, xmlLang: voiceMeta(id).xmlLang };
    }
    if (isKm) {
        const id = resolveKmVoice(preferredKm);
        return { voice: id, xmlLang: voiceMeta(id).xmlLang };
    }
    if (isMy) {
        const id = resolveMyVoice(preferredMy);
        return { voice: id, xmlLang: voiceMeta(id).xmlLang };
    }
    if (isJv) {
        const id = resolveJvVoice(preferredJv);
        return { voice: id, xmlLang: voiceMeta(id).xmlLang };
    }
    if (isIt) {
        const id = resolveItVoice(preferredIt);
        return { voice: id, xmlLang: voiceMeta(id).xmlLang };
    }
    if (isDe) {
        const id = resolveDeVoice(preferredDe);
        return { voice: id, xmlLang: voiceMeta(id).xmlLang };
    }
    if (isNl) {
        const id = resolveNlVoice(preferredNl);
        return { voice: id, xmlLang: voiceMeta(id).xmlLang };
    }
    if (isAr) {
        const id = resolveArVoice(preferredAr);
        return { voice: id, xmlLang: voiceMeta(id).xmlLang };
    }
    if (isArsa) {
        const id = resolveArsaVoice(preferredArsa);
        return { voice: id, xmlLang: voiceMeta(id).xmlLang };
    }
    const id = resolveYueVoice(preferredYue);
    return { voice: id, xmlLang: voiceMeta(id).xmlLang };
}
export const PREVIEW_YUE = '你好，歡迎使用粵譯。';
export const PREVIEW_EN = 'Hello — this is your English voice.';
export const PREVIEW_CMN = '你好，欢迎使用粤译。';
export const PREVIEW_WUU = '侬好，欢迎用沪语翻译。';
export const PREVIEW_SICHUAN = '你好，欢迎用四川话。';
export const PREVIEW_TL = 'Kumusta — ito ang Tagalog voice mo.';
export const PREVIEW_ES = 'Hola — esta es tu voz en español mexicano.';
export const PREVIEW_ESES = 'Hola, tío — esta es tu voz en español de España. ¡Mola!';
export const PREVIEW_VI = 'Xin chào — đây là giọng tiếng Việt của bạn.';
export const PREVIEW_TH = 'สวัสดี — นี่คือเสียงไทย';
export const PREVIEW_LO = 'ສະບາຍດີ — ນີ້ແມ່ນສຽງລາວ';
export const PREVIEW_KO = '안녕하세요 — 한국어 음성입니다.';
export const PREVIEW_JA = 'こんにちは — 日本語の音声です。';
export const PREVIEW_ID = 'Halo — ini suara Bahasa Indonesia Anda.';
export const PREVIEW_MS = 'Halo — ini suara Bahasa Melayu anda.';
export const PREVIEW_PT = 'Olá — esta é a sua voz em português do Brasil.';
export const PREVIEW_FR = 'Bonjour — voici votre voix en français.';
export const PREVIEW_HI = 'नमस्ते — यह आपकी हिंदी आवाज़ है।';
export const PREVIEW_KM = 'សួស្តី — នេះជាសំឡេងខ្មែររបស់អ្នក។';
export const PREVIEW_MY = 'မင်္ဂလာပါ — ဤသည်မှာ သင့်မြန်မာအသံဖြစ်သည်။';
export const PREVIEW_JV = 'Halo — iki swara Basa Jawa sampeyan.';
export const PREVIEW_IT = 'Ciao — questa è la tua voce in italiano.';
export const PREVIEW_DE = 'Hallo — das ist Ihre deutsche Stimme.';
export const PREVIEW_NL = 'Hallo — dit is je Nederlandse stem.';
export const PREVIEW_AR = 'أهلاً — ده صوتك بالعامية المصرية.';
export const PREVIEW_ARSA = 'مرحباً — هذا صوتك باللغة العربية الفصحى.';
