/**
 * Fullscreen mood overlay — grid of CHAT_DEEP_AVATAR_MOODS; tap plays via play bus.
 */
import { useEffect } from 'react'
import {
  CHAT_DEEP_AVATAR_MOODS,
  chatDeepAvatarMoodSrc,
  chatDeepAvatarPosterSrc,
  chatDeepAvatarPrimarySolo,
  isChatDeepAvatarBothMode,
  resolveChatDeepAvatarPairPlaySrc,
  type ChatDeepAvatarCharacterId,
  type ChatDeepAvatarMood,
} from '../../../lib/chatDeepAvatarCharacter'
import {
  CHAT_DEEP_AVATAR_SHOWCASE,
  highEnergyAvatarMood,
} from '../../../lib/chatDeepAvatarPersona'
import { requestChatDeepAvatarPlay } from '../../../lib/chatDeepAvatarPlayBus'
import { buildMoodPickerEntries } from '../../../lib/chatSelectionChrome'

const ENTRIES = buildMoodPickerEntries([...CHAT_DEEP_AVATAR_MOODS], [...CHAT_DEEP_AVATAR_SHOWCASE])

type ChatMoodPickerProps = {
  open: boolean
  character: ChatDeepAvatarCharacterId
  onClose: () => void
}

export function ChatMoodPicker({ open, character, onClose }: ChatMoodPickerProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="aui-mood-picker"
      role="dialog"
      aria-modal="true"
      aria-label="Companion moods"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="aui-mood-picker-panel">
        <header className="aui-mood-picker-head">
          <h2>Moods</h2>
          <button type="button" className="aui-mood-picker-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="aui-mood-picker-grid">
          {ENTRIES.map((entry) => {
            const mood = entry.id as ChatDeepAvatarMood
            const both = isChatDeepAvatarBothMode(character)
            const pairSrc = both ? resolveChatDeepAvatarPairPlaySrc(mood) : null
            const solo = chatDeepAvatarPrimarySolo(character)
            const src = pairSrc || chatDeepAvatarMoodSrc(solo, mood)
            return (
              <button
                key={entry.id}
                type="button"
                className={`aui-mood-picker-card${entry.highEnergy ? ' is-energy' : ''}`}
                title={entry.label}
                onClick={() => {
                  requestChatDeepAvatarPlay(mood, {
                    forceFullscreen: highEnergyAvatarMood(mood),
                    source: 'picker',
                  })
                  onClose()
                }}
              >
                <img
                  src={src}
                  alt=""
                  className="aui-mood-picker-gif"
                  loading="lazy"
                  onError={(e) => {
                    const img = e.currentTarget
                    img.src = chatDeepAvatarPosterSrc(solo)
                  }}
                />
                <span className="aui-mood-picker-label">{entry.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
