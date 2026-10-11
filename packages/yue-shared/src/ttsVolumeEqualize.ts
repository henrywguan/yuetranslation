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

export type TtsEqualizeLang =
  | 'yue'
  | 'en'
  | 'cmn'
  | 'wuu'
  | 'sichuan'
  | 'tl'
  | 'es'
  | 'eses'
  | 'vi'
  | 'th'
  | 'lo'
  | 'ko'
  | 'ja'
  | 'id'
  | 'ms'
  | 'pt'
  | 'fr'
  | 'hi'
  | 'km'
  | 'my'
  | 'jv'
  | 'it'
  | 'de'
  | 'nl'
  | 'ar'
  | 'arsa'

/** SSML volume attribute, or null when the default voice already matches Yue. */
export const TTS_EQUALIZE_VOLUME: Record<TtsEqualizeLang, string | null> = {
  yue: null,
  en: '-40%',
  cmn: '-40%',
  wuu: '-50%',
  sichuan: '-20%',
  tl: '-40%',
  es: '-40%',
  eses: '-20%',
  vi: '-50%',
  th: '-50%',
  lo: '-40%',
  ko: '-60%',
  ja: '-60%',
  id: '-20%',
  ms: '-40%',
  pt: '-40%',
  fr: '-20%',
  hi: '-50%',
  km: '-20%',
  my: null,
  jv: '-20%',
  it: '-20%',
  de: '-40%',
  nl: '-50%',
  ar: null,
  arsa: '-20%',
}

/** Normalize API / client lang codes to an equalize key. */
export function equalizeLangKey(lang: string): TtsEqualizeLang | null {
  const l = (lang || '').trim().toLowerCase()
  if (!l || l === 'yue' || l === 'zh-hk' || l === 'zh-yue') return 'yue'
  if (l === 'en' || l.startsWith('en-')) return 'en'
  if (l === 'cmn' || l === 'zh-cn' || l === 'zh-hans') return 'cmn'
  if (l === 'wuu' || l === 'wuu-cn') return 'wuu'
  if (l === 'sichuan' || l === 'zh-cn-sichuan') return 'sichuan'
  if (l === 'tl' || l === 'fil' || l === 'fil-ph') return 'tl'
  if (l === 'eses' || l === 'es-es') return 'eses'
  if (l === 'es' || l === 'es-mx' || l === 'es-419') return 'es'
  if (l === 'vi' || l === 'vi-vn') return 'vi'
  if (l === 'th' || l === 'th-th') return 'th'
  if (l === 'lo' || l === 'lo-la') return 'lo'
  if (l === 'ko' || l === 'ko-kr') return 'ko'
  if (l === 'ja' || l === 'ja-jp') return 'ja'
  if (l === 'id' || l === 'id-id') return 'id'
  if (l === 'ms' || l === 'ms-my') return 'ms'
  if (l === 'pt' || l === 'pt-br') return 'pt'
  if (l === 'fr' || l === 'fr-fr') return 'fr'
  if (l === 'hi' || l === 'hi-in') return 'hi'
  if (l === 'km' || l === 'km-kh') return 'km'
  if (l === 'my' || l === 'my-mm') return 'my'
  if (l === 'jv' || l === 'jv-id') return 'jv'
  if (l === 'it' || l === 'it-it') return 'it'
  if (l === 'de' || l === 'de-de') return 'de'
  if (l === 'nl' || l === 'nl-nl') return 'nl'
  if (l === 'ar' || l === 'ar-eg') return 'ar'
  if (l === 'arsa' || l === 'ar-sa') return 'arsa'
  return null
}

/** Azure SSML volume for normal (non–Practice-Partner) speak. */
export function ttsEqualizeVolumeAttr(lang: string): string | null {
  const key = equalizeLangKey(lang)
  if (!key) return null
  return TTS_EQUALIZE_VOLUME[key]
}
