import { stopSpeaking } from './tts'
import { createEchoGuard } from './echoGuard'
import { isAppleTouchDevice } from './mediaAccess'
import type { Lang, LiveSession, SpeechEventHandlers } from './types'

/** After this many silent no-speech ends on desktop, stop instead of restarting forever. */
const MAX_EMPTY_RESTARTS = 2

export type WebSpeechSessionOptions = {
  /**
   * Practice Partner: accept Cantonese *or* English in one mic turn.
   * Starts on zh-HK; empty Safari restarts alternate to en-US (and back)
   * until speech is heard, then stays on that locale for the turn.
   */
  bilingualYueEn?: boolean
}

export function createWebSpeechSession(
  handlers: SpeechEventHandlers,
  lockLang?: Lang,
  opts?: WebSpeechSessionOptions,
): LiveSession | null {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) return null
  let recognition: SpeechRecognition | null = null
  let stopped = true
  let activeLang: Lang = lockLang || 'en'
  let emptyRestarts = 0
  let heardSpeech = false
  let yueLocaleIndex = 0
  let cmnLocaleIndex = 0
  let wuuLocaleIndex = 0
  let sichuanLocaleIndex = 0
  let tlLocaleIndex = 0
  let esLocaleIndex = 0
  let esesLocaleIndex = 0
  let viLocaleIndex = 0
  let thLocaleIndex = 0
  let loLocaleIndex = 0
  let koLocaleIndex = 0
  let jaLocaleIndex = 0
  let idLocaleIndex = 0
  let msLocaleIndex = 0
  let ptLocaleIndex = 0
  let frLocaleIndex = 0
  let hiLocaleIndex = 0
  let kmLocaleIndex = 0
  let myLocaleIndex = 0
  let jvLocaleIndex = 0
  let itLocaleIndex = 0
  let deLocaleIndex = 0
  let nlLocaleIndex = 0
  let arLocaleIndex = 0
  let arsaLocaleIndex = 0
  let taLocaleIndex = 0
  let ptptLocaleIndex = 0
  let trLocaleIndex = 0
  let bnLocaleIndex = 0
  let teLocaleIndex = 0
  let guLocaleIndex = 0
  let knLocaleIndex = 0
  let plLocaleIndex = 0
  let roLocaleIndex = 0
  let csLocaleIndex = 0
  let elLocaleIndex = 0
  let huLocaleIndex = 0
  let svLocaleIndex = 0
  let ruLocaleIndex = 0
  let ukLocaleIndex = 0
  let heLocaleIndex = 0
  let faLocaleIndex = 0
  let urLocaleIndex = 0
  let mlLocaleIndex = 0
  let mrLocaleIndex = 0
  let paLocaleIndex = 0
  let orLocaleIndex = 0
  let siLocaleIndex = 0
  let neLocaleIndex = 0
  let daLocaleIndex = 0
  let nbLocaleIndex = 0
  let fiLocaleIndex = 0
  let skLocaleIndex = 0
  let hrLocaleIndex = 0
  let caLocaleIndex = 0
  let azLocaleIndex = 0
  let kkLocaleIndex = 0
  let uzLocaleIndex = 0
  let bgLocaleIndex = 0
  let srLocaleIndex = 0
  let swLocaleIndex = 0
  let afLocaleIndex = 0
  let etLocaleIndex = 0
  let lvLocaleIndex = 0
  let ltLocaleIndex = 0
  let gaLocaleIndex = 0
  let cyLocaleIndex = 0
  let euLocaleIndex = 0
  let glLocaleIndex = 0
  let mtLocaleIndex = 0
  let isLocaleIndex = 0
  let bsLocaleIndex = 0
  let sqLocaleIndex = 0
  let zuLocaleIndex = 0
  let soLocaleIndex = 0
  let asLocaleIndex = 0
  let mkLocaleIndex = 0
  let mnLocaleIndex = 0
  let psLocaleIndex = 0
  let hyLocaleIndex = 0
  let kaLocaleIndex = 0
  let amLocaleIndex = 0
  const bilingualYueEn = Boolean(opts?.bilingualYueEn)
  const echo = createEchoGuard()
  const apple = isAppleTouchDevice()
  // zh-HK is primary; rotate fallbacks when the browser rejects Cantonese.
  const yueLocales = ['zh-HK', 'yue-HK', 'yue-Hant-HK', 'zh-TW']
  const cmnLocales = ['zh-CN', 'zh-Hans-CN', 'cmn-Hans-CN', 'zh']
  const wuuLocales = ['wuu-CN', 'zh-CN']
  const sichuanLocales = ['zh-CN-sichuan', 'zh-CN']
  const tlLocales = ['fil-PH', 'tl-PH', 'fil']
  const esLocales = ['es-MX', 'es-US', 'es']
  /** Peninsular Spanish (Spain) — Web Speech like es/vi, never Azure fixed-locale. */
  const esesLocales = ['es-ES', 'es']
  const viLocales = ['vi-VN', 'vi']
  const thLocales = ['th-TH', 'th']
  const loLocales = ['lo-LA', 'lo']
  const koLocales = ['ko-KR', 'ko']
  const jaLocales = ['ja-JP', 'ja']
  const idLocales = ['id-ID', 'id']
  const msLocales = ['ms-MY', 'ms']
  const ptLocales = ['pt-BR', 'pt']
  const frLocales = ['fr-FR', 'fr']
  const hiLocales = ['hi-IN', 'hi']
  const kmLocales = ['km-KH', 'km']
  const myLocales = ['my-MM', 'my']
  const jvLocales = ['jv-ID', 'jv']
  const itLocales = ['it-IT', 'it']
  const deLocales = ['de-DE', 'de']
  const nlLocales = ['nl-NL', 'nl']
  // Bare `ar` is a generic Web Speech tag fallback only; ar-EG and ar-SA never swap.
  const arLocales = ['ar-EG', 'ar']
  const arsaLocales = ['ar-SA', 'ar']
  const taLocales = ['ta-IN', 'ta']
  // European Portuguese pane stays `ptpt`; bare `pt` is only a Web Speech tag fallback (never pt-BR).
  const ptptLocales = ['pt-PT', 'pt']
  const trLocales = ['tr-TR', 'tr']
  const bnLocales = ['bn-IN', 'bn']
  const teLocales = ['te-IN', 'te']
  const guLocales = ['gu-IN', 'gu']
  const knLocales = ['kn-IN', 'kn']
  const plLocales = ['pl-PL', 'pl']
  const roLocales = ['ro-RO', 'ro']
  const csLocales = ['cs-CZ', 'cs']
  const elLocales = ['el-GR', 'el']
  const huLocales = ['hu-HU', 'hu']
  const svLocales = ['sv-SE', 'sv']
  const ruLocales = ['ru-RU', 'ru']
  const ukLocales = ['uk-UA', 'uk']
  const heLocales = ['he-IL', 'he']
  const faLocales = ['fa-IR', 'fa']
  const urLocales = ['ur-IN', 'ur']
  const mlLocales = ['ml-IN', 'ml']
  const mrLocales = ['mr-IN', 'mr']
  const paLocales = ['pa-IN', 'pa']
  const orLocales = ['or-IN', 'or']
  const siLocales = ['si-LK', 'si']
  const neLocales = ['ne-NP', 'ne']
  const daLocales = ['da-DK', 'da']
  const nbLocales = ['nb-NO', 'nb']
  const fiLocales = ['fi-FI', 'fi']
  const skLocales = ['sk-SK', 'sk']
  const hrLocales = ['hr-HR', 'hr']
  const caLocales = ['ca-ES', 'ca']
  const azLocales = ['az-AZ', 'az']
  const kkLocales = ['kk-KZ', 'kk']
  const uzLocales = ['uz-UZ', 'uz']
  const bgLocales = ['bg-BG', 'bg']
  const srLocales = ['sr-RS', 'sr']
  const swLocales = ['sw-KE', 'sw']
  const afLocales = ['af-ZA', 'af']
  const etLocales = ['et-EE', 'et']
  const lvLocales = ['lv-LV', 'lv']
  const ltLocales = ['lt-LT', 'lt']
  const gaLocales = ['ga-IE', 'ga']
  const cyLocales = ['cy-GB', 'cy']
  const euLocales = ['eu-ES', 'eu']
  const glLocales = ['gl-ES', 'gl']
  const mtLocales = ['mt-MT', 'mt']
  const isLocales = ['is-IS', 'is']
  const bsLocales = ['bs-BA', 'bs']
  const sqLocales = ['sq-AL', 'sq']
  const zuLocales = ['zu-ZA', 'zu']
  const soLocales = ['so-SO', 'so']
  const asLocales = ['as-IN', 'as']
  const mkLocales = ['mk-MK', 'mk']
  const mnLocales = ['mn-MN', 'mn']
  const psLocales = ['ps-AF', 'ps']
  const hyLocales = ['hy-AM', 'hy']
  const kaLocales = ['ka-GE', 'ka']
  const amLocales = ['am-ET', 'am']

  const yueLocale = () => yueLocales[yueLocaleIndex % yueLocales.length]
  const cmnLocale = () => cmnLocales[cmnLocaleIndex % cmnLocales.length]
  const wuuLocale = () => wuuLocales[wuuLocaleIndex % wuuLocales.length]
  const sichuanLocale = () => sichuanLocales[sichuanLocaleIndex % sichuanLocales.length]
  const tlLocale = () => tlLocales[tlLocaleIndex % tlLocales.length]
  const esLocale = () => esLocales[esLocaleIndex % esLocales.length]
  const esesLocale = () => esesLocales[esesLocaleIndex % esesLocales.length]
  const viLocale = () => viLocales[viLocaleIndex % viLocales.length]
  const thLocale = () => thLocales[thLocaleIndex % thLocales.length]
  const loLocale = () => loLocales[loLocaleIndex % loLocales.length]
  const koLocale = () => koLocales[koLocaleIndex % koLocales.length]
  const jaLocale = () => jaLocales[jaLocaleIndex % jaLocales.length]
  const idLocale = () => idLocales[idLocaleIndex % idLocales.length]
  const msLocale = () => msLocales[msLocaleIndex % msLocales.length]
  const ptLocale = () => ptLocales[ptLocaleIndex % ptLocales.length]
  const frLocale = () => frLocales[frLocaleIndex % frLocales.length]
  const hiLocale = () => hiLocales[hiLocaleIndex % hiLocales.length]
  const kmLocale = () => kmLocales[kmLocaleIndex % kmLocales.length]
  const myLocale = () => myLocales[myLocaleIndex % myLocales.length]
  const jvLocale = () => jvLocales[jvLocaleIndex % jvLocales.length]
  const itLocale = () => itLocales[itLocaleIndex % itLocales.length]
  const deLocale = () => deLocales[deLocaleIndex % deLocales.length]
  const nlLocale = () => nlLocales[nlLocaleIndex % nlLocales.length]
  const arLocale = () => arLocales[arLocaleIndex % arLocales.length]
  const arsaLocale = () => arsaLocales[arsaLocaleIndex % arsaLocales.length]
  const taLocale = () => taLocales[taLocaleIndex % taLocales.length]
  const ptptLocale = () => ptptLocales[ptptLocaleIndex % ptptLocales.length]
  const trLocale = () => trLocales[trLocaleIndex % trLocales.length]
  const bnLocale = () => bnLocales[bnLocaleIndex % bnLocales.length]
  const teLocale = () => teLocales[teLocaleIndex % teLocales.length]
  const guLocale = () => guLocales[guLocaleIndex % guLocales.length]
  const knLocale = () => knLocales[knLocaleIndex % knLocales.length]
  const plLocale = () => plLocales[plLocaleIndex % plLocales.length]
  const roLocale = () => roLocales[roLocaleIndex % roLocales.length]
  const csLocale = () => csLocales[csLocaleIndex % csLocales.length]
  const elLocale = () => elLocales[elLocaleIndex % elLocales.length]
  const huLocale = () => huLocales[huLocaleIndex % huLocales.length]
  const svLocale = () => svLocales[svLocaleIndex % svLocales.length]
  const ruLocale = () => ruLocales[ruLocaleIndex % ruLocales.length]
  const ukLocale = () => ukLocales[ukLocaleIndex % ukLocales.length]
  const heLocale = () => heLocales[heLocaleIndex % heLocales.length]
  const faLocale = () => faLocales[faLocaleIndex % faLocales.length]
  const urLocale = () => urLocales[urLocaleIndex % urLocales.length]
  const mlLocale = () => mlLocales[mlLocaleIndex % mlLocales.length]
  const mrLocale = () => mrLocales[mrLocaleIndex % mrLocales.length]
  const paLocale = () => paLocales[paLocaleIndex % paLocales.length]
  const orLocale = () => orLocales[orLocaleIndex % orLocales.length]
  const siLocale = () => siLocales[siLocaleIndex % siLocales.length]
  const neLocale = () => neLocales[neLocaleIndex % neLocales.length]
  const daLocale = () => daLocales[daLocaleIndex % daLocales.length]
  const nbLocale = () => nbLocales[nbLocaleIndex % nbLocales.length]
  const fiLocale = () => fiLocales[fiLocaleIndex % fiLocales.length]
  const skLocale = () => skLocales[skLocaleIndex % skLocales.length]
  const hrLocale = () => hrLocales[hrLocaleIndex % hrLocales.length]
  const caLocale = () => caLocales[caLocaleIndex % caLocales.length]
  const azLocale = () => azLocales[azLocaleIndex % azLocales.length]
  const kkLocale = () => kkLocales[kkLocaleIndex % kkLocales.length]
  const uzLocale = () => uzLocales[uzLocaleIndex % uzLocales.length]
  const bgLocale = () => bgLocales[bgLocaleIndex % bgLocales.length]
  const srLocale = () => srLocales[srLocaleIndex % srLocales.length]
  const swLocale = () => swLocales[swLocaleIndex % swLocales.length]
  const afLocale = () => afLocales[afLocaleIndex % afLocales.length]
  const etLocale = () => etLocales[etLocaleIndex % etLocales.length]
  const lvLocale = () => lvLocales[lvLocaleIndex % lvLocales.length]
  const ltLocale = () => ltLocales[ltLocaleIndex % ltLocales.length]
  const gaLocale = () => gaLocales[gaLocaleIndex % gaLocales.length]
  const cyLocale = () => cyLocales[cyLocaleIndex % cyLocales.length]
  const euLocale = () => euLocales[euLocaleIndex % euLocales.length]
  const glLocale = () => glLocales[glLocaleIndex % glLocales.length]
  const mtLocale = () => mtLocales[mtLocaleIndex % mtLocales.length]
  const isLocale = () => isLocales[isLocaleIndex % isLocales.length]
  const bsLocale = () => bsLocales[bsLocaleIndex % bsLocales.length]
  const sqLocale = () => sqLocales[sqLocaleIndex % sqLocales.length]
  const zuLocale = () => zuLocales[zuLocaleIndex % zuLocales.length]
  const soLocale = () => soLocales[soLocaleIndex % soLocales.length]
  const asLocale = () => asLocales[asLocaleIndex % asLocales.length]
  const mkLocale = () => mkLocales[mkLocaleIndex % mkLocales.length]
  const mnLocale = () => mnLocales[mnLocaleIndex % mnLocales.length]
  const psLocale = () => psLocales[psLocaleIndex % psLocales.length]
  const hyLocale = () => hyLocales[hyLocaleIndex % hyLocales.length]
  const kaLocale = () => kaLocales[kaLocaleIndex % kaLocales.length]
  const amLocale = () => amLocales[amLocaleIndex % amLocales.length]

  const resolveRecLang = (): string => {
    if (bilingualYueEn && activeLang === 'en') return 'en-US'
    if (activeLang === 'yue') return yueLocale()
    if (activeLang === 'cmn') return cmnLocale()
    if (activeLang === 'wuu') return wuuLocale()
    if (activeLang === 'sichuan') return sichuanLocale()
    if (activeLang === 'tl') return tlLocale()
    if (activeLang === 'es') return esLocale()
    if (activeLang === 'eses') return esesLocale()
    if (activeLang === 'vi') return viLocale()
    if (activeLang === 'th') return thLocale()
    if (activeLang === 'lo') return loLocale()
    if (activeLang === 'ko') return koLocale()
    if (activeLang === 'ja') return jaLocale()
    if (activeLang === 'id') return idLocale()
    if (activeLang === 'ms') return msLocale()
    if (activeLang === 'pt') return ptLocale()
    if (activeLang === 'fr') return frLocale()
    if (activeLang === 'hi') return hiLocale()
    if (activeLang === 'km') return kmLocale()
    if (activeLang === 'my') return myLocale()
    if (activeLang === 'jv') return jvLocale()
    if (activeLang === 'it') return itLocale()
    if (activeLang === 'de') return deLocale()
    if (activeLang === 'nl') return nlLocale()
    if (activeLang === 'ar') return arLocale()
    if (activeLang === 'arsa') return arsaLocale()
    if (activeLang === 'ta') return taLocale()
    if (activeLang === 'ptpt') return ptptLocale()
    if (activeLang === 'tr') return trLocale()
    if (activeLang === 'bn') return bnLocale()
    if (activeLang === 'te') return teLocale()
    if (activeLang === 'gu') return guLocale()
    if (activeLang === 'kn') return knLocale()
    if (activeLang === 'pl') return plLocale()
    if (activeLang === 'ro') return roLocale()
    if (activeLang === 'cs') return csLocale()
    if (activeLang === 'el') return elLocale()
    if (activeLang === 'hu') return huLocale()
    if (activeLang === 'sv') return svLocale()
    if (activeLang === 'ru') return ruLocale()
    if (activeLang === 'uk') return ukLocale()
    if (activeLang === 'he') return heLocale()
    if (activeLang === 'fa') return faLocale()
    if (activeLang === 'ur') return urLocale()
    if (activeLang === 'ml') return mlLocale()
    if (activeLang === 'mr') return mrLocale()
    if (activeLang === 'pa') return paLocale()
    if (activeLang === 'or') return orLocale()
    if (activeLang === 'si') return siLocale()
    if (activeLang === 'ne') return neLocale()
    if (activeLang === 'da') return daLocale()
    if (activeLang === 'nb') return nbLocale()
    if (activeLang === 'fi') return fiLocale()
    if (activeLang === 'sk') return skLocale()
    if (activeLang === 'hr') return hrLocale()
    if (activeLang === 'ca') return caLocale()
    if (activeLang === 'az') return azLocale()
    if (activeLang === 'kk') return kkLocale()
    if (activeLang === 'uz') return uzLocale()
    if (activeLang === 'bg') return bgLocale()
    if (activeLang === 'sr') return srLocale()
    if (activeLang === 'sw') return swLocale()
    if (activeLang === 'af') return afLocale()
    if (activeLang === 'et') return etLocale()
    if (activeLang === 'lv') return lvLocale()
    if (activeLang === 'lt') return ltLocale()
    if (activeLang === 'ga') return gaLocale()
    if (activeLang === 'cy') return cyLocale()
    if (activeLang === 'eu') return euLocale()
    if (activeLang === 'gl') return glLocale()
    if (activeLang === 'mt') return mtLocale()
    if (activeLang === 'is') return isLocale()
    if (activeLang === 'bs') return bsLocale()
    if (activeLang === 'sq') return sqLocale()
    if (activeLang === 'zu') return zuLocale()
    if (activeLang === 'so') return soLocale()
    if (activeLang === 'as') return asLocale()
    if (activeLang === 'mk') return mkLocale()
    if (activeLang === 'mn') return mnLocale()
    if (activeLang === 'ps') return psLocale()
    if (activeLang === 'hy') return hyLocale()
    if (activeLang === 'ka') return kaLocale()
    if (activeLang === 'am') return amLocale()
    return 'en-US'
  }

  const startOne = () => {
    if (stopped) return
    const rec = new SR()
    recognition = rec
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.lang = resolveRecLang()
    rec.onresult = (event) => {
      let interim = ''
      let finalText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i]
        const t = r[0]?.transcript || ''
        if (r.isFinal) finalText += t
        else interim += t
      }
      if (echo.shouldIgnoreMic()) return
      if (interim.trim() || finalText.trim()) {
        heardSpeech = true
        emptyRestarts = 0
      }
      if (interim.trim()) handlers.onInterim(activeLang, interim.trim())
      if (finalText.trim()) {
        handlers.onFinal(activeLang, finalText.trim())
        // Don't flip languages mid-turn on mobile — it drops the next utterance.
        // Bilingual Practice Partner also stays put once speech was heard.
        if (!lockLang && !apple && !bilingualYueEn) activeLang = activeLang === 'en' ? 'yue' : 'en'
      }
    }
    rec.onerror = (e) => {
      if (e.error === 'aborted') return
      if (e.error === 'no-speech') {
        // iOS often fires no-speech then onend; restart is handled in onend.
        return
      }
      // Safari often returns service-not-allowed (not language-not-supported)
      // for locales it cannot recognize (e.g. fil-PH Tagalog).
      const localeRejected =
        e.error === 'language-not-supported' || e.error === 'service-not-allowed'
      if (localeRejected && bilingualYueEn && !heardSpeech) {
        activeLang = activeLang === 'en' ? 'yue' : 'en'
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'yue' && yueLocaleIndex < yueLocales.length - 1) {
        yueLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'cmn' && cmnLocaleIndex < cmnLocales.length - 1) {
        cmnLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'wuu' && wuuLocaleIndex < wuuLocales.length - 1) {
        wuuLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (
        localeRejected &&
        activeLang === 'sichuan' &&
        sichuanLocaleIndex < sichuanLocales.length - 1
      ) {
        sichuanLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'tl' && tlLocaleIndex < tlLocales.length - 1) {
        tlLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'es' && esLocaleIndex < esLocales.length - 1) {
        esLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'eses' && esesLocaleIndex < esesLocales.length - 1) {
        esesLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'vi' && viLocaleIndex < viLocales.length - 1) {
        viLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'th' && thLocaleIndex < thLocales.length - 1) {
        thLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'lo' && loLocaleIndex < loLocales.length - 1) {
        loLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'ko' && koLocaleIndex < koLocales.length - 1) {
        koLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'ja' && jaLocaleIndex < jaLocales.length - 1) {
        jaLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'id' && idLocaleIndex < idLocales.length - 1) {
        idLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'ms' && msLocaleIndex < msLocales.length - 1) {
        msLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'pt' && ptLocaleIndex < ptLocales.length - 1) {
        ptLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'fr' && frLocaleIndex < frLocales.length - 1) {
        frLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'hi' && hiLocaleIndex < hiLocales.length - 1) {
        hiLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'km' && kmLocaleIndex < kmLocales.length - 1) {
        kmLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'my' && myLocaleIndex < myLocales.length - 1) {
        myLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'jv' && jvLocaleIndex < jvLocales.length - 1) {
        jvLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'it' && itLocaleIndex < itLocales.length - 1) {
        itLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'de' && deLocaleIndex < deLocales.length - 1) {
        deLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'nl' && nlLocaleIndex < nlLocales.length - 1) {
        nlLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'ar' && arLocaleIndex < arLocales.length - 1) {
        arLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'arsa' && arsaLocaleIndex < arsaLocales.length - 1) {
        arsaLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'ta' && taLocaleIndex < taLocales.length - 1) {
        taLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'ptpt' && ptptLocaleIndex < ptptLocales.length - 1) {
        ptptLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'tr' && trLocaleIndex < trLocales.length - 1) {
        trLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'bn' && bnLocaleIndex < bnLocales.length - 1) {
        bnLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'te' && teLocaleIndex < teLocales.length - 1) {
        teLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'gu' && guLocaleIndex < guLocales.length - 1) {
        guLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'kn' && knLocaleIndex < knLocales.length - 1) {
        knLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'pl' && plLocaleIndex < plLocales.length - 1) {
        plLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'ro' && roLocaleIndex < roLocales.length - 1) {
        roLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'cs' && csLocaleIndex < csLocales.length - 1) {
        csLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'el' && elLocaleIndex < elLocales.length - 1) {
        elLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'hu' && huLocaleIndex < huLocales.length - 1) {
        huLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'sv' && svLocaleIndex < svLocales.length - 1) {
        svLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'ru' && ruLocaleIndex < ruLocales.length - 1) {
        ruLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'uk' && ukLocaleIndex < ukLocales.length - 1) {
        ukLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'he' && heLocaleIndex < heLocales.length - 1) {
        heLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'fa' && faLocaleIndex < faLocales.length - 1) {
        faLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'ur' && urLocaleIndex < urLocales.length - 1) {
        urLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'ml' && mlLocaleIndex < mlLocales.length - 1) {
        mlLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'mr' && mrLocaleIndex < mrLocales.length - 1) {
        mrLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'pa' && paLocaleIndex < paLocales.length - 1) {
        paLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'or' && orLocaleIndex < orLocales.length - 1) {
        orLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'si' && siLocaleIndex < siLocales.length - 1) {
        siLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'ne' && neLocaleIndex < neLocales.length - 1) {
        neLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'da' && daLocaleIndex < daLocales.length - 1) {
        daLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'nb' && nbLocaleIndex < nbLocales.length - 1) {
        nbLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'fi' && fiLocaleIndex < fiLocales.length - 1) {
        fiLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'sk' && skLocaleIndex < skLocales.length - 1) {
        skLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'hr' && hrLocaleIndex < hrLocales.length - 1) {
        hrLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'ca' && caLocaleIndex < caLocales.length - 1) {
        caLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'az' && azLocaleIndex < azLocales.length - 1) {
        azLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'kk' && kkLocaleIndex < kkLocales.length - 1) {
        kkLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'uz' && uzLocaleIndex < uzLocales.length - 1) {
        uzLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'bg' && bgLocaleIndex < bgLocales.length - 1) {
        bgLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'sr' && srLocaleIndex < srLocales.length - 1) {
        srLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'sw' && swLocaleIndex < swLocales.length - 1) {
        swLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'af' && afLocaleIndex < afLocales.length - 1) {
        afLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'et' && etLocaleIndex < etLocales.length - 1) {
        etLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'lv' && lvLocaleIndex < lvLocales.length - 1) {
        lvLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'lt' && ltLocaleIndex < ltLocales.length - 1) {
        ltLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'ga' && gaLocaleIndex < gaLocales.length - 1) {
        gaLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'cy' && cyLocaleIndex < cyLocales.length - 1) {
        cyLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'eu' && euLocaleIndex < euLocales.length - 1) {
        euLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'gl' && glLocaleIndex < glLocales.length - 1) {
        glLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'mt' && mtLocaleIndex < mtLocales.length - 1) {
        mtLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'is' && isLocaleIndex < isLocales.length - 1) {
        isLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'bs' && bsLocaleIndex < bsLocales.length - 1) {
        bsLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'sq' && sqLocaleIndex < sqLocales.length - 1) {
        sqLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'zu' && zuLocaleIndex < zuLocales.length - 1) {
        zuLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'so' && soLocaleIndex < soLocales.length - 1) {
        soLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'as' && asLocaleIndex < asLocales.length - 1) {
        asLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'mk' && mkLocaleIndex < mkLocales.length - 1) {
        mkLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'mn' && mnLocaleIndex < mnLocales.length - 1) {
        mnLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'ps' && psLocaleIndex < psLocales.length - 1) {
        psLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'hy' && hyLocaleIndex < hyLocales.length - 1) {
        hyLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'ka' && kaLocaleIndex < kaLocales.length - 1) {
        kaLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (localeRejected && activeLang === 'am' && amLocaleIndex < amLocales.length - 1) {
        amLocaleIndex += 1
        queueMicrotask(() => startOne())
        return
      }
      if (e.error === 'not-allowed') {
        stopped = true
        handlers.onError('Microphone permission denied. Allow mic access and try again.')
        return
      }
      if (e.error === 'service-not-allowed' || e.error === 'language-not-supported') {
        stopped = true
        handlers.onError(
          activeLang === 'tl'
            ? 'Tagalog speech recognition is not available in this browser. Try again on a network that can reach live speech, or use another device.'
            : 'Speech recognition is not available for this language here. Try again or switch language.',
        )
        return
      }
      handlers.onError(e.error)
    }
    rec.onend = () => {
      if (stopped) {
        handlers.onStatus('idle')
        return
      }
      // iOS tap-to-talk (every language): Safari often fires onend before the
      // user speaks. The store’s 7s silence timer / second tap ends the turn —
      // do not kill listening after two empty restarts (button flipped back to
      // “hold or tap” while the orange Safari mic stayed on).
      if (!heardSpeech) {
        emptyRestarts += 1
        if (bilingualYueEn) {
          // Alternate Yue ↔ English so English answers still get interim STT.
          activeLang = activeLang === 'en' ? 'yue' : 'en'
        } else if (activeLang === 'yue' && yueLocaleIndex < yueLocales.length - 1) {
          yueLocaleIndex += 1
        }
        if (activeLang === 'cmn' && cmnLocaleIndex < cmnLocales.length - 1) {
          cmnLocaleIndex += 1
        }
        if (!apple && emptyRestarts > MAX_EMPTY_RESTARTS) {
          stopped = true
          recognition = null
          handlers.onError(
            'No speech detected. Tap the mic again, speak closer to the phone, and check mic permission.',
          )
          handlers.onStatus('idle')
          return
        }
      }
      try {
        startOne()
      } catch {
        stopped = true
        handlers.onStatus('idle')
      }
    }
    try {
      rec.start()
      handlers.onStatus('listening')
    } catch (err) {
      handlers.onError(String(err))
    }
  }

  return {
    setPlaybackActive(a) {
      echo.setPlaybackActive(a)
    },
    /**
     * Starts recognition. On Apple devices this MUST run in the same turn as a
     * user gesture (before any await) or Safari starts “listening” with no audio.
     */
    async start() {
      stopped = false
      emptyRestarts = 0
      heardSpeech = false
      activeLang = lockLang || (bilingualYueEn ? 'yue' : 'en')
      yueLocaleIndex = 0
      cmnLocaleIndex = 0
      wuuLocaleIndex = 0
      sichuanLocaleIndex = 0
      tlLocaleIndex = 0
      esLocaleIndex = 0
      esesLocaleIndex = 0
      viLocaleIndex = 0
      thLocaleIndex = 0
      loLocaleIndex = 0
      koLocaleIndex = 0
      jaLocaleIndex = 0
      idLocaleIndex = 0
      msLocaleIndex = 0
      ptLocaleIndex = 0
      frLocaleIndex = 0
      hiLocaleIndex = 0
      kmLocaleIndex = 0
      myLocaleIndex = 0
      jvLocaleIndex = 0
      itLocaleIndex = 0
      deLocaleIndex = 0
      nlLocaleIndex = 0
      arLocaleIndex = 0
      arsaLocaleIndex = 0
      taLocaleIndex = 0
      ptptLocaleIndex = 0
      trLocaleIndex = 0
      bnLocaleIndex = 0
      teLocaleIndex = 0
      guLocaleIndex = 0
      knLocaleIndex = 0
      plLocaleIndex = 0
      roLocaleIndex = 0
      csLocaleIndex = 0
      elLocaleIndex = 0
      huLocaleIndex = 0
      svLocaleIndex = 0
      ruLocaleIndex = 0
      ukLocaleIndex = 0
      heLocaleIndex = 0
      faLocaleIndex = 0
      urLocaleIndex = 0
      mlLocaleIndex = 0
      mrLocaleIndex = 0
      paLocaleIndex = 0
      orLocaleIndex = 0
      siLocaleIndex = 0
      neLocaleIndex = 0
      daLocaleIndex = 0
      nbLocaleIndex = 0
      fiLocaleIndex = 0
      skLocaleIndex = 0
      hrLocaleIndex = 0
      caLocaleIndex = 0
      azLocaleIndex = 0
      kkLocaleIndex = 0
      uzLocaleIndex = 0
      bgLocaleIndex = 0
      srLocaleIndex = 0
      swLocaleIndex = 0
      afLocaleIndex = 0
      etLocaleIndex = 0
      lvLocaleIndex = 0
      ltLocaleIndex = 0
      gaLocaleIndex = 0
      cyLocaleIndex = 0
      euLocaleIndex = 0
      glLocaleIndex = 0
      mtLocaleIndex = 0
      isLocaleIndex = 0
      bsLocaleIndex = 0
      sqLocaleIndex = 0
      zuLocaleIndex = 0
      soLocaleIndex = 0
      asLocaleIndex = 0
      mkLocaleIndex = 0
      mnLocaleIndex = 0
      psLocaleIndex = 0
      hyLocaleIndex = 0
      kaLocaleIndex = 0
      amLocaleIndex = 0
      startOne()
    },
    async stop() {
      stopped = true
      stopSpeaking({ preserveSession: apple })
      const rec = recognition
      recognition = null
      if (!rec) {
        handlers.onStatus('idle')
        return
      }
      // Chrome/Safari keep a global recognition lock until onend. Starting the
      // next turn before that fires shows the mic icon with no audio.
      await new Promise<void>((resolve) => {
        let settled = false
        const finish = () => {
          if (settled) return
          settled = true
          window.clearTimeout(timer)
          rec.onend = null
          rec.onerror = null
          rec.onresult = null
          resolve()
        }
        const timer = window.setTimeout(finish, apple ? 800 : 400)
        rec.onend = () => finish()
        try {
          if (apple) rec.stop()
          else rec.abort()
        } catch {
          try {
            rec.stop()
          } catch {
            finish()
          }
        }
      })
      handlers.onStatus('idle')
    },
  }
}
