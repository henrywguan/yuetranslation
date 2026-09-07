import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { BiText } from './BiText'
import {
  CMN_VOICES,
  EN_VOICES,
  ES_VOICES,
  TL_VOICES,
  VI_VOICES,
  WUU_VOICES,
  YUE_VOICES,
  resolveCmnVoice,
  resolveEnVoice,
  resolveEsVoice,
  resolveTlVoice,
  resolveViVoice,
  resolveWuuVoice,
  resolveYueVoice,
  voiceShortLabel,
  type CmnVoiceId,
  type EnVoiceId,
  type EsVoiceId,
  type TlVoiceId,
  type ViVoiceId,
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
  viVoice: ViVoiceId
  wuuVoice: WuuVoiceId
  voiceBusy: boolean
  previewBusy: 'yue' | 'en' | 'cmn' | 'tl' | 'es' | 'vi' | 'wuu' | null
  persistVoices: (next: {
    yue?: YueVoiceId
    en?: EnVoiceId
    cmn?: CmnVoiceId
    tl?: TlVoiceId
    es?: EsVoiceId
    vi?: ViVoiceId
    wuu?: WuuVoiceId
  }) => Promise<void>
  onPreview: (kind: 'yue' | 'en' | 'cmn' | 'tl' | 'es' | 'vi' | 'wuu') => Promise<void>
}

/** Compact TTS summary + modal for Yue / En / Cmn / Tl / Es / Wuu voice prefs. */
export function AccountHubVoice({
  voicePrefId,
  entitlement,
  yueVoice,
  enVoice,
  cmnVoice,
  tlVoice,
  esVoice,
  viVoice,
  wuuVoice,
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
  const ttsOk = entitlement.allowed.tts

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
            <span className="account-hub-voice-chip-lang">沪</span>
            <span className="account-hub-voice-chip-name">{voiceShortLabel(wuuVoice)}</span>
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
