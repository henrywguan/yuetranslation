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
export function voiceMeta(id) {
    return ALL.get(id);
}
/** Pick Azure voice + xml:lang for a speak request. */
export function resolveSpeakVoice(lang, preferredYue, preferredEn, preferredCmn, preferredWuu, preferredSichuan, preferredTl, preferredEs, override, preferredVi, preferredEses, preferredTh, preferredLo) {
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
