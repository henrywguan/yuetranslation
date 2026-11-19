import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BiText } from './BiText'
import { GlowRotateButton } from './GlowRotateButton'
import { StatefulButton, type ButtonPhase } from './StatefulButton'
import { RoleBadge } from './RoleBadge'
import { UsageMeters } from './UsageMeters'
import './RoleBadge.css'
import { IosHomescreenGuideDialog, IosHomescreenHubButton } from './IosHomescreenGuide'
import { AccountHubHousehold } from './AccountHubHousehold'
import { AccountHubLearnCarousel } from './AccountHubLearnCarousel'
import { AccountHubPrimarySelect } from './AccountHubPrimarySelect'
import { AccountHubVoice } from './AccountHubVoice'
import { OfflinePackPanel } from './OfflinePackPanel'
import { PwaCapabilitiesPanel } from './PwaCapabilitiesPanel'
import {
  badgeCopyFor,
  canShowMetric,
  displayNameFromSession,
  planLabel,
  resolveBadgeMetric,
} from './planChipHelpers'

function HubSep() {
  return <div className="account-hub-sep" role="separator" aria-hidden="true" />
}
import { normalizeEntitlement } from '../lib/normalizeEntitlement'
import { useYueStore } from '../lib/store'
import { getSession, openAuthScreen, signOut } from '../lib/auth'
import { openBillingPortal, openUpgrade, type BillingError } from '../lib/billing'
import { openBugReportOrAuth } from '../lib/bugReport'
import {
  readBadgeUsageMetric,
  writeBadgeUsageMetric,
  type BadgeUsageMetric,
} from '../lib/badgeUsagePref'
import { saveTtsVoicePrefs, saveUsername } from '../lib/api'
import {
  PREVIEW_CMN,
  PREVIEW_EN,
  PREVIEW_TL,
  PREVIEW_ES,
  PREVIEW_ESES,
  PREVIEW_VI,
  PREVIEW_TH,
  PREVIEW_LO,
  PREVIEW_KO,
  PREVIEW_JA,
  PREVIEW_ID,
  PREVIEW_MS,
  PREVIEW_PT,
  PREVIEW_FR,
  PREVIEW_HI,
  PREVIEW_KM,
  PREVIEW_MY,
  PREVIEW_JV,
  PREVIEW_IT,
  PREVIEW_DE,
  PREVIEW_NL,
  PREVIEW_AR,
  PREVIEW_ARSA,
  PREVIEW_TA,
  PREVIEW_PTPT,
  PREVIEW_TR,
  PREVIEW_BN,
  PREVIEW_TE,
  PREVIEW_GU,
  PREVIEW_KN,
  PREVIEW_PL,
  PREVIEW_RO,
  PREVIEW_CS,
  PREVIEW_EL,
  PREVIEW_HU,
  PREVIEW_SV,
  PREVIEW_RU,
  PREVIEW_UK,
  PREVIEW_HE,
  PREVIEW_FA,
  PREVIEW_UR,
  PREVIEW_ML,
  PREVIEW_MR,
  PREVIEW_PA,
  PREVIEW_OR,
  PREVIEW_SI,
  PREVIEW_NE,
  PREVIEW_DA,
  PREVIEW_NB,
  PREVIEW_FI,
  PREVIEW_SK,
  PREVIEW_HR,
  PREVIEW_CA,
  PREVIEW_AZ,
  PREVIEW_KK,
  PREVIEW_UZ,
  PREVIEW_BG,
  PREVIEW_SR,
  PREVIEW_SW,
  PREVIEW_AF,
  PREVIEW_ET,
  PREVIEW_LV,
  PREVIEW_LT,
  PREVIEW_GA,
  PREVIEW_CY,
  PREVIEW_EU,
  PREVIEW_GL,
  PREVIEW_MT,
  PREVIEW_IS,
  PREVIEW_BS,
  PREVIEW_SQ,
  PREVIEW_ZU,
  PREVIEW_SO,
  PREVIEW_AS,
  PREVIEW_MK,
  PREVIEW_MN,
  PREVIEW_PS,
  PREVIEW_HY,
  PREVIEW_KA,
  PREVIEW_AM,
  PREVIEW_WUU,
  PREVIEW_SICHUAN,
  PREVIEW_YUE,
  readLocalCmnVoice,
  readLocalEnVoice,
  readLocalTlVoice,
  readLocalEsVoice,
  readLocalEsesVoice,
  readLocalViVoice,
  readLocalThVoice,
  readLocalLoVoice,
  readLocalKoVoice,
  readLocalJaVoice,
  readLocalIdVoice,
  readLocalMsVoice,
  readLocalPtVoice,
  readLocalFrVoice,
  readLocalHiVoice,
  readLocalKmVoice,
  readLocalMyVoice,
  readLocalJvVoice,
  readLocalItVoice,
  readLocalDeVoice,
  readLocalNlVoice,
  readLocalArVoice,
  readLocalArsaVoice,
  readLocalTaVoice,
  readLocalPtptVoice,
  readLocalTrVoice,
  readLocalBnVoice,
  readLocalTeVoice,
  readLocalGuVoice,
  readLocalKnVoice,
  readLocalPlVoice,
  readLocalRoVoice,
  readLocalCsVoice,
  readLocalElVoice,
  readLocalHuVoice,
  readLocalSvVoice,
  readLocalRuVoice,
  readLocalUkVoice,
  readLocalHeVoice,
  readLocalFaVoice,
  readLocalUrVoice,
  readLocalMlVoice,
  readLocalMrVoice,
  readLocalPaVoice,
  readLocalOrVoice,
  readLocalSiVoice,
  readLocalNeVoice,
  readLocalDaVoice,
  readLocalNbVoice,
  readLocalFiVoice,
  readLocalSkVoice,
  readLocalHrVoice,
  readLocalCaVoice,
  readLocalAzVoice,
  readLocalKkVoice,
  readLocalUzVoice,
  readLocalBgVoice,
  readLocalSrVoice,
  readLocalSwVoice,
  readLocalAfVoice,
  readLocalEtVoice,
  readLocalLvVoice,
  readLocalLtVoice,
  readLocalGaVoice,
  readLocalCyVoice,
  readLocalEuVoice,
  readLocalGlVoice,
  readLocalMtVoice,
  readLocalIsVoice,
  readLocalBsVoice,
  readLocalSqVoice,
  readLocalZuVoice,
  readLocalSoVoice,
  readLocalAsVoice,
  readLocalMkVoice,
  readLocalMnVoice,
  readLocalPsVoice,
  readLocalHyVoice,
  readLocalKaVoice,
  readLocalAmVoice,
  readLocalWuuVoice,
  readLocalSichuanVoice,
  readLocalYueVoice,
  resolveCmnVoice,
  resolveEnVoice,
  resolveTlVoice,
  resolveEsVoice,
  resolveEsesVoice,
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
  resolveEtVoice,
  resolveLvVoice,
  resolveLtVoice,
  resolveGaVoice,
  resolveCyVoice,
  resolveEuVoice,
  resolveGlVoice,
  resolveMtVoice,
  resolveIsVoice,
  resolveBsVoice,
  resolveSqVoice,
  resolveZuVoice,
  resolveSoVoice,
  resolveAsVoice,
  resolveMkVoice,
  resolveMnVoice,
  resolvePsVoice,
  resolveHyVoice,
  resolveKaVoice,
  resolveAmVoice,
  resolveYueVoice,
  writeLocalCmnVoice,
  writeLocalEnVoice,
  writeLocalTlVoice,
  writeLocalEsVoice,
  writeLocalEsesVoice,
  writeLocalViVoice,
  writeLocalThVoice,
  writeLocalLoVoice,
  writeLocalKoVoice,
  writeLocalJaVoice,
  writeLocalIdVoice,
  writeLocalMsVoice,
  writeLocalPtVoice,
  writeLocalFrVoice,
  writeLocalHiVoice,
  writeLocalKmVoice,
  writeLocalMyVoice,
  writeLocalJvVoice,
  writeLocalItVoice,
  writeLocalDeVoice,
  writeLocalNlVoice,
  writeLocalArVoice,
  writeLocalArsaVoice,
  writeLocalTaVoice,
  writeLocalPtptVoice,
  writeLocalTrVoice,
  writeLocalBnVoice,
  writeLocalTeVoice,
  writeLocalGuVoice,
  writeLocalKnVoice,
  writeLocalPlVoice,
  writeLocalRoVoice,
  writeLocalCsVoice,
  writeLocalElVoice,
  writeLocalHuVoice,
  writeLocalSvVoice,
  writeLocalRuVoice,
  writeLocalUkVoice,
  writeLocalHeVoice,
  writeLocalFaVoice,
  writeLocalUrVoice,
  writeLocalMlVoice,
  writeLocalMrVoice,
  writeLocalPaVoice,
  writeLocalOrVoice,
  writeLocalSiVoice,
  writeLocalNeVoice,
  writeLocalDaVoice,
  writeLocalNbVoice,
  writeLocalFiVoice,
  writeLocalSkVoice,
  writeLocalHrVoice,
  writeLocalCaVoice,
  writeLocalAzVoice,
  writeLocalKkVoice,
  writeLocalUzVoice,
  writeLocalBgVoice,
  writeLocalSrVoice,
  writeLocalSwVoice,
  writeLocalAfVoice,
  writeLocalEtVoice,
  writeLocalLvVoice,
  writeLocalLtVoice,
  writeLocalGaVoice,
  writeLocalCyVoice,
  writeLocalEuVoice,
  writeLocalGlVoice,
  writeLocalMtVoice,
  writeLocalIsVoice,
  writeLocalBsVoice,
  writeLocalSqVoice,
  writeLocalZuVoice,
  writeLocalSoVoice,
  writeLocalAsVoice,
  writeLocalMkVoice,
  writeLocalMnVoice,
  writeLocalPsVoice,
  writeLocalHyVoice,
  writeLocalKaVoice,
  writeLocalAmVoice,
  writeLocalWuuVoice,
  writeLocalSichuanVoice,
  writeLocalYueVoice,
  type CmnVoiceId,
  type EnVoiceId,
  type TlVoiceId,
  type EsVoiceId,
  type EsesVoiceId,
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
  type EtVoiceId,
  type LvVoiceId,
  type LtVoiceId,
  type GaVoiceId,
  type CyVoiceId,
  type EuVoiceId,
  type GlVoiceId,
  type MtVoiceId,
  type IsVoiceId,
  type BsVoiceId,
  type SqVoiceId,
  type ZuVoiceId,
  type SoVoiceId,
  type AsVoiceId,
  type MkVoiceId,
  type MnVoiceId,
  type PsVoiceId,
  type HyVoiceId,
  type KaVoiceId,
  type AmVoiceId,
  type WuuVoiceId,
  type SichuanVoiceId,
  type YueVoiceId,
} from '../lib/ttsVoices'
import { speakText, unlockTtsPlayback } from '../lib/tts'
import { openPricing } from '../lib/siteLinks'
import {
  disablePushNotifications,
  enablePushNotifications,
  isPushOptIn,
  prefetchPushConfig,
  pushCapability,
  pushSupported,
} from '../lib/pushNotifications'
import { navigate } from '../lib/useHashRoute'
import { biPlain, ui, type Bi } from '../lib/uiCopy'
import { inkEase } from '../lib/motion'

/** Plan indicator that expands into an account hub (plan, usage, upgrade, sign out). */
export function PlanChip() {
  const entitlement = useYueStore((s) => s.entitlement)
  const loadBootstrap = useYueStore((s) => s.loadBootstrap)
  const autoSpeak = useYueStore((s) => s.autoSpeak)
  const setAutoSpeak = useYueStore((s) => s.setAutoSpeak)
  const primaryLanguage = useYueStore((s) => s.primaryLanguage)
  const setPrimaryLanguage = useYueStore((s) => s.setPrimaryLanguage)
  const [open, setOpen] = useState(false)
  const [homescreenOpen, setHomescreenOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [oauthName, setOauthName] = useState('')
  const [username, setUsername] = useState('')
  const [usernameDraft, setUsernameDraft] = useState('')
  const [usernameEditing, setUsernameEditing] = useState(false)
  const [usernameBusy, setUsernameBusy] = useState(false)
  const [usernamePhase, setUsernamePhase] = useState<ButtonPhase>('idle')
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const usernameSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [busy, setBusy] = useState(false)
  const [badgeMetric, setBadgeMetric] = useState<BadgeUsageMetric>(() => readBadgeUsageMetric())
  const [yueVoice, setYueVoice] = useState<YueVoiceId>(() => readLocalYueVoice())
  const [enVoice, setEnVoice] = useState<EnVoiceId>(() => readLocalEnVoice())
  const [cmnVoice, setCmnVoice] = useState<CmnVoiceId>(() => readLocalCmnVoice())
  const [tlVoice, setTlVoice] = useState<TlVoiceId>(() => readLocalTlVoice())
  const [esVoice, setEsVoice] = useState<EsVoiceId>(() => readLocalEsVoice())
  const [esesVoice, setEsesVoice] = useState<EsesVoiceId>(() => readLocalEsesVoice())
  const [viVoice, setViVoice] = useState<ViVoiceId>(() => readLocalViVoice())
  const [thVoice, setThVoice] = useState<ThVoiceId>(() => readLocalThVoice())
  const [loVoice, setLoVoice] = useState<LoVoiceId>(() => readLocalLoVoice())
  const [koVoice, setKoVoice] = useState<KoVoiceId>(() => readLocalKoVoice())
  const [jaVoice, setJaVoice] = useState<JaVoiceId>(() => readLocalJaVoice())
  const [idVoice, setIdVoice] = useState<IdVoiceId>(() => readLocalIdVoice())
  const [msVoice, setMsVoice] = useState<MsVoiceId>(() => readLocalMsVoice())
  const [ptVoice, setPtVoice] = useState<PtVoiceId>(() => readLocalPtVoice())
  const [frVoice, setFrVoice] = useState<FrVoiceId>(() => readLocalFrVoice())
  const [hiVoice, setHiVoice] = useState<HiVoiceId>(() => readLocalHiVoice())
  const [kmVoice, setKmVoice] = useState<KmVoiceId>(() => readLocalKmVoice())
  const [myVoice, setMyVoice] = useState<MyVoiceId>(() => readLocalMyVoice())
  const [jvVoice, setJvVoice] = useState<JvVoiceId>(() => readLocalJvVoice())
  const [itVoice, setItVoice] = useState<ItVoiceId>(() => readLocalItVoice())
  const [deVoice, setDeVoice] = useState<DeVoiceId>(() => readLocalDeVoice())
  const [nlVoice, setNlVoice] = useState<NlVoiceId>(() => readLocalNlVoice())
  const [arVoice, setArVoice] = useState<ArVoiceId>(() => readLocalArVoice())
  const [arsaVoice, setArsaVoice] = useState<ArsaVoiceId>(() => readLocalArsaVoice())
  const [taVoice, setTaVoice] = useState<TaVoiceId>(() => readLocalTaVoice())
  const [ptptVoice, setPtptVoice] = useState<PtptVoiceId>(() => readLocalPtptVoice())
  const [trVoice, setTrVoice] = useState<TrVoiceId>(() => readLocalTrVoice())
  const [bnVoice, setBnVoice] = useState<BnVoiceId>(() => readLocalBnVoice())
  const [teVoice, setTeVoice] = useState<TeVoiceId>(() => readLocalTeVoice())
  const [guVoice, setGuVoice] = useState<GuVoiceId>(() => readLocalGuVoice())
  const [knVoice, setKnVoice] = useState<KnVoiceId>(() => readLocalKnVoice())
  const [plVoice, setPlVoice] = useState<PlVoiceId>(() => readLocalPlVoice())
  const [roVoice, setRoVoice] = useState<RoVoiceId>(() => readLocalRoVoice())
  const [csVoice, setCsVoice] = useState<CsVoiceId>(() => readLocalCsVoice())
  const [elVoice, setElVoice] = useState<ElVoiceId>(() => readLocalElVoice())
  const [huVoice, setHuVoice] = useState<HuVoiceId>(() => readLocalHuVoice())
  const [svVoice, setSvVoice] = useState<SvVoiceId>(() => readLocalSvVoice())
  const [ruVoice, setRuVoice] = useState<RuVoiceId>(() => readLocalRuVoice())
  const [ukVoice, setUkVoice] = useState<UkVoiceId>(() => readLocalUkVoice())
  const [heVoice, setHeVoice] = useState<HeVoiceId>(() => readLocalHeVoice())
  const [faVoice, setFaVoice] = useState<FaVoiceId>(() => readLocalFaVoice())
  const [urVoice, setUrVoice] = useState<UrVoiceId>(() => readLocalUrVoice())
  const [mlVoice, setMlVoice] = useState<MlVoiceId>(() => readLocalMlVoice())
  const [mrVoice, setMrVoice] = useState<MrVoiceId>(() => readLocalMrVoice())
  const [paVoice, setPaVoice] = useState<PaVoiceId>(() => readLocalPaVoice())
  const [orVoice, setOrVoice] = useState<OrVoiceId>(() => readLocalOrVoice())
  const [siVoice, setSiVoice] = useState<SiVoiceId>(() => readLocalSiVoice())
  const [neVoice, setNeVoice] = useState<NeVoiceId>(() => readLocalNeVoice())
  const [daVoice, setDaVoice] = useState<DaVoiceId>(() => readLocalDaVoice())
  const [nbVoice, setNbVoice] = useState<NbVoiceId>(() => readLocalNbVoice())
  const [fiVoice, setFiVoice] = useState<FiVoiceId>(() => readLocalFiVoice())
  const [skVoice, setSkVoice] = useState<SkVoiceId>(() => readLocalSkVoice())
  const [hrVoice, setHrVoice] = useState<HrVoiceId>(() => readLocalHrVoice())
  const [caVoice, setCaVoice] = useState<CaVoiceId>(() => readLocalCaVoice())
  const [azVoice, setAzVoice] = useState<AzVoiceId>(() => readLocalAzVoice())
  const [kkVoice, setKkVoice] = useState<KkVoiceId>(() => readLocalKkVoice())
  const [uzVoice, setUzVoice] = useState<UzVoiceId>(() => readLocalUzVoice())
  const [bgVoice, setBgVoice] = useState<BgVoiceId>(() => readLocalBgVoice())
  const [srVoice, setSrVoice] = useState<SrVoiceId>(() => readLocalSrVoice())
  const [swVoice, setSwVoice] = useState<SwVoiceId>(() => readLocalSwVoice())
  const [afVoice, setAfVoice] = useState<AfVoiceId>(() => readLocalAfVoice())
  const [etVoice, setEtVoice] = useState<EtVoiceId>(() => readLocalEtVoice())
  const [lvVoice, setLvVoice] = useState<LvVoiceId>(() => readLocalLvVoice())
  const [ltVoice, setLtVoice] = useState<LtVoiceId>(() => readLocalLtVoice())
  const [gaVoice, setGaVoice] = useState<GaVoiceId>(() => readLocalGaVoice())
  const [cyVoice, setCyVoice] = useState<CyVoiceId>(() => readLocalCyVoice())
  const [euVoice, setEuVoice] = useState<EuVoiceId>(() => readLocalEuVoice())
  const [glVoice, setGlVoice] = useState<GlVoiceId>(() => readLocalGlVoice())
  const [mtVoice, setMtVoice] = useState<MtVoiceId>(() => readLocalMtVoice())
  const [isVoice, setIsVoice] = useState<IsVoiceId>(() => readLocalIsVoice())
  const [bsVoice, setBsVoice] = useState<BsVoiceId>(() => readLocalBsVoice())
  const [sqVoice, setSqVoice] = useState<SqVoiceId>(() => readLocalSqVoice())
  const [zuVoice, setZuVoice] = useState<ZuVoiceId>(() => readLocalZuVoice())
  const [soVoice, setSoVoice] = useState<SoVoiceId>(() => readLocalSoVoice())
  const [asVoice, setAsVoice] = useState<AsVoiceId>(() => readLocalAsVoice())
  const [mkVoice, setMkVoice] = useState<MkVoiceId>(() => readLocalMkVoice())
  const [mnVoice, setMnVoice] = useState<MnVoiceId>(() => readLocalMnVoice())
  const [psVoice, setPsVoice] = useState<PsVoiceId>(() => readLocalPsVoice())
  const [hyVoice, setHyVoice] = useState<HyVoiceId>(() => readLocalHyVoice())
  const [kaVoice, setKaVoice] = useState<KaVoiceId>(() => readLocalKaVoice())
  const [amVoice, setAmVoice] = useState<AmVoiceId>(() => readLocalAmVoice())
  const [wuuVoice, setWuuVoice] = useState<WuuVoiceId>(() => readLocalWuuVoice())
  const [sichuanVoice, setSichuanVoice] = useState<SichuanVoiceId>(() => readLocalSichuanVoice())
  const [voiceBusy, setVoiceBusy] = useState(false)
  const [previewBusy, setPreviewBusy] = useState<
    'yue' | 'en' | 'cmn' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko' | 'ja' | 'id' | 'ms' | 'pt' | 'fr' | 'hi' | 'km' | 'my' | 'jv' | 'it' | 'de' | 'nl' | 'ar' | 'arsa' | 'ta' | 'ptpt' | 'tr' | 'bn' | 'te' | 'gu' | 'kn' | 'pl' | 'ro' | 'cs' | 'el' | 'hu' | 'sv' | 'ru' | 'uk' | 'he' | 'fa' | 'ur' | 'ml' | 'mr' | 'pa' | 'or' | 'si' | 'ne' | 'da' | 'nb' | 'fi' | 'sk' | 'hr' | 'ca' | 'az' | 'kk' | 'uz' | 'bg' | 'sr' | 'sw' | 'af' | 'et' | 'lv' | 'lt' | 'ga' | 'cy' | 'eu' | 'gl' | 'mt' | 'is' | 'bs' | 'sq' | 'zu' | 'so' | 'as' | 'mk' | 'mn' | 'ps' | 'hy' | 'ka' | 'am' | 'wuu' | 'sichuan' | null
  >(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteSentTo, setInviteSentTo] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [pushOn, setPushOn] = useState(() => isPushOptIn())
  const [pushBusy, setPushBusy] = useState(false)
  const [pushError, setPushError] = useState<string | null>(null)
  const pushCap = pushCapability()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const hubRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const titleId = useId()
  const badgePrefId = useId()
  const voicePrefId = useId()

  useEffect(() => {
    prefetchPushConfig()
  }, [])

  useEffect(() => {
    return () => {
      if (usernameSaveTimer.current) clearTimeout(usernameSaveTimer.current)
    }
  }, [])

  useEffect(() => {
    const prefs = entitlement?.prefs
    if (prefs?.ttsVoiceYue) {
      const v = resolveYueVoice(prefs.ttsVoiceYue)
      setYueVoice(v)
      writeLocalYueVoice(v)
    }
    if (prefs?.ttsVoiceEn) {
      const v = resolveEnVoice(prefs.ttsVoiceEn)
      setEnVoice(v)
      writeLocalEnVoice(v)
    }
    if (prefs?.ttsVoiceCmn) {
      const v = resolveCmnVoice(prefs.ttsVoiceCmn)
      setCmnVoice(v)
      writeLocalCmnVoice(v)
    }
    if (prefs?.ttsVoiceTl) {
      const v = resolveTlVoice(prefs.ttsVoiceTl)
      setTlVoice(v)
      writeLocalTlVoice(v)
    }
    if (prefs?.ttsVoiceEs) {
      const v = resolveEsVoice(prefs.ttsVoiceEs)
      setEsVoice(v)
      writeLocalEsVoice(v)
    }
    if (prefs?.ttsVoiceEses) {
      const v = resolveEsesVoice(prefs.ttsVoiceEses)
      setEsesVoice(v)
      writeLocalEsesVoice(v)
    }
    if (prefs?.ttsVoiceVi) {
      const v = resolveViVoice(prefs.ttsVoiceVi)
      setViVoice(v)
      writeLocalViVoice(v)
    }
    if (prefs?.ttsVoiceTh) {
      const v = resolveThVoice(prefs.ttsVoiceTh)
      setThVoice(v)
      writeLocalThVoice(v)
    }
    if (prefs?.ttsVoiceLo) {
      const v = resolveLoVoice(prefs.ttsVoiceLo)
      setLoVoice(v)
      writeLocalLoVoice(v)
    }
    if (prefs?.ttsVoiceKo) {
      const v = resolveKoVoice(prefs.ttsVoiceKo)
      setKoVoice(v)
      writeLocalKoVoice(v)
    }
    if (prefs?.ttsVoiceJa) {
      const v = resolveJaVoice(prefs.ttsVoiceJa)
      setJaVoice(v)
      writeLocalJaVoice(v)
    }
    if (prefs?.ttsVoiceId) {
      const v = resolveIdVoice(prefs.ttsVoiceId)
      setIdVoice(v)
      writeLocalIdVoice(v)
    }
    if (prefs?.ttsVoiceMs) {
      const v = resolveMsVoice(prefs.ttsVoiceMs)
      setMsVoice(v)
      writeLocalMsVoice(v)
    }
    if (prefs?.ttsVoicePt) {
      const v = resolvePtVoice(prefs.ttsVoicePt)
      setPtVoice(v)
      writeLocalPtVoice(v)
    }
    if (prefs?.ttsVoiceFr) {
      const v = resolveFrVoice(prefs.ttsVoiceFr)
      setFrVoice(v)
      writeLocalFrVoice(v)
    }
    if (prefs?.ttsVoiceHi) {
      const v = resolveHiVoice(prefs.ttsVoiceHi)
      setHiVoice(v)
      writeLocalHiVoice(v)
    }
    if (prefs?.ttsVoiceKm) {
      const v = resolveKmVoice(prefs.ttsVoiceKm)
      setKmVoice(v)
      writeLocalKmVoice(v)
    }
    if (prefs?.ttsVoiceMy) {
      const v = resolveMyVoice(prefs.ttsVoiceMy)
      setMyVoice(v)
      writeLocalMyVoice(v)
    }
    if (prefs?.ttsVoiceJv) {
      const v = resolveJvVoice(prefs.ttsVoiceJv)
      setJvVoice(v)
      writeLocalJvVoice(v)
    }
    if (prefs?.ttsVoiceIt) {
      const v = resolveItVoice(prefs.ttsVoiceIt)
      setItVoice(v)
      writeLocalItVoice(v)
    }
    if (prefs?.ttsVoiceDe) {
      const v = resolveDeVoice(prefs.ttsVoiceDe)
      setDeVoice(v)
      writeLocalDeVoice(v)
    }
    if (prefs?.ttsVoiceNl) {
      const v = resolveNlVoice(prefs.ttsVoiceNl)
      setNlVoice(v)
      writeLocalNlVoice(v)
    }
    if (prefs?.ttsVoiceAr) {
      const v = resolveArVoice(prefs.ttsVoiceAr)
      setArVoice(v)
      writeLocalArVoice(v)
    }
    if (prefs?.ttsVoiceArsa) {
      const v = resolveArsaVoice(prefs.ttsVoiceArsa)
      setArsaVoice(v)
      writeLocalArsaVoice(v)
    }
    if (prefs?.ttsVoiceTa) {
      const v = resolveTaVoice(prefs.ttsVoiceTa)
      setTaVoice(v)
      writeLocalTaVoice(v)
    }
    if (prefs?.ttsVoicePtpt) {
      const v = resolvePtptVoice(prefs.ttsVoicePtpt)
      setPtptVoice(v)
      writeLocalPtptVoice(v)
    }
    if (prefs?.ttsVoiceTr) {
      const v = resolveTrVoice(prefs.ttsVoiceTr)
      setTrVoice(v)
      writeLocalTrVoice(v)
    }
    if (prefs?.ttsVoiceBn) {
      const v = resolveBnVoice(prefs.ttsVoiceBn)
      setBnVoice(v)
      writeLocalBnVoice(v)
    }
    if (prefs?.ttsVoiceTe) {
      const v = resolveTeVoice(prefs.ttsVoiceTe)
      setTeVoice(v)
      writeLocalTeVoice(v)
    }
    if (prefs?.ttsVoiceGu) {
      const v = resolveGuVoice(prefs.ttsVoiceGu)
      setGuVoice(v)
      writeLocalGuVoice(v)
    }
    if (prefs?.ttsVoiceKn) {
      const v = resolveKnVoice(prefs.ttsVoiceKn)
      setKnVoice(v)
      writeLocalKnVoice(v)
    }
    if (prefs?.ttsVoicePl) {
      const v = resolvePlVoice(prefs.ttsVoicePl)
      setPlVoice(v)
      writeLocalPlVoice(v)
    }
    if (prefs?.ttsVoiceRo) {
      const v = resolveRoVoice(prefs.ttsVoiceRo)
      setRoVoice(v)
      writeLocalRoVoice(v)
    }
    if (prefs?.ttsVoiceCs) {
      const v = resolveCsVoice(prefs.ttsVoiceCs)
      setCsVoice(v)
      writeLocalCsVoice(v)
    }
    if (prefs?.ttsVoiceEl) {
      const v = resolveElVoice(prefs.ttsVoiceEl)
      setElVoice(v)
      writeLocalElVoice(v)
    }
    if (prefs?.ttsVoiceHu) {
      const v = resolveHuVoice(prefs.ttsVoiceHu)
      setHuVoice(v)
      writeLocalHuVoice(v)
    }
    if (prefs?.ttsVoiceSv) {
      const v = resolveSvVoice(prefs.ttsVoiceSv)
      setSvVoice(v)
      writeLocalSvVoice(v)
    }
    if (prefs?.ttsVoiceRu) {
      const v = resolveRuVoice(prefs.ttsVoiceRu)
      setRuVoice(v)
      writeLocalRuVoice(v)
    }
    if (prefs?.ttsVoiceUk) {
      const v = resolveUkVoice(prefs.ttsVoiceUk)
      setUkVoice(v)
      writeLocalUkVoice(v)
    }
    if (prefs?.ttsVoiceHe) {
      const v = resolveHeVoice(prefs.ttsVoiceHe)
      setHeVoice(v)
      writeLocalHeVoice(v)
    }
    if (prefs?.ttsVoiceFa) {
      const v = resolveFaVoice(prefs.ttsVoiceFa)
      setFaVoice(v)
      writeLocalFaVoice(v)
    }
    if (prefs?.ttsVoiceUr) {
      const v = resolveUrVoice(prefs.ttsVoiceUr)
      setUrVoice(v)
      writeLocalUrVoice(v)
    }
    if (prefs?.ttsVoiceMl) {
      const v = resolveMlVoice(prefs.ttsVoiceMl)
      setMlVoice(v)
      writeLocalMlVoice(v)
    }
    if (prefs?.ttsVoiceMr) {
      const v = resolveMrVoice(prefs.ttsVoiceMr)
      setMrVoice(v)
      writeLocalMrVoice(v)
    }
    if (prefs?.ttsVoicePa) {
      const v = resolvePaVoice(prefs.ttsVoicePa)
      setPaVoice(v)
      writeLocalPaVoice(v)
    }
    if (prefs?.ttsVoiceOr) {
      const v = resolveOrVoice(prefs.ttsVoiceOr)
      setOrVoice(v)
      writeLocalOrVoice(v)
    }
    if (prefs?.ttsVoiceSi) {
      const v = resolveSiVoice(prefs.ttsVoiceSi)
      setSiVoice(v)
      writeLocalSiVoice(v)
    }
    if (prefs?.ttsVoiceNe) {
      const v = resolveNeVoice(prefs.ttsVoiceNe)
      setNeVoice(v)
      writeLocalNeVoice(v)
    }
    if (prefs?.ttsVoiceDa) {
      const v = resolveDaVoice(prefs.ttsVoiceDa)
      setDaVoice(v)
      writeLocalDaVoice(v)
    }
    if (prefs?.ttsVoiceNb) {
      const v = resolveNbVoice(prefs.ttsVoiceNb)
      setNbVoice(v)
      writeLocalNbVoice(v)
    }
    if (prefs?.ttsVoiceFi) {
      const v = resolveFiVoice(prefs.ttsVoiceFi)
      setFiVoice(v)
      writeLocalFiVoice(v)
    }
    if (prefs?.ttsVoiceSk) {
      const v = resolveSkVoice(prefs.ttsVoiceSk)
      setSkVoice(v)
      writeLocalSkVoice(v)
    }
    if (prefs?.ttsVoiceHr) {
      const v = resolveHrVoice(prefs.ttsVoiceHr)
      setHrVoice(v)
      writeLocalHrVoice(v)
    }
    if (prefs?.ttsVoiceCa) {
      const v = resolveCaVoice(prefs.ttsVoiceCa)
      setCaVoice(v)
      writeLocalCaVoice(v)
    }
    if (prefs?.ttsVoiceAz) {
      const v = resolveAzVoice(prefs.ttsVoiceAz)
      setAzVoice(v)
      writeLocalAzVoice(v)
    }
    if (prefs?.ttsVoiceKk) {
      const v = resolveKkVoice(prefs.ttsVoiceKk)
      setKkVoice(v)
      writeLocalKkVoice(v)
    }
    if (prefs?.ttsVoiceUz) {
      const v = resolveUzVoice(prefs.ttsVoiceUz)
      setUzVoice(v)
      writeLocalUzVoice(v)
    }
    if (prefs?.ttsVoiceBg) {
      const v = resolveBgVoice(prefs.ttsVoiceBg)
      setBgVoice(v)
      writeLocalBgVoice(v)
    }
    if (prefs?.ttsVoiceSr) {
      const v = resolveSrVoice(prefs.ttsVoiceSr)
      setSrVoice(v)
      writeLocalSrVoice(v)
    }
    if (prefs?.ttsVoiceSw) {
      const v = resolveSwVoice(prefs.ttsVoiceSw)
      setSwVoice(v)
      writeLocalSwVoice(v)
    }
    if (prefs?.ttsVoiceAf) {
      const v = resolveAfVoice(prefs.ttsVoiceAf)
      setAfVoice(v)
      writeLocalAfVoice(v)
    }
    if (prefs?.ttsVoiceEt) {
      const v = resolveEtVoice(prefs.ttsVoiceEt)
      setEtVoice(v)
      writeLocalEtVoice(v)
    }
    if (prefs?.ttsVoiceLv) {
      const v = resolveLvVoice(prefs.ttsVoiceLv)
      setLvVoice(v)
      writeLocalLvVoice(v)
    }
    if (prefs?.ttsVoiceLt) {
      const v = resolveLtVoice(prefs.ttsVoiceLt)
      setLtVoice(v)
      writeLocalLtVoice(v)
    }
    if (prefs?.ttsVoiceGa) {
      const v = resolveGaVoice(prefs.ttsVoiceGa)
      setGaVoice(v)
      writeLocalGaVoice(v)
    }
    if (prefs?.ttsVoiceCy) {
      const v = resolveCyVoice(prefs.ttsVoiceCy)
      setCyVoice(v)
      writeLocalCyVoice(v)
    }
    if (prefs?.ttsVoiceEu) {
      const v = resolveEuVoice(prefs.ttsVoiceEu)
      setEuVoice(v)
      writeLocalEuVoice(v)
    }
    if (prefs?.ttsVoiceGl) {
      const v = resolveGlVoice(prefs.ttsVoiceGl)
      setGlVoice(v)
      writeLocalGlVoice(v)
    }
    if (prefs?.ttsVoiceMt) {
      const v = resolveMtVoice(prefs.ttsVoiceMt)
      setMtVoice(v)
      writeLocalMtVoice(v)
    }
    if (prefs?.ttsVoiceIs) {
      const v = resolveIsVoice(prefs.ttsVoiceIs)
      setIsVoice(v)
      writeLocalIsVoice(v)
    }
    if (prefs?.ttsVoiceBs) {
      const v = resolveBsVoice(prefs.ttsVoiceBs)
      setBsVoice(v)
      writeLocalBsVoice(v)
    }
    if (prefs?.ttsVoiceSq) {
      const v = resolveSqVoice(prefs.ttsVoiceSq)
      setSqVoice(v)
      writeLocalSqVoice(v)
    }
    if (prefs?.ttsVoiceZu) {
      const v = resolveZuVoice(prefs.ttsVoiceZu)
      setZuVoice(v)
      writeLocalZuVoice(v)
    }
    if (prefs?.ttsVoiceSo) {
      const v = resolveSoVoice(prefs.ttsVoiceSo)
      setSoVoice(v)
      writeLocalSoVoice(v)
    }
    if (prefs?.ttsVoiceAs) {
      const v = resolveAsVoice(prefs.ttsVoiceAs)
      setAsVoice(v)
      writeLocalAsVoice(v)
    }
    if (prefs?.ttsVoiceMk) {
      const v = resolveMkVoice(prefs.ttsVoiceMk)
      setMkVoice(v)
      writeLocalMkVoice(v)
    }
    if (prefs?.ttsVoiceMn) {
      const v = resolveMnVoice(prefs.ttsVoiceMn)
      setMnVoice(v)
      writeLocalMnVoice(v)
    }
    if (prefs?.ttsVoicePs) {
      const v = resolvePsVoice(prefs.ttsVoicePs)
      setPsVoice(v)
      writeLocalPsVoice(v)
    }
    if (prefs?.ttsVoiceHy) {
      const v = resolveHyVoice(prefs.ttsVoiceHy)
      setHyVoice(v)
      writeLocalHyVoice(v)
    }
    if (prefs?.ttsVoiceKa) {
      const v = resolveKaVoice(prefs.ttsVoiceKa)
      setKaVoice(v)
      writeLocalKaVoice(v)
    }
    if (prefs?.ttsVoiceAm) {
      const v = resolveAmVoice(prefs.ttsVoiceAm)
      setAmVoice(v)
      writeLocalAmVoice(v)
    }
    if (prefs?.username) {
      setUsername(prefs.username)
      setUsernameDraft(prefs.username)
    } else if (entitlement?.loggedIn) {
      setUsername('')
    }
  }, [
    entitlement?.prefs?.ttsVoiceYue,
    entitlement?.prefs?.ttsVoiceEn,
    entitlement?.prefs?.ttsVoiceCmn,
    entitlement?.prefs?.ttsVoiceTl,
    entitlement?.prefs?.ttsVoiceEs,
    entitlement?.prefs?.ttsVoiceEses,
    entitlement?.prefs?.ttsVoiceVi,
    entitlement?.prefs?.ttsVoiceTh,
    entitlement?.prefs?.ttsVoiceLo,
    entitlement?.prefs?.ttsVoiceKo,
    entitlement?.prefs?.ttsVoiceJa,
    entitlement?.prefs?.ttsVoiceId,
    entitlement?.prefs?.ttsVoiceMs,
    entitlement?.prefs?.ttsVoicePt,
    entitlement?.prefs?.ttsVoiceFr,
    entitlement?.prefs?.ttsVoiceHi,
    entitlement?.prefs?.ttsVoiceKm,
    entitlement?.prefs?.ttsVoiceMy,
    entitlement?.prefs?.ttsVoiceJv,
    entitlement?.prefs?.ttsVoiceIt,
    entitlement?.prefs?.ttsVoiceDe,
    entitlement?.prefs?.ttsVoiceNl,
    entitlement?.prefs?.ttsVoiceAr,
    entitlement?.prefs?.ttsVoiceArsa,
    entitlement?.prefs?.ttsVoiceTa,
    entitlement?.prefs?.ttsVoicePtpt,
    entitlement?.prefs?.ttsVoiceTr,
    entitlement?.prefs?.ttsVoiceBn,
    entitlement?.prefs?.ttsVoiceTe,
    entitlement?.prefs?.ttsVoiceGu,
    entitlement?.prefs?.ttsVoiceKn,
    entitlement?.prefs?.ttsVoicePl,
    entitlement?.prefs?.ttsVoiceRo,
    entitlement?.prefs?.ttsVoiceCs,
    entitlement?.prefs?.ttsVoiceEl,
    entitlement?.prefs?.ttsVoiceHu,
    entitlement?.prefs?.ttsVoiceSv,
    entitlement?.prefs?.ttsVoiceRu,
    entitlement?.prefs?.ttsVoiceUk,
    entitlement?.prefs?.ttsVoiceHe,
    entitlement?.prefs?.ttsVoiceFa,
    entitlement?.prefs?.ttsVoiceUr,
    entitlement?.prefs?.ttsVoiceMl,
    entitlement?.prefs?.ttsVoiceMr,
    entitlement?.prefs?.ttsVoicePa,
    entitlement?.prefs?.ttsVoiceOr,
    entitlement?.prefs?.ttsVoiceSi,
    entitlement?.prefs?.ttsVoiceNe,
    entitlement?.prefs?.ttsVoiceDa,
    entitlement?.prefs?.ttsVoiceNb,
    entitlement?.prefs?.ttsVoiceFi,
    entitlement?.prefs?.ttsVoiceSk,
    entitlement?.prefs?.ttsVoiceHr,
    entitlement?.prefs?.ttsVoiceCa,
    entitlement?.prefs?.ttsVoiceAz,
    entitlement?.prefs?.ttsVoiceKk,
    entitlement?.prefs?.ttsVoiceUz,
    entitlement?.prefs?.ttsVoiceBg,
    entitlement?.prefs?.ttsVoiceSr,
    entitlement?.prefs?.ttsVoiceSw,
    entitlement?.prefs?.ttsVoiceAf,
    entitlement?.prefs?.ttsVoiceEt,
    entitlement?.prefs?.ttsVoiceLv,
    entitlement?.prefs?.ttsVoiceLt,
    entitlement?.prefs?.ttsVoiceGa,
    entitlement?.prefs?.ttsVoiceCy,
    entitlement?.prefs?.ttsVoiceEu,
    entitlement?.prefs?.ttsVoiceGl,
    entitlement?.prefs?.ttsVoiceMt,
    entitlement?.prefs?.ttsVoiceIs,
    entitlement?.prefs?.ttsVoiceBs,
    entitlement?.prefs?.ttsVoiceSq,
    entitlement?.prefs?.ttsVoiceZu,
    entitlement?.prefs?.ttsVoiceSo,
    entitlement?.prefs?.ttsVoiceAs,
    entitlement?.prefs?.ttsVoiceMk,
    entitlement?.prefs?.ttsVoiceMn,
    entitlement?.prefs?.ttsVoicePs,
    entitlement?.prefs?.ttsVoiceHy,
    entitlement?.prefs?.ttsVoiceKa,
    entitlement?.prefs?.ttsVoiceAm,
    entitlement?.prefs?.username,
    entitlement?.loggedIn,
  ])

  useEffect(() => {
    let cancelled = false
    void getSession().then((session) => {
      if (cancelled) return
      const nextEmail = session?.user?.email?.trim() || ''
      const meta = session?.user?.user_metadata as Record<string, unknown> | undefined
      setEmail(nextEmail)
      setOauthName(displayNameFromSession(meta))
    })
    return () => {
      cancelled = true
    }
  }, [entitlement?.loggedIn, entitlement?.plan])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Nested portals own the first Escape (usage detail, primary-lang menu).
      if (document.querySelector('.usage-detail-layer')) return
      if (document.querySelector('.account-hub-dd-layer')) return
      setOpen(false)
    }
    const onPointer = (e: PointerEvent) => {
      const target = e.target
      if (!(target instanceof Node)) return
      if (rootRef.current?.contains(target)) return
      if (hubRef.current?.contains(target)) return
      // Portaled overlays — not under hubRef; scrolling/tapping them must keep the hub open.
      if (
        target instanceof Element &&
        (target.closest('.usage-detail-layer') || target.closest('.account-hub-dd-layer'))
      ) {
        return
      }
      setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  if (!entitlement) {
    return (
      <span className="plan-chip muted">
        <BiText copy={ui.connecting} size="sm" />
      </span>
    )
  }

  const plan = entitlement.plan
  const showSignIn = !entitlement.loggedIn && entitlement.requireLogin
  const paid = plan === 'family' || plan === 'business'
  const ttsUnlimited = Boolean(entitlement.ttsUnlimited || paid)
  const showVoiceQuota = entitlement.loggedIn && (ttsUnlimited || entitlement.limits.tts_chars > 0)

  if (showSignIn) {
    return (
      <GlowRotateButton className="plan-sign-in" onClick={() => openAuthScreen()}>
        <BiText copy={ui.signIn} size="sm" hideJp />
      </GlowRotateButton>
    )
  }

  const onUpgrade = () => {
    setOpen(false)
    void openUpgrade('family', 'month').catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Upgrade failed'
      useYueStore.setState({ error: message })
      void loadBootstrap()
    })
  }

  const onBilling = () => {
    setOpen(false)
    void openBillingPortal().catch((err: unknown) => {
      const billingErr = err as BillingError
      const noCustomer =
        billingErr?.code === 'no_stripe_customer' ||
        billingErr?.status === 400 ||
        /no stripe billing account|upgrade first/i.test(billingErr?.message || '')
      if (noCustomer) {
        useYueStore.setState({
          error: billingErr.message || 'No Stripe billing account yet. Open Pricing to subscribe.',
        })
        openPricing()
        return
      }
      useYueStore.setState({
        error: billingErr?.message || 'Could not open billing portal',
      })
      void loadBootstrap()
    })
  }

  const onSignOut = async () => {
    setBusy(true)
    try {
      await signOut()
      setOpen(false)
      setEmail('')
      setOauthName('')
      setUsername('')
      setUsernameDraft('')
      setUsernameEditing(false)
      setUsernameError(null)
      await loadBootstrap()
    } finally {
      setBusy(false)
    }
  }

  const onBadgeMetricChange = (metric: BadgeUsageMetric) => {
    setBadgeMetric(metric)
    writeBadgeUsageMetric(metric)
  }

  const persistVoices = async (next: {
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
    et?: EtVoiceId
    lv?: LvVoiceId
    lt?: LtVoiceId
    ga?: GaVoiceId
    cy?: CyVoiceId
    eu?: EuVoiceId
    gl?: GlVoiceId
    mt?: MtVoiceId
    is?: IsVoiceId
    bs?: BsVoiceId
    sq?: SqVoiceId
    zu?: ZuVoiceId
    so?: SoVoiceId
    as?: AsVoiceId
    mk?: MkVoiceId
    mn?: MnVoiceId
    ps?: PsVoiceId
    hy?: HyVoiceId
    ka?: KaVoiceId
    am?: AmVoiceId
    wuu?: WuuVoiceId
    sichuan?: SichuanVoiceId
  }) => {
    const yue = next.yue ?? yueVoice
    const en = next.en ?? enVoice
    const cmn = next.cmn ?? cmnVoice
    const tl = next.tl ?? tlVoice
    const es = next.es ?? esVoice
    const eses = next.eses ?? esesVoice
    const vi = next.vi ?? viVoice
    const th = next.th ?? thVoice
    const lo = next.lo ?? loVoice
    const ko = next.ko ?? koVoice
    const nl = next.nl ?? nlVoice
    const ar = next.ar ?? arVoice
    const arsa = next.arsa ?? arsaVoice
    const ta = next.ta ?? taVoice
    const ptpt = next.ptpt ?? ptptVoice
    const tr = next.tr ?? trVoice
    const bn = next.bn ?? bnVoice
    const te = next.te ?? teVoice
    const gu = next.gu ?? guVoice
    const kn = next.kn ?? knVoice
    const pl = next.pl ?? plVoice
    const ro = next.ro ?? roVoice
    const cs = next.cs ?? csVoice
    const el = next.el ?? elVoice
    const hu = next.hu ?? huVoice
    const sv = next.sv ?? svVoice
    const ru = next.ru ?? ruVoice
    const uk = next.uk ?? ukVoice
    const he = next.he ?? heVoice
    const fa = next.fa ?? faVoice
    const ur = next.ur ?? urVoice
    const ml = next.ml ?? mlVoice
    const mr = next.mr ?? mrVoice
    const pa = next.pa ?? paVoice
    const or = next.or ?? orVoice
    const si = next.si ?? siVoice
    const ne = next.ne ?? neVoice
    const da = next.da ?? daVoice
    const nb = next.nb ?? nbVoice
    const fi = next.fi ?? fiVoice
    const sk = next.sk ?? skVoice
    const hr = next.hr ?? hrVoice
    const ca = next.ca ?? caVoice
    const az = next.az ?? azVoice
    const kk = next.kk ?? kkVoice
    const uz = next.uz ?? uzVoice
    const bg = next.bg ?? bgVoice
    const sr = next.sr ?? srVoice
    const sw = next.sw ?? swVoice
    const af = next.af ?? afVoice
    const et = next.et ?? etVoice
    const lv = next.lv ?? lvVoice
    const lt = next.lt ?? ltVoice
    const ga = next.ga ?? gaVoice
    const cy = next.cy ?? cyVoice
    const eu = next.eu ?? euVoice
    const gl = next.gl ?? glVoice
    const mt = next.mt ?? mtVoice
    const is = next.is ?? isVoice
    const bs = next.bs ?? bsVoice
    const sq = next.sq ?? sqVoice
    const zu = next.zu ?? zuVoice
    const so = next.so ?? soVoice
    const as = next.as ?? asVoice
    const mk = next.mk ?? mkVoice
    const mn = next.mn ?? mnVoice
    const ps = next.ps ?? psVoice
    const hy = next.hy ?? hyVoice
    const ka = next.ka ?? kaVoice
    const am = next.am ?? amVoice
    const de = next.de ?? deVoice
    const it = next.it ?? itVoice
    const jv = next.jv ?? jvVoice
    const my = next.my ?? myVoice
    const km = next.km ?? kmVoice
    const hi = next.hi ?? hiVoice
    const fr = next.fr ?? frVoice
    const pt = next.pt ?? ptVoice
    const ms = next.ms ?? msVoice
    const id = next.id ?? idVoice
    const ja = next.ja ?? jaVoice
    const wuu = next.wuu ?? wuuVoice
    const sichuan = next.sichuan ?? sichuanVoice
    writeLocalYueVoice(yue)
    writeLocalEnVoice(en)
    writeLocalCmnVoice(cmn)
    writeLocalTlVoice(tl)
    writeLocalEsVoice(es)
    writeLocalEsesVoice(eses)
    writeLocalViVoice(vi)
    writeLocalThVoice(th)
    writeLocalLoVoice(lo)
    writeLocalKoVoice(ko)
    writeLocalNlVoice(nl)
    writeLocalArVoice(ar)
    writeLocalArsaVoice(arsa)
    writeLocalTaVoice(ta)
    writeLocalPtptVoice(ptpt)
    writeLocalTrVoice(tr)
    writeLocalBnVoice(bn)
    writeLocalTeVoice(te)
    writeLocalGuVoice(gu)
    writeLocalKnVoice(kn)
    writeLocalPlVoice(pl)
    writeLocalRoVoice(ro)
    writeLocalCsVoice(cs)
    writeLocalElVoice(el)
    writeLocalHuVoice(hu)
    writeLocalSvVoice(sv)
    writeLocalRuVoice(ru)
    writeLocalUkVoice(uk)
    writeLocalHeVoice(he)
    writeLocalFaVoice(fa)
    writeLocalUrVoice(ur)
    writeLocalMlVoice(ml)
    writeLocalMrVoice(mr)
    writeLocalPaVoice(pa)
    writeLocalOrVoice(or)
    writeLocalSiVoice(si)
    writeLocalNeVoice(ne)
    writeLocalDaVoice(da)
    writeLocalNbVoice(nb)
    writeLocalFiVoice(fi)
    writeLocalSkVoice(sk)
    writeLocalHrVoice(hr)
    writeLocalCaVoice(ca)
    writeLocalAzVoice(az)
    writeLocalKkVoice(kk)
    writeLocalUzVoice(uz)
    writeLocalBgVoice(bg)
    writeLocalSrVoice(sr)
    writeLocalSwVoice(sw)
    writeLocalAfVoice(af)
    writeLocalEtVoice(et)
    writeLocalLvVoice(lv)
    writeLocalLtVoice(lt)
    writeLocalGaVoice(ga)
    writeLocalCyVoice(cy)
    writeLocalEuVoice(eu)
    writeLocalGlVoice(gl)
    writeLocalMtVoice(mt)
    writeLocalIsVoice(is)
    writeLocalBsVoice(bs)
    writeLocalSqVoice(sq)
    writeLocalZuVoice(zu)
    writeLocalSoVoice(so)
    writeLocalAsVoice(as)
    writeLocalMkVoice(mk)
    writeLocalMnVoice(mn)
    writeLocalPsVoice(ps)
    writeLocalHyVoice(hy)
    writeLocalKaVoice(ka)
    writeLocalAmVoice(am)
    writeLocalDeVoice(de)
    writeLocalItVoice(it)
    writeLocalJvVoice(jv)
    writeLocalMyVoice(my)
    writeLocalKmVoice(km)
    writeLocalHiVoice(hi)
    writeLocalFrVoice(fr)
    writeLocalPtVoice(pt)
    writeLocalMsVoice(ms)
    writeLocalIdVoice(id)
    writeLocalJaVoice(ja)
    writeLocalWuuVoice(wuu)
    writeLocalSichuanVoice(sichuan)
    setYueVoice(yue)
    setEnVoice(en)
    setCmnVoice(cmn)
    setTlVoice(tl)
    setEsVoice(es)
    setEsesVoice(eses)
    setViVoice(vi)
    setThVoice(th)
    setLoVoice(lo)
    setKoVoice(ko)
    setNlVoice(nl)
    setArVoice(ar)
    setArsaVoice(arsa)
    setTaVoice(ta)
    setPtptVoice(ptpt)
    setTrVoice(tr)
    setBnVoice(bn)
    setTeVoice(te)
    setGuVoice(gu)
    setKnVoice(kn)
    setPlVoice(pl)
    setRoVoice(ro)
    setCsVoice(cs)
    setElVoice(el)
    setHuVoice(hu)
    setSvVoice(sv)
    setRuVoice(ru)
    setUkVoice(uk)
    setHeVoice(he)
    setFaVoice(fa)
    setUrVoice(ur)
    setMlVoice(ml)
    setMrVoice(mr)
    setPaVoice(pa)
    setOrVoice(or)
    setSiVoice(si)
    setNeVoice(ne)
    setDaVoice(da)
    setNbVoice(nb)
    setFiVoice(fi)
    setSkVoice(sk)
    setHrVoice(hr)
    setCaVoice(ca)
    setAzVoice(az)
    setKkVoice(kk)
    setUzVoice(uz)
    setBgVoice(bg)
    setSrVoice(sr)
    setSwVoice(sw)
    setAfVoice(af)
    setEtVoice(et)
    setLvVoice(lv)
    setLtVoice(lt)
    setGaVoice(ga)
    setCyVoice(cy)
    setEuVoice(eu)
    setGlVoice(gl)
    setMtVoice(mt)
    setIsVoice(is)
    setBsVoice(bs)
    setSqVoice(sq)
    setZuVoice(zu)
    setSoVoice(so)
    setAsVoice(as)
    setMkVoice(mk)
    setMnVoice(mn)
    setPsVoice(ps)
    setHyVoice(hy)
    setKaVoice(ka)
    setAmVoice(am)
    setDeVoice(de)
    setItVoice(it)
    setJvVoice(jv)
    setMyVoice(my)
    setKmVoice(km)
    setHiVoice(hi)
    setFrVoice(fr)
    setPtVoice(pt)
    setMsVoice(ms)
    setIdVoice(id)
    setJaVoice(ja)
    setWuuVoice(wuu)
    setSichuanVoice(sichuan)
    if (!entitlement.loggedIn) return
    setVoiceBusy(true)
    try {
      const data = await saveTtsVoicePrefs({
        ttsVoiceYue: yue,
        ttsVoiceEn: en,
        ttsVoiceCmn: cmn,
        ttsVoiceTl: tl,
        ttsVoiceEs: es,
        ttsVoiceEses: eses,
        ttsVoiceVi: vi,
        ttsVoiceTh: th,
        ttsVoiceLo: lo,
        ttsVoiceKo: ko,
        ttsVoiceNl: nl,
        ttsVoiceAr: ar,
        ttsVoiceArsa: arsa,
        ttsVoiceTa: ta,
        ttsVoicePtpt: ptpt,
        ttsVoiceTr: tr,
        ttsVoiceBn: bn,
        ttsVoiceTe: te,
        ttsVoiceGu: gu,
        ttsVoiceKn: kn,
        ttsVoicePl: pl,
        ttsVoiceRo: ro,
        ttsVoiceCs: cs,
        ttsVoiceEl: el,
        ttsVoiceHu: hu,
        ttsVoiceSv: sv,
        ttsVoiceRu: ru,
        ttsVoiceUk: uk,
        ttsVoiceHe: he,
        ttsVoiceFa: fa,
        ttsVoiceUr: ur,
        ttsVoiceMl: ml,
        ttsVoiceMr: mr,
        ttsVoicePa: pa,
        ttsVoiceOr: or,
        ttsVoiceSi: si,
        ttsVoiceNe: ne,
        ttsVoiceDa: da,
        ttsVoiceNb: nb,
        ttsVoiceFi: fi,
        ttsVoiceSk: sk,
        ttsVoiceHr: hr,
        ttsVoiceCa: ca,
        ttsVoiceAz: az,
        ttsVoiceKk: kk,
        ttsVoiceUz: uz,
        ttsVoiceBg: bg,
        ttsVoiceSr: sr,
        ttsVoiceSw: sw,
        ttsVoiceAf: af,
        ttsVoiceEt: et,
        ttsVoiceLv: lv,
        ttsVoiceLt: lt,
        ttsVoiceGa: ga,
        ttsVoiceCy: cy,
        ttsVoiceEu: eu,
        ttsVoiceGl: gl,
        ttsVoiceMt: mt,
        ttsVoiceIs: is,
        ttsVoiceBs: bs,
        ttsVoiceSq: sq,
        ttsVoiceZu: zu,
        ttsVoiceSo: so,
        ttsVoiceAs: as,
        ttsVoiceMk: mk,
        ttsVoiceMn: mn,
        ttsVoicePs: ps,
        ttsVoiceHy: hy,
        ttsVoiceKa: ka,
        ttsVoiceAm: am,
        ttsVoiceDe: de,
        ttsVoiceIt: it,
        ttsVoiceJv: jv,
        ttsVoiceMy: my,
        ttsVoiceKm: km,
        ttsVoiceHi: hi,
        ttsVoiceFr: fr,
        ttsVoicePt: pt,
        ttsVoiceMs: ms,
        ttsVoiceId: id,
        ttsVoiceJa: ja,
      })
      if (data.entitlement) {
        useYueStore.setState({ entitlement: normalizeEntitlement(data.entitlement) })
      } else {
        useYueStore.setState({
          entitlement: normalizeEntitlement({
            ...entitlement,
            prefs: data.prefs,
          }),
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not sync voice preferences'
      useYueStore.setState({ error: message })
    } finally {
      setVoiceBusy(false)
    }
  }

  const onPreview = async (
    kind: 'yue' | 'en' | 'cmn' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko' | 'ja' | 'id' | 'ms' | 'pt' | 'fr' | 'hi' | 'km' | 'my' | 'jv' | 'it' | 'de' | 'nl' | 'ar' | 'arsa' | 'ta' | 'ptpt' | 'tr' | 'bn' | 'te' | 'gu' | 'kn' | 'pl' | 'ro' | 'cs' | 'el' | 'hu' | 'sv' | 'ru' | 'uk' | 'he' | 'fa' | 'ur' | 'ml' | 'mr' | 'pa' | 'or' | 'si' | 'ne' | 'da' | 'nb' | 'fi' | 'sk' | 'hr' | 'ca' | 'az' | 'kk' | 'uz' | 'bg' | 'sr' | 'sw' | 'af' | 'et' | 'lv' | 'lt' | 'ga' | 'cy' | 'eu' | 'gl' | 'mt' | 'is' | 'bs' | 'sq' | 'zu' | 'so' | 'as' | 'mk' | 'mn' | 'ps' | 'hy' | 'ka' | 'am' | 'wuu' | 'sichuan',
  ) => {
    unlockTtsPlayback()
    setPreviewBusy(kind)
    try {
      if (kind === 'yue') await speakText(PREVIEW_YUE, 'yue', yueVoice)
      else if (kind === 'en') await speakText(PREVIEW_EN, 'en', enVoice)
      else if (kind === 'cmn') await speakText(PREVIEW_CMN, 'cmn', cmnVoice)
      else if (kind === 'tl') await speakText(PREVIEW_TL, 'tl', tlVoice)
      else if (kind === 'es') await speakText(PREVIEW_ES, 'es', esVoice)
      else if (kind === 'eses') await speakText(PREVIEW_ESES, 'eses', esesVoice)
      else if (kind === 'vi') await speakText(PREVIEW_VI, 'vi', viVoice)
      else if (kind === 'th') await speakText(PREVIEW_TH, 'th', thVoice)
      else if (kind === 'lo') await speakText(PREVIEW_LO, 'lo', loVoice)
      else if (kind === 'ko') await speakText(PREVIEW_KO, 'ko', koVoice)
      else if (kind === 'ja') await speakText(PREVIEW_JA, 'ja', jaVoice)
      else if (kind === 'id') await speakText(PREVIEW_ID, 'id', idVoice)
      else if (kind === 'ms') await speakText(PREVIEW_MS, 'ms', msVoice)
      else if (kind === 'pt') await speakText(PREVIEW_PT, 'pt', ptVoice)
      else if (kind === 'fr') await speakText(PREVIEW_FR, 'fr', frVoice)
      else if (kind === 'hi') await speakText(PREVIEW_HI, 'hi', hiVoice)
      else if (kind === 'km') await speakText(PREVIEW_KM, 'km', kmVoice)
      else if (kind === 'my') await speakText(PREVIEW_MY, 'my', myVoice)
      else if (kind === 'jv') await speakText(PREVIEW_JV, 'jv', jvVoice)
      else if (kind === 'it') await speakText(PREVIEW_IT, 'it', itVoice)
      else if (kind === 'de') await speakText(PREVIEW_DE, 'de', deVoice)
      else if (kind === 'nl') await speakText(PREVIEW_NL, 'nl', nlVoice)
      else if (kind === 'ar') await speakText(PREVIEW_AR, 'ar', arVoice)
      else if (kind === 'arsa') await speakText(PREVIEW_ARSA, 'arsa', arsaVoice)
      else if (kind === 'ta') await speakText(PREVIEW_TA, 'ta', taVoice)
      else if (kind === 'ptpt') await speakText(PREVIEW_PTPT, 'ptpt', ptptVoice)
      else if (kind === 'tr') await speakText(PREVIEW_TR, 'tr', trVoice)
      else if (kind === 'bn') await speakText(PREVIEW_BN, 'bn', bnVoice)
      else if (kind === 'te') await speakText(PREVIEW_TE, 'te', teVoice)
      else if (kind === 'gu') await speakText(PREVIEW_GU, 'gu', guVoice)
      else if (kind === 'kn') await speakText(PREVIEW_KN, 'kn', knVoice)
      else if (kind === 'pl') await speakText(PREVIEW_PL, 'pl', plVoice)
      else if (kind === 'ro') await speakText(PREVIEW_RO, 'ro', roVoice)
      else if (kind === 'cs') await speakText(PREVIEW_CS, 'cs', csVoice)
      else if (kind === 'el') await speakText(PREVIEW_EL, 'el', elVoice)
      else if (kind === 'hu') await speakText(PREVIEW_HU, 'hu', huVoice)
      else if (kind === 'sv') await speakText(PREVIEW_SV, 'sv', svVoice)
      else if (kind === 'ru') await speakText(PREVIEW_RU, 'ru', ruVoice)
      else if (kind === 'uk') await speakText(PREVIEW_UK, 'uk', ukVoice)
      else if (kind === 'he') await speakText(PREVIEW_HE, 'he', heVoice)
      else if (kind === 'fa') await speakText(PREVIEW_FA, 'fa', faVoice)
      else if (kind === 'ur') await speakText(PREVIEW_UR, 'ur', urVoice)
      else if (kind === 'ml') await speakText(PREVIEW_ML, 'ml', mlVoice)
      else if (kind === 'mr') await speakText(PREVIEW_MR, 'mr', mrVoice)
      else if (kind === 'pa') await speakText(PREVIEW_PA, 'pa', paVoice)
      else if (kind === 'or') await speakText(PREVIEW_OR, 'or', orVoice)
      else if (kind === 'si') await speakText(PREVIEW_SI, 'si', siVoice)
      else if (kind === 'ne') await speakText(PREVIEW_NE, 'ne', neVoice)
      else if (kind === 'da') await speakText(PREVIEW_DA, 'da', daVoice)
      else if (kind === 'nb') await speakText(PREVIEW_NB, 'nb', nbVoice)
      else if (kind === 'fi') await speakText(PREVIEW_FI, 'fi', fiVoice)
      else if (kind === 'sk') await speakText(PREVIEW_SK, 'sk', skVoice)
      else if (kind === 'hr') await speakText(PREVIEW_HR, 'hr', hrVoice)
      else if (kind === 'ca') await speakText(PREVIEW_CA, 'ca', caVoice)
      else if (kind === 'az') await speakText(PREVIEW_AZ, 'az', azVoice)
      else if (kind === 'kk') await speakText(PREVIEW_KK, 'kk', kkVoice)
      else if (kind === 'uz') await speakText(PREVIEW_UZ, 'uz', uzVoice)
      else if (kind === 'bg') await speakText(PREVIEW_BG, 'bg', bgVoice)
      else if (kind === 'sr') await speakText(PREVIEW_SR, 'sr', srVoice)
      else if (kind === 'sw') await speakText(PREVIEW_SW, 'sw', swVoice)
      else if (kind === 'af') await speakText(PREVIEW_AF, 'af', afVoice)
      else if (kind === 'et') await speakText(PREVIEW_ET, 'et', etVoice)
      else if (kind === 'lv') await speakText(PREVIEW_LV, 'lv', lvVoice)
      else if (kind === 'lt') await speakText(PREVIEW_LT, 'lt', ltVoice)
      else if (kind === 'ga') await speakText(PREVIEW_GA, 'ga', gaVoice)
      else if (kind === 'cy') await speakText(PREVIEW_CY, 'cy', cyVoice)
      else if (kind === 'eu') await speakText(PREVIEW_EU, 'eu', euVoice)
      else if (kind === 'gl') await speakText(PREVIEW_GL, 'gl', glVoice)
      else if (kind === 'mt') await speakText(PREVIEW_MT, 'mt', mtVoice)
      else if (kind === 'is') await speakText(PREVIEW_IS, 'is', isVoice)
      else if (kind === 'bs') await speakText(PREVIEW_BS, 'bs', bsVoice)
      else if (kind === 'sq') await speakText(PREVIEW_SQ, 'sq', sqVoice)
      else if (kind === 'zu') await speakText(PREVIEW_ZU, 'zu', zuVoice)
      else if (kind === 'so') await speakText(PREVIEW_SO, 'so', soVoice)
      else if (kind === 'as') await speakText(PREVIEW_AS, 'as', asVoice)
      else if (kind === 'mk') await speakText(PREVIEW_MK, 'mk', mkVoice)
      else if (kind === 'mn') await speakText(PREVIEW_MN, 'mn', mnVoice)
      else if (kind === 'ps') await speakText(PREVIEW_PS, 'ps', psVoice)
      else if (kind === 'hy') await speakText(PREVIEW_HY, 'hy', hyVoice)
      else if (kind === 'ka') await speakText(PREVIEW_KA, 'ka', kaVoice)
      else if (kind === 'am') await speakText(PREVIEW_AM, 'am', amVoice)
      else if (kind === 'sichuan') await speakText(PREVIEW_SICHUAN, 'sichuan', sichuanVoice)
      else await speakText(PREVIEW_WUU, 'wuu', wuuVoice)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Voice playback failed.'
      useYueStore.setState({ error: message })
    } finally {
      setPreviewBusy(null)
    }
  }

  const hubTitle = entitlement.loggedIn
    ? username || biPlain(ui.accountUsernamePlaceholder)
    : oauthName || email || biPlain(planLabel(plan))

  const startUsernameEdit = () => {
    if (!entitlement.loggedIn) return
    setUsernameError(null)
    setUsernameDraft(username)
    setUsernamePhase('idle')
    setUsernameEditing(true)
  }

  const cancelUsernameEdit = () => {
    if (usernameSaveTimer.current) clearTimeout(usernameSaveTimer.current)
    setUsernameEditing(false)
    setUsernameDraft(username)
    setUsernameError(null)
    setUsernamePhase('idle')
  }

  const persistUsername = async () => {
    if (!entitlement.loggedIn) return
    const next = usernameDraft.trim()
    setUsernameBusy(true)
    setUsernamePhase('loading')
    setUsernameError(null)
    try {
      const data = await saveUsername(next)
      const saved = data.prefs?.username || next
      setUsername(saved)
      setUsernameDraft(saved)
      if (data.entitlement) {
        useYueStore.setState({ entitlement: normalizeEntitlement(data.entitlement) })
      } else {
        useYueStore.setState({
          entitlement: normalizeEntitlement({
            ...entitlement,
            prefs: {
              ttsVoiceYue: entitlement.prefs?.ttsVoiceYue || yueVoice,
              ttsVoiceEn: entitlement.prefs?.ttsVoiceEn || enVoice,
              ttsVoiceCmn: entitlement.prefs?.ttsVoiceCmn || cmnVoice,
              ttsVoiceTl: entitlement.prefs?.ttsVoiceTl || tlVoice,
              ttsVoiceEs: entitlement.prefs?.ttsVoiceEs || esVoice,
              ttsVoiceEses: entitlement.prefs?.ttsVoiceEses || esesVoice,
              ttsVoiceVi: entitlement.prefs?.ttsVoiceVi || viVoice,
              ttsVoiceTh: entitlement.prefs?.ttsVoiceTh || thVoice,
              ttsVoiceLo: entitlement.prefs?.ttsVoiceLo || loVoice,
              ttsVoiceKo: entitlement.prefs?.ttsVoiceKo || koVoice,
              ttsVoiceNl: entitlement.prefs?.ttsVoiceNl || nlVoice,
              ttsVoiceAr: entitlement.prefs?.ttsVoiceAr || arVoice,
              ttsVoiceArsa: entitlement.prefs?.ttsVoiceArsa || arsaVoice,
              ttsVoiceTa: entitlement.prefs?.ttsVoiceTa || taVoice,
              ttsVoicePtpt: entitlement.prefs?.ttsVoicePtpt || ptptVoice,
              ttsVoiceTr: entitlement.prefs?.ttsVoiceTr || trVoice,
              ttsVoiceBn: entitlement.prefs?.ttsVoiceBn || bnVoice,
              ttsVoiceTe: entitlement.prefs?.ttsVoiceTe || teVoice,
              ttsVoiceGu: entitlement.prefs?.ttsVoiceGu || guVoice,
              ttsVoiceKn: entitlement.prefs?.ttsVoiceKn || knVoice,
              ttsVoicePl: entitlement.prefs?.ttsVoicePl || plVoice,
              ttsVoiceRo: entitlement.prefs?.ttsVoiceRo || roVoice,
              ttsVoiceCs: entitlement.prefs?.ttsVoiceCs || csVoice,
              ttsVoiceEl: entitlement.prefs?.ttsVoiceEl || elVoice,
              ttsVoiceHu: entitlement.prefs?.ttsVoiceHu || huVoice,
              ttsVoiceSv: entitlement.prefs?.ttsVoiceSv || svVoice,
              ttsVoiceRu: entitlement.prefs?.ttsVoiceRu || ruVoice,
              ttsVoiceUk: entitlement.prefs?.ttsVoiceUk || ukVoice,
              ttsVoiceHe: entitlement.prefs?.ttsVoiceHe || heVoice,
              ttsVoiceFa: entitlement.prefs?.ttsVoiceFa || faVoice,
              ttsVoiceUr: entitlement.prefs?.ttsVoiceUr || urVoice,
              ttsVoiceMl: entitlement.prefs?.ttsVoiceMl || mlVoice,
              ttsVoiceMr: entitlement.prefs?.ttsVoiceMr || mrVoice,
              ttsVoicePa: entitlement.prefs?.ttsVoicePa || paVoice,
              ttsVoiceOr: entitlement.prefs?.ttsVoiceOr || orVoice,
              ttsVoiceSi: entitlement.prefs?.ttsVoiceSi || siVoice,
              ttsVoiceNe: entitlement.prefs?.ttsVoiceNe || neVoice,
              ttsVoiceDa: entitlement.prefs?.ttsVoiceDa || daVoice,
              ttsVoiceNb: entitlement.prefs?.ttsVoiceNb || nbVoice,
              ttsVoiceFi: entitlement.prefs?.ttsVoiceFi || fiVoice,
              ttsVoiceSk: entitlement.prefs?.ttsVoiceSk || skVoice,
              ttsVoiceHr: entitlement.prefs?.ttsVoiceHr || hrVoice,
              ttsVoiceCa: entitlement.prefs?.ttsVoiceCa || caVoice,
              ttsVoiceAz: entitlement.prefs?.ttsVoiceAz || azVoice,
              ttsVoiceKk: entitlement.prefs?.ttsVoiceKk || kkVoice,
              ttsVoiceUz: entitlement.prefs?.ttsVoiceUz || uzVoice,
              ttsVoiceBg: entitlement.prefs?.ttsVoiceBg || bgVoice,
              ttsVoiceSr: entitlement.prefs?.ttsVoiceSr || srVoice,
              ttsVoiceSw: entitlement.prefs?.ttsVoiceSw || swVoice,
              ttsVoiceAf: entitlement.prefs?.ttsVoiceAf || afVoice,
              ttsVoiceEt: entitlement.prefs?.ttsVoiceEt || etVoice,
              ttsVoiceLv: entitlement.prefs?.ttsVoiceLv || lvVoice,
              ttsVoiceLt: entitlement.prefs?.ttsVoiceLt || ltVoice,
              ttsVoiceGa: entitlement.prefs?.ttsVoiceGa || gaVoice,
              ttsVoiceCy: entitlement.prefs?.ttsVoiceCy || cyVoice,
              ttsVoiceEu: entitlement.prefs?.ttsVoiceEu || euVoice,
              ttsVoiceGl: entitlement.prefs?.ttsVoiceGl || glVoice,
              ttsVoiceMt: entitlement.prefs?.ttsVoiceMt || mtVoice,
              ttsVoiceIs: entitlement.prefs?.ttsVoiceIs || isVoice,
              ttsVoiceBs: entitlement.prefs?.ttsVoiceBs || bsVoice,
              ttsVoiceSq: entitlement.prefs?.ttsVoiceSq || sqVoice,
              ttsVoiceZu: entitlement.prefs?.ttsVoiceZu || zuVoice,
              ttsVoiceSo: entitlement.prefs?.ttsVoiceSo || soVoice,
              ttsVoiceAs: entitlement.prefs?.ttsVoiceAs || asVoice,
              ttsVoiceMk: entitlement.prefs?.ttsVoiceMk || mkVoice,
              ttsVoiceMn: entitlement.prefs?.ttsVoiceMn || mnVoice,
              ttsVoicePs: entitlement.prefs?.ttsVoicePs || psVoice,
              ttsVoiceHy: entitlement.prefs?.ttsVoiceHy || hyVoice,
              ttsVoiceKa: entitlement.prefs?.ttsVoiceKa || kaVoice,
              ttsVoiceAm: entitlement.prefs?.ttsVoiceAm || amVoice,
              ttsVoiceDe: entitlement.prefs?.ttsVoiceDe || deVoice,
              ttsVoiceIt: entitlement.prefs?.ttsVoiceIt || itVoice,
              ttsVoiceJv: entitlement.prefs?.ttsVoiceJv || jvVoice,
              ttsVoiceMy: entitlement.prefs?.ttsVoiceMy || myVoice,
              ttsVoiceKm: entitlement.prefs?.ttsVoiceKm || kmVoice,
              ttsVoiceHi: entitlement.prefs?.ttsVoiceHi || hiVoice,
              ttsVoiceFr: entitlement.prefs?.ttsVoiceFr || frVoice,
              ttsVoicePt: entitlement.prefs?.ttsVoicePt || ptVoice,
              ttsVoiceMs: entitlement.prefs?.ttsVoiceMs || msVoice,
              ttsVoiceId: entitlement.prefs?.ttsVoiceId || idVoice,
              ttsVoiceJa: entitlement.prefs?.ttsVoiceJa || jaVoice,
              ...data.prefs,
            },
          }),
        })
      }
      setUsernamePhase('success')
      if (usernameSaveTimer.current) clearTimeout(usernameSaveTimer.current)
      usernameSaveTimer.current = setTimeout(() => {
        setUsernameEditing(false)
        setUsernamePhase('idle')
        setUsernameBusy(false)
      }, 720)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save username'
      setUsernameError(message)
      setUsernamePhase('idle')
      setUsernameBusy(false)
    }
  }

  const activeBadgeMetric = resolveBadgeMetric(badgeMetric, entitlement, showVoiceQuota)
  const badgeOptions: Array<{ id: BadgeUsageMetric; copy: Bi; available: boolean }> = [
    { id: 'live', copy: ui.accountBadgeLive, available: canShowMetric('live', entitlement, showVoiceQuota) },
    { id: 'voice', copy: ui.accountBadgeVoice, available: canShowMetric('voice', entitlement, showVoiceQuota) },
    {
      id: 'camera',
      copy: ui.accountBadgeCamera,
      available: canShowMetric('camera', entitlement, showVoiceQuota),
    },
  ]

  const canAutoSpeak = Boolean(entitlement?.allowed?.autoSpeak)
  const speakOn = Boolean(autoSpeak && canAutoSpeak)

  const panel = (
    <div className="account-hub" id={panelId} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className="account-hub-header">
        <div className="account-hub-titles">
          <p className="account-hub-kicker">
            <BiText copy={ui.accountHub} size="sm" />
          </p>
          {entitlement.loggedIn && usernameEditing ? (
            <div className="account-hub-username-edit">
              <label className="account-hub-username-field" htmlFor={`${panelId}-username`}>
                <span className="account-hub-label">
                  <BiText copy={ui.accountUsername} size="sm" />
                </span>
                <input
                  id={`${panelId}-username`}
                  className="account-hub-username-input"
                  value={usernameDraft}
                  onChange={(e) => setUsernameDraft(e.target.value)}
                  placeholder={biPlain(ui.accountUsernamePlaceholder)}
                  maxLength={24}
                  autoComplete="username"
                  autoCapitalize="off"
                  spellCheck={false}
                  disabled={usernameBusy}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void persistUsername()
                    } else if (e.key === 'Escape') {
                      e.preventDefault()
                      cancelUsernameEdit()
                    }
                  }}
                />
              </label>
              <p className="account-hub-hint">
                <BiText copy={ui.accountUsernameHint} size="sm" />
              </p>
              {usernameError ? (
                <p className="account-hub-username-error" role="alert">
                  {usernameError}
                </p>
              ) : null}
              <div className="account-hub-username-actions">
                <StatefulButton
                  className="account-hub-btn account-hub-btn--primary account-hub-btn--compact"
                  phase={usernamePhase}
                  disabled={!usernameDraft.trim()}
                  loadingLabel={<BiText copy={ui.accountUsernameSaving} size="sm" hideJp />}
                  successLabel={<BiText copy={ui.accountUsernameSaved} size="sm" hideJp />}
                  onClick={() => void persistUsername()}
                >
                  <BiText copy={ui.accountUsernameSave} size="sm" hideJp />
                </StatefulButton>
                <button
                  type="button"
                  className="account-hub-btn account-hub-btn--compact"
                  disabled={usernameBusy}
                  onClick={cancelUsernameEdit}
                >
                  <BiText copy={ui.accountUsernameCancel} size="sm" hideJp />
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="account-hub-identity">
                <div className="account-hub-identity-main">
                  <div className="account-hub-title-row">
                    {entitlement.loggedIn ? (
                      <button
                        type="button"
                        id={titleId}
                        className={`account-hub-title account-hub-title--btn${!username ? ' is-placeholder' : ''}`}
                        onClick={startUsernameEdit}
                        aria-label={biPlain(ui.accountUsernameEdit)}
                      >
                        {hubTitle}
                      </button>
                    ) : (
                      <h2 id={titleId} className="account-hub-title">
                        {hubTitle}
                      </h2>
                    )}
                  </div>
                  {email ? <p className="account-hub-email">{email}</p> : null}
                </div>
                {entitlement.loggedIn ? (
                  <AccountHubLearnCarousel onNavigate={() => setOpen(false)} />
                ) : null}
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          className="account-hub-close"
          aria-label={biPlain(ui.accountClose)}
          onClick={() => setOpen(false)}
        >
          ×
        </button>
      </header>

      <div className="account-hub-body">
        <div className="account-hub-meta-grid account-hub-area-meta">
          <section className="account-hub-section account-hub-meta-col" aria-label={biPlain(ui.accountPlan)}>
            <p className="account-hub-label">
              <BiText copy={ui.accountPlan} size="sm" />
            </p>
            <span className={`plan-chip plan-${plan} account-hub-plan-pill`}>
              <BiText copy={planLabel(plan)} size="sm" hideJp />
            </span>
          </section>
          <section className="account-hub-section account-hub-meta-col" aria-label={biPlain(ui.accountRole)}>
            <p className="account-hub-label">
              <BiText copy={ui.accountRole} size="sm" />
            </p>
            {entitlement.role ? (
              <div className="account-hub-role-slot">
                <RoleBadge role={entitlement.role} />
              </div>
            ) : (
              <span className="account-hub-role-empty">—</span>
            )}
          </section>
        </div>

        <HubSep />

        <details className="account-hub-fold account-hub-section account-hub-area-autospeak">
          <summary className="account-hub-fold-summary">
            <span className="account-hub-label">
              <BiText copy={canAutoSpeak ? ui.autoSpeak : ui.autoSpeakFamily} size="sm" />
            </span>
            <span className="account-hub-fold-chevron" aria-hidden="true" />
          </summary>
          <div className="account-hub-fold-body">
            <div className="account-hub-autospeak-row">
              <div className="account-hub-autospeak-copy">
                <p className="account-hub-hint">
                  <BiText copy={ui.autoSpeakHint} size="sm" />
                </p>
              </div>
              <label
                className={`account-hub-autospeak-switch${speakOn ? ' is-on' : ''}${!canAutoSpeak ? ' is-disabled' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={speakOn}
                  disabled={!canAutoSpeak}
                  onChange={(e) => setAutoSpeak(e.target.checked)}
                  aria-label={biPlain(canAutoSpeak ? ui.autoSpeak : ui.autoSpeakFamily)}
                />
                <span className="account-hub-autospeak-ui" aria-hidden="true">
                  <span className="account-hub-autospeak-thumb" />
                </span>
              </label>
            </div>
          </div>
        </details>

        <HubSep />

        <details className="account-hub-fold account-hub-section">
          <summary className="account-hub-fold-summary">
            <span className="account-hub-label" id="account-hub-primary-lang-label">
              <BiText copy={ui.primaryLanguage} size="sm" />
            </span>
            <span className="account-hub-fold-chevron" aria-hidden="true" />
          </summary>
          <div className="account-hub-fold-body">
            <p className="account-hub-hint">
              <BiText copy={ui.primaryLanguageHint} size="sm" />
            </p>
            <AccountHubPrimarySelect
              value={primaryLanguage}
              onChange={setPrimaryLanguage}
              labelledBy="account-hub-primary-lang-label"
            />
          </div>
        </details>

        <HubSep />

        <details className="account-hub-fold account-hub-section">
          <summary className="account-hub-fold-summary">
            <span className="account-hub-label">
              <BiText copy={ui.pwaCapabilities} size="sm" />
            </span>
            <span className="account-hub-fold-chevron" aria-hidden="true" />
          </summary>
          <div className="account-hub-fold-body">
            <PwaCapabilitiesPanel onOpenIosGuide={() => setHomescreenOpen(true)} />
          </div>
        </details>

        <HubSep />

        <details className="account-hub-fold account-hub-section">
          <summary className="account-hub-fold-summary">
            <span className="account-hub-label">
              <BiText copy={ui.offlinePack} size="sm" />
            </span>
            <span className="account-hub-fold-chevron" aria-hidden="true" />
          </summary>
          <div className="account-hub-fold-body">
            <OfflinePackPanel />
          </div>
        </details>

        <HubSep />

        <details className="account-hub-fold account-hub-section">
          <summary className="account-hub-fold-summary">
            <span className="account-hub-label">Notifications · 通知</span>
            <span className="account-hub-fold-chevron" aria-hidden="true" />
          </summary>
          <div className="account-hub-fold-body">
            <div className="account-hub-autospeak-row">
              <div className="account-hub-autospeak-copy">
                <p className="account-hub-hint">
                  {pushCap.needsIosInstall
                    ? 'On iPhone: Share → Add to Home Screen, open JyutTranslate from that icon, then enable notifications here.'
                    : pushSupported()
                      ? 'Product updates on this device when JyutTranslate is closed. Each device must opt in separately.'
                      : 'Push is not supported in this browser.'}
                </p>
                {pushError ? (
                  <p className="account-hub-username-error" role="alert">
                    {pushError}
                  </p>
                ) : null}
              </div>
              <label
                className={`account-hub-autospeak-switch${pushOn ? ' is-on' : ''}${!pushSupported() || pushBusy ? ' is-disabled' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={pushOn}
                  disabled={!pushSupported() || pushBusy}
                  onChange={(e) => {
                    const on = e.target.checked
                    setPushBusy(true)
                    setPushError(null)
                    void (async () => {
                      try {
                        if (on) {
                          const result = await enablePushNotifications()
                          if (!result.ok) {
                            setPushError(result.message)
                            setPushOn(false)
                            return
                          }
                          setPushOn(true)
                        } else {
                          await disablePushNotifications()
                          setPushOn(false)
                        }
                      } catch (err) {
                        setPushError(err instanceof Error ? err.message : 'Push update failed')
                        setPushOn(isPushOptIn())
                      } finally {
                        setPushBusy(false)
                      }
                    })()
                  }}
                  aria-label="Enable push notifications"
                />
                <span className="account-hub-autospeak-ui" aria-hidden="true">
                  <span className="account-hub-autospeak-thumb" />
                </span>
              </label>
            </div>
          </div>
        </details>

        <HubSep />

        <section
          className="account-hub-section account-hub-area-usage"
          aria-label={biPlain(ui.accountUsage)}
        >
          <p className="account-hub-label">
            <BiText
              copy={entitlement.household?.pooled ? ui.accountUsagePooled : ui.accountUsage}
              size="sm"
            />
          </p>
          {entitlement.household?.pooled ? (
            <p className="account-hub-hint">
              <BiText copy={ui.accountHouseholdPooledHint} size="sm" />
            </p>
          ) : null}
          <UsageMeters entitlement={entitlement} />
        </section>

        <AccountHubHousehold
          entitlement={entitlement}
          inviteEmail={inviteEmail}
          setInviteEmail={setInviteEmail}
          inviteBusy={inviteBusy}
          setInviteBusy={setInviteBusy}
          inviteSentTo={inviteSentTo}
          setInviteSentTo={setInviteSentTo}
          inviteError={inviteError}
          setInviteError={setInviteError}
          loadBootstrap={loadBootstrap}
        />

        {badgeOptions.some((o) => o.available) ? (
          <>
            <HubSep />
            <section
              className="account-hub-section account-hub-area-badge"
              aria-labelledby={badgePrefId}
            >
            <p className="account-hub-label" id={badgePrefId}>
              <BiText copy={ui.accountBadgeDisplay} size="sm" />
            </p>
            <p className="account-hub-hint">
              <BiText copy={ui.accountBadgeHint} size="sm" />
            </p>
            <div className="account-hub-seg" role="radiogroup" aria-labelledby={badgePrefId}>
              {badgeOptions.map((opt) =>
                opt.available ? (
                  <label
                    key={opt.id}
                    className={`account-hub-seg-opt${badgeMetric === opt.id ? ' is-on' : ''}`}
                  >
                    <input
                      type="radio"
                      name="badge-usage-metric"
                      checked={badgeMetric === opt.id}
                      onChange={() => onBadgeMetricChange(opt.id)}
                    />
                    <BiText copy={opt.copy} size="sm" hideJp />
                  </label>
                ) : null,
              )}
            </div>
          </section>
          </>
        ) : null}

        <HubSep />

        <AccountHubVoice
          voicePrefId={voicePrefId}
          entitlement={entitlement}
          yueVoice={yueVoice}
          enVoice={enVoice}
          cmnVoice={cmnVoice}
          tlVoice={tlVoice}
          esVoice={esVoice}
          esesVoice={esesVoice}
          viVoice={viVoice}
          thVoice={thVoice}
          loVoice={loVoice}
          koVoice={koVoice}
          jaVoice={jaVoice}
          idVoice={idVoice}
          msVoice={msVoice}
          ptVoice={ptVoice}
          frVoice={frVoice}
          hiVoice={hiVoice}
          kmVoice={kmVoice}
          myVoice={myVoice}
          jvVoice={jvVoice}
          itVoice={itVoice}
          deVoice={deVoice}
          nlVoice={nlVoice}
          arVoice={arVoice}
          arsaVoice={arsaVoice}
          taVoice={taVoice}
          ptptVoice={ptptVoice}
          trVoice={trVoice}
          bnVoice={bnVoice}
          teVoice={teVoice}
          guVoice={guVoice}
          knVoice={knVoice}
          plVoice={plVoice}
          roVoice={roVoice}
          csVoice={csVoice}
          elVoice={elVoice}
          huVoice={huVoice}
          svVoice={svVoice}
          ruVoice={ruVoice}
          ukVoice={ukVoice}
          heVoice={heVoice}
          faVoice={faVoice}
          urVoice={urVoice}
          mlVoice={mlVoice}
          mrVoice={mrVoice}
          paVoice={paVoice}
          orVoice={orVoice}
          siVoice={siVoice}
          neVoice={neVoice}
          daVoice={daVoice}
          nbVoice={nbVoice}
          fiVoice={fiVoice}
          skVoice={skVoice}
          hrVoice={hrVoice}
          caVoice={caVoice}
          azVoice={azVoice}
          kkVoice={kkVoice}
          uzVoice={uzVoice}
          bgVoice={bgVoice}
          srVoice={srVoice}
          swVoice={swVoice}
          afVoice={afVoice}
          etVoice={etVoice}
          lvVoice={lvVoice}
          ltVoice={ltVoice}
          gaVoice={gaVoice}
          cyVoice={cyVoice}
          euVoice={euVoice}
          glVoice={glVoice}
          mtVoice={mtVoice}
          isVoice={isVoice}
          bsVoice={bsVoice}
          sqVoice={sqVoice}
          zuVoice={zuVoice}
          soVoice={soVoice}
          asVoice={asVoice}
          mkVoice={mkVoice}
          mnVoice={mnVoice}
          psVoice={psVoice}
          hyVoice={hyVoice}
          kaVoice={kaVoice}
          amVoice={amVoice}
          wuuVoice={wuuVoice}
          sichuanVoice={sichuanVoice}
          voiceBusy={voiceBusy}
          previewBusy={previewBusy}
          persistVoices={persistVoices}
          onPreview={onPreview}
        />

        <HubSep />

        <div className="account-hub-actions account-hub-area-actions">
          {entitlement.isAdmin ? (
            <button
              type="button"
              className="account-hub-btn account-hub-btn--admin"
              onClick={() => {
                setOpen(false)
                navigate('admin')
              }}
            >
              <span className="account-hub-admin-shimmer" aria-hidden="true" />
              <span className="account-hub-admin-glow" aria-hidden="true" />
              <span className="account-hub-admin-label">Admin</span>
            </button>
          ) : null}
          {!paid ? (
            <button type="button" className="account-hub-btn account-hub-btn--primary" onClick={onUpgrade}>
              <BiText copy={ui.upgrade} size="sm" />
            </button>
          ) : (
            <button type="button" className="account-hub-btn account-hub-btn--primary" onClick={onBilling}>
              <BiText copy={ui.manageBilling} size="sm" />
            </button>
          )}
          <IosHomescreenHubButton
            onOpen={() => {
              setOpen(false)
              setHomescreenOpen(true)
            }}
          />
          {entitlement.loggedIn ? (
            <button
              type="button"
              className="account-hub-btn account-hub-btn--bug"
              onClick={() => {
                setOpen(false)
                void openBugReportOrAuth()
              }}
            >
              <span className="account-hub-bug-shimmer" aria-hidden="true" />
              <span className="account-hub-bug-glow" aria-hidden="true" />
              <span className="account-hub-bug-label">
                <svg
                  className="account-hub-bug-icon"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 9V7a4 4 0 0 1 8 0v2" />
                  <rect x="7" y="9" width="10" height="10" rx="3" />
                  <path d="M12 13v3" />
                  <path d="M5 12H3" />
                  <path d="M21 12h-2" />
                  <path d="M6.5 8.5 4.5 6.5" />
                  <path d="M17.5 8.5l2-2" />
                  <path d="M6.5 17.5 4.5 19.5" />
                  <path d="M17.5 17.5l2 2" />
                </svg>
                <BiText copy={ui.bugReportLink} size="sm" />
              </span>
            </button>
          ) : null}
          {entitlement.loggedIn ? (
            <button
              type="button"
              className="account-hub-btn account-hub-btn--ghost"
              disabled={busy}
              onClick={() => void onSignOut()}
            >
              <BiText copy={ui.signOut} size="sm" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )

  return (
    <div className={`plan-chip-wrap${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className={`plan-chip-trigger${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        {entitlement.role ? (
          <RoleBadge role={entitlement.role} />
        ) : (
          <span className={`plan-chip plan-${plan}`}>
            <BiText copy={planLabel(plan)} size="sm" hideJp />
          </span>
        )}
        {activeBadgeMetric ? (
          <span className="plan-remain">
            <BiText copy={badgeCopyFor(activeBadgeMetric, entitlement)} size="sm" hideJp />
          </span>
        ) : null}
      </button>

      {createPortal(
        <AnimatePresence>
          {open ? (
            <>
              <motion.button
                type="button"
                key="account-hub-backdrop"
                className="account-hub-backdrop"
                aria-label={biPlain(ui.accountClose)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={() => setOpen(false)}
              />
              <motion.div
                key="account-hub-panel"
                ref={hubRef}
                className="account-hub-shell"
                initial={{ opacity: 0, y: 14, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.985 }}
                transition={{ duration: 0.24, ease: inkEase }}
              >
                {panel}
              </motion.div>
            </>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}

      <IosHomescreenGuideDialog open={homescreenOpen} onClose={() => setHomescreenOpen(false)} />
    </div>
  )
}
