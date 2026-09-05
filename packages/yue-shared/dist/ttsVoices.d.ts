/** Curated Azure Neural TTS voices (API + web). */
export declare const DEFAULT_YUE_VOICE = "zh-HK-HiuMaanNeural";
export declare const DEFAULT_EN_VOICE = "en-US-JennyNeural";
export declare const DEFAULT_CMN_VOICE = "zh-CN-XiaoxiaoNeural";
export type YueVoiceId = 'zh-HK-HiuMaanNeural' | 'zh-HK-HiuGaaiNeural' | 'zh-HK-WanLungNeural';
export type EnVoiceId = 'en-US-JennyNeural' | 'en-US-GuyNeural' | 'en-US-AriaNeural' | 'en-GB-SoniaNeural' | 'en-GB-RyanNeural' | 'en-AU-NatashaNeural';
export type CmnVoiceId = 'zh-CN-XiaoxiaoNeural' | 'zh-CN-YunxiNeural';
export type TtsVoiceId = YueVoiceId | EnVoiceId | CmnVoiceId;
export type TtsVoiceOption = {
    id: TtsVoiceId;
    lang: 'yue' | 'en' | 'cmn';
    /** Azure SSML xml:lang */
    xmlLang: string;
    labelEn: string;
    labelZh: string;
    gender: 'female' | 'male';
};
export declare const YUE_VOICES: TtsVoiceOption[];
export declare const EN_VOICES: TtsVoiceOption[];
export declare const CMN_VOICES: TtsVoiceOption[];
export declare function isYueVoice(id: string): id is YueVoiceId;
export declare function isEnVoice(id: string): id is EnVoiceId;
export declare function isCmnVoice(id: string): id is CmnVoiceId;
export declare function resolveYueVoice(id: string | null | undefined): YueVoiceId;
export declare function resolveEnVoice(id: string | null | undefined): EnVoiceId;
export declare function resolveCmnVoice(id: string | null | undefined): CmnVoiceId;
export declare function voiceMeta(id: string): TtsVoiceOption | undefined;
/** Pick Azure voice + xml:lang for a speak request. */
export declare function resolveSpeakVoice(lang: string, preferredYue?: string | null, preferredEn?: string | null, preferredCmn?: string | null, override?: string | null): {
    voice: string;
    xmlLang: string;
};
export declare const PREVIEW_YUE = "\u4F60\u597D\uFF0C\u6B61\u8FCE\u4F7F\u7528\u7CB5\u8B6F\u3002";
export declare const PREVIEW_EN = "Hello \u2014 this is your English voice.";
export declare const PREVIEW_CMN = "\u4F60\u597D\uFF0C\u6B22\u8FCE\u4F7F\u7528\u7CA4\u8BD1\u3002";
//# sourceMappingURL=ttsVoices.d.ts.map