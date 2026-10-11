/**
 * Per-language Azure SSML `prosody volume` so default Neural voices match
 * Cantonese (zh-HK-HiuMaanNeural) gated loudness.
 *
 * Measured 2026-10-11 (silence-gated RMS @ 16 kHz). Yue was the quietest;
 * others are attenuated with relative % volumes (dB offsets are rejected by
 * Azure; categorical `x-loud` is a no-op on these Neural voices).
 *
 * Re-run: `node apps/api/scripts/measure-tts-gated.mjs`
 */
export type TtsEqualizeLang = 'yue' | 'en' | 'cmn' | 'wuu' | 'sichuan' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko' | 'ja' | 'id' | 'ms' | 'pt' | 'fr' | 'hi' | 'km' | 'my' | 'jv' | 'it' | 'de' | 'nl' | 'ar' | 'arsa';
/** SSML volume attribute, or null when the default voice already matches Yue. */
export declare const TTS_EQUALIZE_VOLUME: Record<TtsEqualizeLang, string | null>;
/** Normalize API / client lang codes to an equalize key. */
export declare function equalizeLangKey(lang: string): TtsEqualizeLang | null;
/** Azure SSML volume for normal (non–Practice-Partner) speak. */
export declare function ttsEqualizeVolumeAttr(lang: string): string | null;
//# sourceMappingURL=ttsVolumeEqualize.d.ts.map