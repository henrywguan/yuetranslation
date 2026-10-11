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
/**
 * SSML `prosody volume` — Azure’s useful max boost is `+50%`.
 * Cantonese stays default (reference).
 */
export const TTS_EQUALIZE_VOLUME = {
    yue: null,
    en: '+50%',
    cmn: '+50%',
    wuu: '+50%',
    sichuan: '+50%',
    tl: '+50%',
    es: '+50%',
    eses: '+50%',
    vi: '+50%',
    th: '+50%',
    lo: '+50%',
    ko: '+50%',
    ja: '+50%',
    id: '+50%',
    ms: '+50%',
    pt: '+50%',
    fr: '+50%',
    hi: '+50%',
    km: '+50%',
    my: '+50%',
    jv: '+50%',
    it: '+50%',
    de: '+50%',
    nl: '+50%',
    ar: '+50%',
    arsa: '+50%',
};
/**
 * Extra Web Audio playback gain on top of SSML (1 = unity).
 * Anchors: English ~2× vs Yue (client 1.45 × SSML ≈ 2.0), Dutch ~3.2×
 * (client 2.25 × SSML). Other langs scaled by bass-band share on phone.
 */
export const TTS_EQUALIZE_PLAYBACK_GAIN = {
    yue: 1,
    en: 1.45,
    cmn: 2.1,
    wuu: 2.5,
    sichuan: 1.4,
    tl: 1.7,
    es: 2.0,
    eses: 1.65,
    vi: 2.0,
    th: 2.5,
    lo: 1.85,
    ko: 2.5,
    ja: 1.75,
    id: 2.5,
    ms: 2.3,
    pt: 1.15,
    fr: 1.95,
    hi: 2.05,
    km: 2.5,
    my: 2.5,
    jv: 2.45,
    it: 1.5,
    de: 2.1,
    nl: 2.25,
    ar: 1.15,
    arsa: 1.35,
};
/** Normalize API / client lang codes to an equalize key. */
export function equalizeLangKey(lang) {
    const l = (lang || '').trim().toLowerCase();
    if (!l || l === 'yue' || l === 'zh-hk' || l === 'zh-yue')
        return 'yue';
    if (l === 'en' || l.startsWith('en-'))
        return 'en';
    if (l === 'cmn' || l === 'zh-cn' || l === 'zh-hans')
        return 'cmn';
    if (l === 'wuu' || l === 'wuu-cn')
        return 'wuu';
    if (l === 'sichuan' || l === 'zh-cn-sichuan')
        return 'sichuan';
    if (l === 'tl' || l === 'fil' || l === 'fil-ph')
        return 'tl';
    if (l === 'eses' || l === 'es-es')
        return 'eses';
    if (l === 'es' || l === 'es-mx' || l === 'es-419')
        return 'es';
    if (l === 'vi' || l === 'vi-vn')
        return 'vi';
    if (l === 'th' || l === 'th-th')
        return 'th';
    if (l === 'lo' || l === 'lo-la')
        return 'lo';
    if (l === 'ko' || l === 'ko-kr')
        return 'ko';
    if (l === 'ja' || l === 'ja-jp')
        return 'ja';
    if (l === 'id' || l === 'id-id')
        return 'id';
    if (l === 'ms' || l === 'ms-my')
        return 'ms';
    if (l === 'pt' || l === 'pt-br')
        return 'pt';
    if (l === 'fr' || l === 'fr-fr')
        return 'fr';
    if (l === 'hi' || l === 'hi-in')
        return 'hi';
    if (l === 'km' || l === 'km-kh')
        return 'km';
    if (l === 'my' || l === 'my-mm')
        return 'my';
    if (l === 'jv' || l === 'jv-id')
        return 'jv';
    if (l === 'it' || l === 'it-it')
        return 'it';
    if (l === 'de' || l === 'de-de')
        return 'de';
    if (l === 'nl' || l === 'nl-nl')
        return 'nl';
    if (l === 'ar' || l === 'ar-eg')
        return 'ar';
    if (l === 'arsa' || l === 'ar-sa')
        return 'arsa';
    return null;
}
/** Azure SSML volume for normal (non–Practice-Partner) speak. */
export function ttsEqualizeVolumeAttr(lang) {
    const key = equalizeLangKey(lang);
    if (!key)
        return null;
    return TTS_EQUALIZE_VOLUME[key];
}
/** Client Web Audio gain for normal speak (1 when unknown / Yue). */
export function ttsEqualizePlaybackGain(lang) {
    const key = equalizeLangKey(lang);
    if (!key)
        return 1;
    const g = TTS_EQUALIZE_PLAYBACK_GAIN[key];
    return Number.isFinite(g) && g > 0 ? g : 1;
}
