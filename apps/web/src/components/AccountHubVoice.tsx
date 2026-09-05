import { useEffect, useId, useState } from 'react'
import { BiText } from './BiText'
import {
  CMN_VOICES,
  EN_VOICES,
  YUE_VOICES,
  resolveCmnVoice,
  resolveEnVoice,
  resolveYueVoice,
  voiceShortLabel,
  type CmnVoiceId,
  type EnVoiceId,
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
  voiceBusy: boolean
  previewBusy: 'yue' | 'en' | 'cmn' | null
  persistVoices: (next: { yue?: YueVoiceId; en?: EnVoiceId; cmn?: CmnVoiceId }) => Promise<void>
  onPreview: (kind: 'yue' | 'en' | 'cmn') => Promise<void>
}

/** Compact TTS summary + modal for Yue / En / Cmn voice prefs. */
export function AccountHubVoice({
  voicePrefId,
  entitlement,
  yueVoice,
  enVoice,
  cmnVoice,
  voiceBusy,
  previewBusy,
  persistVoices,
  onPreview,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const titleId = useId()

  useEffect(() => {
    if (!modalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalOpen])

  const close = () => setModalOpen(false)
  const ttsOk = entitlement.allowed.tts

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

      {modalOpen ? (
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
            onClick={close}
          />
          <div className="voice-settings-panel">
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
                  value={yueVoice}
                  disabled={voiceBusy}
                  onChange={(e) => void persistVoices({ yue: resolveYueVoice(e.target.value) })}
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
                  value={enVoice}
                  disabled={voiceBusy}
                  onChange={(e) => void persistVoices({ en: resolveEnVoice(e.target.value) })}
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
                  value={cmnVoice}
                  disabled={voiceBusy}
                  onChange={(e) => void persistVoices({ cmn: resolveCmnVoice(e.target.value) })}
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

            <button type="button" className="voice-settings-done" onClick={close}>
              <BiText copy={ui.accountTtsVoiceModalClose} size="sm" hideJp />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
