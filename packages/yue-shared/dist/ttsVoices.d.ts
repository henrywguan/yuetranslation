/** Curated Azure Neural TTS voices (API + web). */
export declare const DEFAULT_YUE_VOICE = "zh-HK-HiuMaanNeural";
export declare const DEFAULT_EN_VOICE = "en-US-JennyNeural";
export declare const DEFAULT_CMN_VOICE = "zh-CN-XiaoxiaoNeural";
/** Shanghainese (Wu) — Azure locale wuu-CN. */
export declare const DEFAULT_WUU_VOICE = "wuu-CN-XiaotongNeural";
export declare const DEFAULT_TL_VOICE = "fil-PH-BlessicaNeural";
export declare const DEFAULT_ES_VOICE = "es-MX-DaliaNeural";
export declare const DEFAULT_VI_VOICE = "vi-VN-HoaiMyNeural";
export type YueVoiceId = 'zh-HK-HiuMaanNeural' | 'zh-HK-HiuGaaiNeural' | 'zh-HK-WanLungNeural';
export type EnVoiceId = 'en-US-JennyNeural' | 'en-US-GuyNeural' | 'en-US-AriaNeural' | 'en-GB-SoniaNeural' | 'en-GB-RyanNeural' | 'en-AU-NatashaNeural';
export type CmnVoiceId = 'zh-CN-XiaoxiaoNeural' | 'zh-CN-YunxiNeural';
export type WuuVoiceId = 'wuu-CN-XiaotongNeural' | 'wuu-CN-YunzheNeural';
export type TlVoiceId = 'fil-PH-BlessicaNeural' | 'fil-PH-AngeloNeural';
export type EsVoiceId = 'es-MX-DaliaNeural' | 'es-MX-JorgeNeural';
export type ViVoiceId = 'vi-VN-HoaiMyNeural' | 'vi-VN-NamMinhNeural';
export type TtsVoiceId = YueVoiceId | EnVoiceId | CmnVoiceId | WuuVoiceId | TlVoiceId | EsVoiceId | ViVoiceId;
export type TtsVoiceOption = {
    id: TtsVoiceId;
    lang: 'yue' | 'en' | 'cmn' | 'wuu' | 'tl' | 'es' | 'vi';
    /** Azure SSML xml:lang */
    xmlLang: string;
    labelEn: string;
    labelZh: string;
    gender: 'female' | 'male';
};
export declare const YUE_VOICES: TtsVoiceOption[];
export declare const EN_VOICES: TtsVoiceOption[];
export declare const TL_VOICES: TtsVoiceOption[];
export declare const ES_VOICES: TtsVoiceOption[];
export declare const VI_VOICES: TtsVoiceOption[];
export declare const CMN_VOICES: TtsVoiceOption[];
export declare const WUU_VOICES: TtsVoiceOption[];
export declare function isYueVoice(id: string): id is YueVoiceId;
export declare function isEnVoice(id: string): id is EnVoiceId;
export declare function isCmnVoice(id: string): id is CmnVoiceId;
export declare function isWuuVoice(id: string): id is WuuVoiceId;
export declare function isTlVoice(id: string): id is TlVoiceId;
export declare function isEsVoice(id: string): id is EsVoiceId;
export declare function isViVoice(id: string): id is ViVoiceId;
export declare function resolveYueVoice(id: string | null | undefined): YueVoiceId;
export declare function resolveEnVoice(id: string | null | undefined): EnVoiceId;
export declare function resolveCmnVoice(id: string | null | undefined): CmnVoiceId;
export declare function resolveWuuVoice(id: string | null | undefined): WuuVoiceId;
export declare function resolveTlVoice(id: string | null | undefined): TlVoiceId;
export declare function resolveEsVoice(id: string | null | undefined): EsVoiceId;
export declare function resolveViVoice(id: string | null | undefined): ViVoiceId;
export declare function voiceMeta(id: string): TtsVoiceOption | undefined;
/** Pick Azure voice + xml:lang for a speak request. */
export declare function resolveSpeakVoice(lang: string, preferredYue?: string | null, preferredEn?: string | null, preferredCmn?: string | null, preferredWuu?: string | null, preferredTl?: string | null, preferredEs?: string | null, override?: string | null, preferredVi?: string | null): {
    voice: string;
    xmlLang: string;
};
export declare const PREVIEW_YUE = "\u4F60\u597D\uFF0C\u6B61\u8FCE\u4F7F\u7528\u7CB5\u8B6F\u3002";
export declare const PREVIEW_EN = "Hello \u2014 this is your English voice.";
export declare const PREVIEW_CMN = "\u4F60\u597D\uFF0C\u6B22\u8FCE\u4F7F\u7528\u7CA4\u8BD1\u3002";
export declare const PREVIEW_WUU = "\u4FAC\u597D\uFF0C\u6B22\u8FCE\u7528\u6CAA\u8BED\u7FFB\u8BD1\u3002";
export declare const PREVIEW_TL = "Kumusta \u2014 ito ang Tagalog voice mo.";
export declare const PREVIEW_ES = "Hola \u2014 esta es tu voz en espa\u00F1ol mexicano.";
export declare const PREVIEW_VI = "Xin ch\u00E0o \u2014 \u0111\u00E2y l\u00E0 gi\u1ECDng ti\u1EBFng Vi\u1EC7t c\u1EE7a b\u1EA1n.";
//# sourceMappingURL=ttsVoices.d.ts.map