/**
 * Per-language Azure TTS loudness so other voices match Cantonese on phones.
 *
 * File RMS wrongly ranked Yue quietest. On-device (phone speaker) Yue is
 * loudest — Neural voices for En/Nl/etc. put more energy below ~500 Hz that
 * small speakers barely reproduce. Henry’s calibration (2026-10-11):
 * Cantonese loudest, English ~half, Dutch very soft at max volume.
 *
 * Azure relative `prosody volume` tops out at `+50%` (~+3 dB; `+100%`/`+200%`
 * are no stronger). Remaining boost is client Web Audio gain
 * (`TTS_EQUALIZE_PLAYBACK_GAIN`) because `HTMLAudioElement.volume` caps at 1.
 *
 * Re-band: `node` spectral probe in the equalize PR notes / artifacts.
 */
export type TtsEqualizeLang = 'yue' | 'en' | 'cmn' | 'wuu' | 'sichuan' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko' | 'ja' | 'id' | 'ms' | 'pt' | 'fr' | 'hi' | 'km' | 'my' | 'jv' | 'it' | 'de' | 'nl' | 'ar' | 'arsa';
/**
 * SSML `prosody volume` — Azure’s useful max boost is `+50%`.
 * Cantonese stays default (reference).
 */
export declare const TTS_EQUALIZE_VOLUME: Record<TtsEqualizeLang, string | null>;
/**
 * Extra Web Audio playback gain on top of SSML (1 = unity).
 * Anchors: English ~2× vs Yue (client 1.45 × SSML ≈ 2.0), Dutch ~3.2×
 * (client 2.25 × SSML). Other langs scaled by bass-band share on phone.
 */
export declare const TTS_EQUALIZE_PLAYBACK_GAIN: Record<TtsEqualizeLang, number>;
/** Normalize API / client lang codes to an equalize key. */
export declare function equalizeLangKey(lang: string): TtsEqualizeLang | null;
/** Azure SSML volume for normal (non–Practice-Partner) speak. */
export declare function ttsEqualizeVolumeAttr(lang: string): string | null;
/** Client Web Audio gain for normal speak (1 when unknown / Yue). */
export declare function ttsEqualizePlaybackGain(lang: string): number;
//# sourceMappingURL=ttsVolumeEqualize.d.ts.map