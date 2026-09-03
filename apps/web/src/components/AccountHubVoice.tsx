import { BiText } from './BiText'
import {
  EN_VOICES,
  YUE_VOICES,
  resolveEnVoice,
  resolveYueVoice,
  type EnVoiceId,
  type YueVoiceId,
} from '../lib/ttsVoices'
import { biPlain, ui } from '../lib/uiCopy'
import type { Entitlement } from '../lib/types'

type Props = {
  voicePrefId: string
  entitlement: Entitlement
  yueVoice: YueVoiceId
  enVoice: EnVoiceId
  voiceBusy: boolean
  previewBusy: 'yue' | 'en' | null
  persistVoices: (next: { yue?: YueVoiceId; en?: EnVoiceId }) => Promise<void>
  onPreview: (kind: 'yue' | 'en') => Promise<void>
}

/** TTS voice selects + preview buttons for the account hub. */
export function AccountHubVoice({
  voicePrefId,
  entitlement,
  yueVoice,
  enVoice,
  voiceBusy,
  previewBusy,
  persistVoices,
  onPreview,
}: Props) {
  return (
    <section
      className="account-hub-section account-hub-area-voice"
      aria-labelledby={voicePrefId}
    >
      <p className="account-hub-label" id={voicePrefId}>
        <BiText copy={ui.accountTtsVoices} size="sm" />
      </p>
      <div className="account-hub-voice-row">
        <label className="account-hub-voice-field">
          <span className="account-hub-voice-lang">
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
          disabled={previewBusy !== null || !entitlement.allowed.tts}
          onClick={() => void onPreview('yue')}
        >
          <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
        </button>
      </div>
      <div className="account-hub-voice-row">
        <label className="account-hub-voice-field">
          <span className="account-hub-voice-lang">
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
          disabled={previewBusy !== null || !entitlement.allowed.tts}
          onClick={() => void onPreview('en')}
        >
          <BiText copy={ui.accountTtsPreview} size="sm" hideJp />
        </button>
      </div>
    </section>
  )
}
