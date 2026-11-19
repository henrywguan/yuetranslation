import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { BiText } from './BiText'
import {
  CMN_VOICES,
  EN_VOICES,
  ES_VOICES,
  ES_ES_VOICES,
  SICHUAN_VOICES,
  TL_VOICES,
  VI_VOICES,
  TH_VOICES,
  LO_VOICES,
  KO_VOICES,
  JA_VOICES,
  ID_VOICES,
  MS_VOICES,
  PT_VOICES,
  FR_VOICES,
  HI_VOICES,
  KM_VOICES,
  MY_VOICES,
  JV_VOICES,
  IT_VOICES,
  DE_VOICES,
  NL_VOICES,
  AR_VOICES,
  ARSA_VOICES,
  TA_VOICES,
  PTPT_VOICES,
  TR_VOICES,
  BN_VOICES,
  TE_VOICES,
  GU_VOICES,
  KN_VOICES,
  PL_VOICES,
  RO_VOICES,
  CS_VOICES,
  EL_VOICES,
  HU_VOICES,
  SV_VOICES,
  RU_VOICES,
  UK_VOICES,
  HE_VOICES,
  FA_VOICES,
  UR_VOICES,
  ML_VOICES,
  MR_VOICES,
  PA_VOICES,
  OR_VOICES,
  SI_VOICES,
  NE_VOICES,
  DA_VOICES,
  NB_VOICES,
  FI_VOICES,
  SK_VOICES,
  HR_VOICES,
  CA_VOICES,
  AZ_VOICES,
  KK_VOICES,
  UZ_VOICES,
  BG_VOICES,
  SR_VOICES,
  SW_VOICES,
  AF_VOICES,
  WUU_VOICES,
  YUE_VOICES,
  resolveCmnVoice,
  resolveEnVoice,
  resolveEsVoice,
  resolveEsesVoice,
  resolveSichuanVoice,
  resolveTlVoice,
  resolveViVoice,
  resolveThVoice,
  resolveLoVoice,
  resolveKoVoice,
  resolveJaVoice,
  resolveIdVoice,
  resolveMsVoice,
  resolvePtVoice,
  resolveFrVoice,
  resolveHiVoice,
  resolveKmVoice,
  resolveMyVoice,
  resolveJvVoice,
  resolveItVoice,
  resolveDeVoice,
  resolveNlVoice,
  resolveArVoice,
  resolveArsaVoice,
  resolveTaVoice,
  resolvePtptVoice,
  resolveTrVoice,
  resolveBnVoice,
  resolveTeVoice,
  resolveGuVoice,
  resolveKnVoice,
  resolvePlVoice,
  resolveRoVoice,
  resolveCsVoice,
  resolveElVoice,
  resolveHuVoice,
  resolveSvVoice,
  resolveRuVoice,
  resolveUkVoice,
  resolveHeVoice,
  resolveFaVoice,
  resolveUrVoice,
  resolveMlVoice,
  resolveMrVoice,
  resolvePaVoice,
  resolveOrVoice,
  resolveSiVoice,
  resolveNeVoice,
  resolveDaVoice,
  resolveNbVoice,
  resolveFiVoice,
  resolveSkVoice,
  resolveHrVoice,
  resolveCaVoice,
  resolveAzVoice,
  resolveKkVoice,
  resolveUzVoice,
  resolveBgVoice,
  resolveSrVoice,
  resolveSwVoice,
  resolveAfVoice,
  resolveWuuVoice,
  resolveYueVoice,
  voiceShortLabel,
  type CmnVoiceId,
  type EnVoiceId,
  type EsVoiceId,
  type EsesVoiceId,
  type SichuanVoiceId,
  type TlVoiceId,
  type ViVoiceId,
  type ThVoiceId,
  type LoVoiceId,
  type KoVoiceId,
  type JaVoiceId,
  type IdVoiceId,
  type MsVoiceId,
  type PtVoiceId,
  type FrVoiceId,
  type HiVoiceId,
  type KmVoiceId,
  type MyVoiceId,
  type JvVoiceId,
  type ItVoiceId,
  type DeVoiceId,
  type NlVoiceId,
  type ArVoiceId,
  type ArsaVoiceId,
  type TaVoiceId,
  type PtptVoiceId,
  type TrVoiceId,
  type BnVoiceId,
  type TeVoiceId,
  type GuVoiceId,
  type KnVoiceId,
  type PlVoiceId,
  type RoVoiceId,
  type CsVoiceId,
  type ElVoiceId,
  type HuVoiceId,
  type SvVoiceId,
  type RuVoiceId,
  type UkVoiceId,
  type HeVoiceId,
  type FaVoiceId,
  type UrVoiceId,
  type MlVoiceId,
  type MrVoiceId,
  type PaVoiceId,
  type OrVoiceId,
  type SiVoiceId,
  type NeVoiceId,
  type DaVoiceId,
  type NbVoiceId,
  type FiVoiceId,
  type SkVoiceId,
  type HrVoiceId,
  type CaVoiceId,
  type AzVoiceId,
  type KkVoiceId,
  type UzVoiceId,
  type BgVoiceId,
  type SrVoiceId,
  type SwVoiceId,
  type AfVoiceId,
  type WuuVoiceId,
  type YueVoiceId,
} from '../lib/ttsVoices'
import { biPlain, ui } from '../lib/uiCopy'
import type { Entitlement } from '../lib/types'
import './AccountHubVoice.css'

type Props = {
  voicePrefId: string
  entitlement: Entitlement
  yueVoice: YueVoiceId
  enVoice: EnVoiceId
  cmnVoice: CmnVoiceId
  tlVoice: TlVoiceId
  esVoice: EsVoiceId
  esesVoice: EsesVoiceId
  viVoice: ViVoiceId
  thVoice: ThVoiceId
  loVoice: LoVoiceId
  koVoice: KoVoiceId
  jaVoice: JaVoiceId
  idVoice: IdVoiceId
  msVoice: MsVoiceId
  ptVoice: PtVoiceId
  frVoice: FrVoiceId
  hiVoice: HiVoiceId
  kmVoice: KmVoiceId
  myVoice: MyVoiceId
  jvVoice: JvVoiceId
  itVoice: ItVoiceId
  deVoice: DeVoiceId
  nlVoice: NlVoiceId
  arVoice: ArVoiceId
  arsaVoice: ArsaVoiceId
  taVoice: TaVoiceId
  ptptVoice: PtptVoiceId
  trVoice: TrVoiceId
  bnVoice: BnVoiceId
  teVoice: TeVoiceId
  guVoice: GuVoiceId
  knVoice: KnVoiceId
  plVoice: PlVoiceId
  roVoice: RoVoiceId
  csVoice: CsVoiceId
  elVoice: ElVoiceId
  huVoice: HuVoiceId
  svVoice: SvVoiceId
  ruVoice: RuVoiceId
  ukVoice: UkVoiceId
  heVoice: HeVoiceId
  faVoice: FaVoiceId
  urVoice: UrVoiceId
  mlVoice: MlVoiceId
  mrVoice: MrVoiceId
  paVoice: PaVoiceId
  orVoice: OrVoiceId
  siVoice: SiVoiceId
  neVoice: NeVoiceId
  daVoice: DaVoiceId
  nbVoice: NbVoiceId
  fiVoice: FiVoiceId
  skVoice: SkVoiceId
  hrVoice: HrVoiceId
  caVoice: CaVoiceId
  azVoice: AzVoiceId
  kkVoice: KkVoiceId
  uzVoice: UzVoiceId
  bgVoice: BgVoiceId
  srVoice: SrVoiceId
  swVoice: SwVoiceId
  afVoice: AfVoiceId
  wuuVoice: WuuVoiceId
  sichuanVoice: SichuanVoiceId
  voiceBusy: boolean
  previewBusy: 'yue' | 'en' | 'cmn' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko' | 'ja' | 'id' | 'ms' | 'pt' | 'fr' | 'hi' | 'km' | 'my' | 'jv' | 'it' | 'de' | 'nl' | 'ar' | 'arsa' | 'ta' | 'ptpt' | 'tr' | 'bn' | 'te' | 'gu' | 'kn' | 'pl' | 'ro' | 'cs' | 'el' | 'hu' | 'sv' | 'ru' | 'uk' | 'he' | 'fa' | 'ur' | 'ml' | 'mr' | 'pa' | 'or' | 'si' | 'ne' | 'da' | 'nb' | 'fi' | 'sk' | 'hr' | 'ca' | 'az' | 'kk' | 'uz' | 'bg' | 'sr' | 'sw' | 'af' | 'wuu' | 'sichuan' | null
  persistVoices: (next: {
    yue?: YueVoiceId
    en?: EnVoiceId
    cmn?: CmnVoiceId
    tl?: TlVoiceId
    es?: EsVoiceId
    eses?: EsesVoiceId
    vi?: ViVoiceId
    th?: ThVoiceId
    lo?: LoVoiceId
    ko?: KoVoiceId
    ja?: JaVoiceId
    id?: IdVoiceId
    ms?: MsVoiceId
    pt?: PtVoiceId
    fr?: FrVoiceId
    hi?: HiVoiceId
    km?: KmVoiceId
    my?: MyVoiceId
    jv?: JvVoiceId
    it?: ItVoiceId
    de?: DeVoiceId
    nl?: NlVoiceId
    ar?: ArVoiceId
    arsa?: ArsaVoiceId
    ta?: TaVoiceId
    ptpt?: PtptVoiceId
    tr?: TrVoiceId
    bn?: BnVoiceId
    te?: TeVoiceId
    gu?: GuVoiceId
    kn?: KnVoiceId
    pl?: PlVoiceId
    ro?: RoVoiceId
    cs?: CsVoiceId
    el?: ElVoiceId
    hu?: HuVoiceId
    sv?: SvVoiceId
    ru?: RuVoiceId
    uk?: UkVoiceId
    he?: HeVoiceId
    fa?: FaVoiceId
    ur?: UrVoiceId
    ml?: MlVoiceId
    mr?: MrVoiceId
    pa?: PaVoiceId
    or?: OrVoiceId
    si?: SiVoiceId
    ne?: NeVoiceId
    da?: DaVoiceId
    nb?: NbVoiceId
    fi?: FiVoiceId
    sk?: SkVoiceId
    hr?: HrVoiceId
    ca?: CaVoiceId
    az?: AzVoiceId
    kk?: KkVoiceId
    uz?: UzVoiceId
    bg?: BgVoiceId
    sr?: SrVoiceId
    sw?: SwVoiceId
    af?: AfVoiceId
    wuu?: WuuVoiceId
    sichuan?: SichuanVoiceId
  }) => Promise<void>
  onPreview: (
    kind: 'yue' | 'en' | 'cmn' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko' | 'ja' | 'id' | 'ms' | 'pt' | 'fr' | 'hi' | 'km' | 'my' | 'jv' | 'it' | 'de' | 'nl' | 'ar' | 'arsa' | 'ta' | 'ptpt' | 'tr' | 'bn' | 'te' | 'gu' | 'kn' | 'pl' | 'ro' | 'cs' | 'el' | 'hu' | 'sv' | 'ru' | 'uk' | 'he' | 'fa' | 'ur' | 'ml' | 'mr' | 'pa' | 'or' | 'si' | 'ne' | 'da' | 'nb' | 'fi' | 'sk' | 'hr' | 'ca' | 'az' | 'kk' | 'uz' | 'bg' | 'sr' | 'sw' | 'af' | 'wuu' | 'sichuan',
  ) => Promise<void>
}

/** Compact TTS summary + modal for Yue / En / Cmn / Tl / Es / Wuu / Sichuan voice prefs. */
export function AccountHubVoice({
  voicePrefId,
  entitlement,
  yueVoice,
  enVoice,
  cmnVoice,
  tlVoice,
  esVoice,
  esesVoice,
  viVoice,
  thVoice,
  loVoice,
  koVoice,
  jaVoice,
  idVoice,
  msVoice,
  ptVoice,
  frVoice,
  hiVoice,
  kmVoice,
  myVoice,
  jvVoice,
  itVoice,
  deVoice,
  nlVoice,
  arVoice,
  arsaVoice,
  taVoice,
  ptptVoice,
  trVoice,
  bnVoice,
  teVoice,
  guVoice,
  knVoice,
  plVoice,
  roVoice,
  csVoice,
  elVoice,
  huVoice,
  svVoice,
  ruVoice,
  ukVoice,
  heVoice,
  faVoice,
  urVoice,
  mlVoice,
  mrVoice,
  paVoice,
  orVoice,
  siVoice,
  neVoice,
  daVoice,
  nbVoice,
  fiVoice,
  skVoice,
  hrVoice,
  caVoice,
  azVoice,
  kkVoice,
  uzVoice,
  bgVoice,
  srVoice,
  swVoice,
  afVoice,
  wuuVoice,
  sichuanVoice,
  voiceBusy,
  previewBusy,
  persistVoices,
  onPreview,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const titleId = useId()
  /** Native <select> dismiss can synthesize a click on the backdrop (esp. iOS). */
  const ignoreBackdropUntil = useRef(0)

  useEffect(() => {
    if (!modalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [modalOpen])

  const close = () => setModalOpen(false)
  const ttsOk = Boolean(entitlement.allowed?.tts)

  const markSelectInteraction = () => {
    // Cover picker dismiss + delayed ghost click after choosing an option.
    ignoreBackdropUntil.current = Date.now() + 500
  }

  const onBackdropPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.target !== e.currentTarget) return
    if (Date.now() < ignoreBackdropUntil.current) return
    // Use pointerdown — post-select ghost events are usually clicks, not pointerdowns.
    close()
  }


  return (
    <section
      className="account-hub-section account-hub-area-voice"
      aria-labelledby={voicePrefId}
    >
      <p className="account-hub-label" id={voicePrefId}>
        <BiText copy={ui.accountTtsVoices} size="sm" />
      </p>

      <div className="account-hub-voice-summary">
        <p className="account-hub-voice-summary-line" aria-live="polite">
          <span className="account-hub-voice-chip">
            <span className="account-hub-voice-chip-lang">粵</span>
            <span className="account-hub-voice-chip-name">{voiceShortLabel(yueVoice)}</span>
          </span>
          <span className="account-hub-voice-chip">
            <span className="account-hub-voice-chip-lang">En</span>
            <span className="account-hub-voice-chip-name">{voiceShortLabel(enVoice)}</span>
          </span>
          <span className="account-hub-voice-chip">
            <span className="account-hub-voice-chip-lang">普</span>
            <span className="account-hub-voice-chip-name">{voiceShortLabel(cmnVoice)}</span>
          </span>
          <span className="account-hub-voice-chip">
            <span className="account-hub-voice-chip-lang">Tl</span>
            <span className="account-hub-voice-chip-name">{voiceShortLabel(tlVoice)}</span>
          </span>
          <span className="account-hub-voice-chip">
            <span className="account-hub-voice-chip-lang">Mx</span>
            <span className="account-hub-voice-chip-name">{voiceShortLabel(esVoice)}</span>
          </span>
          <span className="account-hub-voice-chip">
            <span className="account-hub-voice-chip-lang">Vi</span>
            <span className="account-hub-voice-chip-name">{voiceShortLabel(viVoice)}</span>
          </span>
          <span className="account-hub-voice-chip">
            <span className="account-hub-voice-chip-lang">Th</span>
            <span className="account-hub-voice-chip-name">{voiceShortLabel(thVoice)}</span>
          </span>
          <span className="account-hub-voice-chip">
            <span className="account-hub-voice-chip-lang">Lo</span>
            <span className="account-hub-voice-chip-name">{voiceShortLabel(loVoice)}</span>
          </span>
          <span className="account-hub-voice-chip">
            <span className="account-hub-voice-chip-lang">Ko</span>
            <span className="account-hub-voice-chip-name">{voiceShortLabel(koVoice)}</span>
          </span>
          <span className="account-hub-voice-chip">
            <span className="account-hub-voice-chip-lang">沪</span>
            <span className="account-hub-voice-chip-name">{voiceShortLabel(wuuVoice)}</span>
          </span>
          <span className="account-hub-voice-chip">
            <span className="account-hub-voice-chip-lang">川</span>
            <span className="account-hub-voice-chip-name">{voiceShortLabel(sichuanVoice)}</span>
          </span>
        </p>
        <button
          type="button"
          className="account-hub-voice-settings-btn"
          disabled={voiceBusy}
          onClick={() => setModalOpen(true)}
        >
          <BiText copy={ui.accountTtsVoiceSettings} size="sm" hideJp />
        </button>
      </div>

      {/* Portal above Account Hub — hub backdrop-filter/overflow traps fixed positioning. */}
      {modalOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="voice-settings-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              <button
                type="button"
                className="voice-settings-backdrop"
                aria-label={biPlain(ui.accountTtsVoiceModalClose)}
                onPointerDown={onBackdropPointerDown}
              />
              <div
                className="voice-settings-panel"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="voice-settings-close"
                  onClick={close}
                  aria-label={biPlain(ui.accountTtsVoiceModalClose)}
                >
                  ×
                </button>
                <h2 id={titleId} className="voice-settings-title">
                  <BiText copy={ui.accountTtsVoiceModalTitle} size="md" />
                </h2>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsYue} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={yueVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ yue: resolveYueVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsYue)}
                    >
                      {YUE_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('yue')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsEn} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={enVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ en: resolveEnVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsEn)}
                    >
                      {EN_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('en')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsCmn} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={cmnVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ cmn: resolveCmnVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsCmn)}
                    >
                      {CMN_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('cmn')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsTl} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={tlVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ tl: resolveTlVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsTl)}
                    >
                      {TL_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('tl')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsEs} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={esVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ es: resolveEsVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsEs)}
                    >
                      {ES_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('es')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsEses} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={esesVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ eses: resolveEsesVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsEses)}
                    >
                      {ES_ES_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('eses')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsVi} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={viVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ vi: resolveViVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsVi)}
                    >
                      {VI_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('vi')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsTh} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={thVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ th: resolveThVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsTh)}
                    >
                      {TH_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('th')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsLo} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={loVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ lo: resolveLoVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsLo)}
                    >
                      {LO_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('lo')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsKo} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={koVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ ko: resolveKoVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsKo)}
                    >
                      {KO_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('ko')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>


                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsJa} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={jaVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ ja: resolveJaVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsJa)}
                    >
                      {JA_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('ja')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsId} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={idVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ id: resolveIdVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsId)}
                    >
                      {ID_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('id')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsMs} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={msVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ ms: resolveMsVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsMs)}
                    >
                      {MS_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('ms')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsPt} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={ptVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ pt: resolvePtVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsPt)}
                    >
                      {PT_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('pt')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsFr} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={frVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ fr: resolveFrVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsFr)}
                    >
                      {FR_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('fr')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsHi} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={hiVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ hi: resolveHiVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsHi)}
                    >
                      {HI_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('hi')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsKm} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={kmVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ km: resolveKmVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsKm)}
                    >
                      {KM_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('km')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsMy} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={myVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ my: resolveMyVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsMy)}
                    >
                      {MY_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('my')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsJv} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={jvVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ jv: resolveJvVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsJv)}
                    >
                      {JV_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('jv')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsIt} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={itVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ it: resolveItVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsIt)}
                    >
                      {IT_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('it')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsDe} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={deVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ de: resolveDeVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsDe)}
                    >
                      {DE_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('de')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsNl} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={nlVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ nl: resolveNlVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsNl)}
                    >
                      {NL_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('nl')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsAr} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={arVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ ar: resolveArVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsAr)}
                    >
                      {AR_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('ar')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsArsa} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={arsaVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ arsa: resolveArsaVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsArsa)}
                    >
                      {ARSA_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('arsa')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsTa} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={taVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ ta: resolveTaVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsTa)}
                    >
                      {TA_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('ta')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsPtpt} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={ptptVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ ptpt: resolvePtptVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsPtpt)}
                    >
                      {PTPT_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('ptpt')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsTr} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={trVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ tr: resolveTrVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsTr)}
                    >
                      {TR_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('tr')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsBn} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={bnVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ bn: resolveBnVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsBn)}
                    >
                      {BN_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('bn')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsTe} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={teVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ te: resolveTeVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsTe)}
                    >
                      {TE_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('te')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsGu} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={guVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ gu: resolveGuVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsGu)}
                    >
                      {GU_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('gu')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsKn} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={knVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ kn: resolveKnVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsKn)}
                    >
                      {KN_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('kn')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsPl} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={plVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ pl: resolvePlVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsPl)}
                    >
                      {PL_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('pl')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsRo} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={roVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ ro: resolveRoVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsRo)}
                    >
                      {RO_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('ro')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsCs} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={csVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ cs: resolveCsVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsCs)}
                    >
                      {CS_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('cs')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsEl} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={elVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ el: resolveElVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsEl)}
                    >
                      {EL_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('el')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsHu} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={huVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ hu: resolveHuVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsHu)}
                    >
                      {HU_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('hu')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsSv} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={svVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ sv: resolveSvVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsSv)}
                    >
                      {SV_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('sv')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsRu} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={ruVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ ru: resolveRuVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsRu)}
                    >
                      {RU_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('ru')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsUk} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={ukVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ uk: resolveUkVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsUk)}
                    >
                      {UK_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('uk')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsHe} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={heVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ he: resolveHeVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsHe)}
                    >
                      {HE_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('he')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsFa} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={faVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ fa: resolveFaVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsFa)}
                    >
                      {FA_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('fa')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsUr} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={urVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ ur: resolveUrVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsUr)}
                    >
                      {UR_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('ur')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>


                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsMl} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={mlVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ ml: resolveMlVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsMl)}
                    >
                      {ML_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('ml')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsMr} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={mrVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ mr: resolveMrVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsMr)}
                    >
                      {MR_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('mr')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsPa} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={paVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ pa: resolvePaVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsPa)}
                    >
                      {PA_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('pa')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsOr} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={orVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ or: resolveOrVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsOr)}
                    >
                      {OR_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('or')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsSi} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={siVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ si: resolveSiVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsSi)}
                    >
                      {SI_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('si')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsNe} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={neVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ ne: resolveNeVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsNe)}
                    >
                      {NE_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('ne')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsDa} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={daVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ da: resolveDaVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsDa)}
                    >
                      {DA_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('da')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsNb} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={nbVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ nb: resolveNbVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsNb)}
                    >
                      {NB_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('nb')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsFi} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={fiVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ fi: resolveFiVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsFi)}
                    >
                      {FI_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('fi')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsSk} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={skVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ sk: resolveSkVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsSk)}
                    >
                      {SK_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('sk')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsHr} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={hrVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ hr: resolveHrVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsHr)}
                    >
                      {HR_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('hr')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsCa} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={caVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ ca: resolveCaVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsCa)}
                    >
                      {CA_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('ca')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>
                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsAz} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={azVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ az: resolveAzVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsAz)}
                    >
                      {AZ_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('az')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>
                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsKk} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={kkVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ kk: resolveKkVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsKk)}
                    >
                      {KK_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('kk')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>
                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsUz} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={uzVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ uz: resolveUzVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsUz)}
                    >
                      {UZ_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('uz')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>
                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsBg} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={bgVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ bg: resolveBgVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsBg)}
                    >
                      {BG_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('bg')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>
                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsSr} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={srVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ sr: resolveSrVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsSr)}
                    >
                      {SR_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('sr')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>
                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsSw} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={swVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ sw: resolveSwVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsSw)}
                    >
                      {SW_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('sw')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>
                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsAf} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={afVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ af: resolveAfVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsAf)}
                    >
                      {AF_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('af')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>
                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsWuu} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={wuuVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ wuu: resolveWuuVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsWuu)}
                    >
                      {WUU_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('wuu')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <div className="voice-settings-row">
                  <label className="voice-settings-field">
                    <span className="voice-settings-lang">
                      <BiText copy={ui.accountTtsSichuan} size="sm" hideJp />
                    </span>
                    <select
                      className="account-hub-select"
                      onPointerDown={markSelectInteraction}
                      onFocus={markSelectInteraction}
                      value={sichuanVoice}
                      disabled={voiceBusy}
                      onChange={(e) => {
                        markSelectInteraction()
                        void persistVoices({ sichuan: resolveSichuanVoice(e.target.value) })
                      }}
                      aria-label={biPlain(ui.accountTtsSichuan)}
                    >
                      {SICHUAN_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.labelEn} · {v.labelZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="account-hub-voice-preview"
                    disabled={previewBusy !== null || !ttsOk}
                    onClick={() => void onPreview('sichuan')}
                  >
                    <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
                  </button>
                </div>

                <button type="button" className="voice-settings-done" onClick={close}>
                  <BiText copy={ui.accountTtsVoiceModalClose} size="sm" hideJp />
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  )
}
