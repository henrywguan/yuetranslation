import { useYueStore } from '../lib/store'
import { biPlain, ui } from '../lib/uiCopy'
import type { Lang } from '../lib/types'

/** Jade-glass speaker control — plays TTS only when the user taps. */
export function SpeakButton({
  text,
  lang,
  className = '',
}: {
  text: string
  lang: Lang
  className?: string
}) {
  const trimmed = text.trim()
  const speakManual = useYueStore((s) => s.speakManual)
  const status = useYueStore((s) => s.status)
  const speakingText = useYueStore((s) => s.speakingText)
  const entitlement = useYueStore((s) => s.entitlement)
  const canTts = !entitlement || entitlement.allowed.tts
  const speaking = status === 'speaking' && speakingText === trimmed

  if (!trimmed) return null

  const label = !canTts ? ui.speakPro : speaking ? ui.stopSpeak : ui.speak

  return (
    <button
      type="button"
      className={`speak-btn${speaking ? ' is-speaking' : ''}${!canTts ? ' is-locked' : ''} ${className}`.trim()}
      disabled={!canTts}
      aria-label={biPlain(label)}
      title={biPlain(label)}
      onClick={(e) => {
        e.stopPropagation()
        void speakManual(trimmed, lang)
      }}
    >
      <svg className="speak-btn-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4.5 9.25v5.5c0 .69.56 1.25 1.25 1.25H8.1l4.05 3.24a.9.9 0 0 0 1.45-.71V6.47a.9.9 0 0 0-1.45-.71L8.1 9H5.75c-.69 0-1.25.56-1.25 1.25Z"
          fill="currentColor"
        />
        <path
          className="speak-btn-wave speak-btn-wave--1"
          d="M15.4 9.2a3.2 3.2 0 0 1 0 5.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          className="speak-btn-wave speak-btn-wave--2"
          d="M17.85 7a5.6 5.6 0 0 1 0 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    </button>
  )
}
