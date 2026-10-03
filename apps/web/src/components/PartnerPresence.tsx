import { useEffect, useRef, useState } from 'react'

type PresenceMood = 'idle' | 'listening' | 'thinking' | 'reacting' | 'speaking'

export type PresenceWhisper = {
  id: string
  label: string
  zh: string
  disabled?: boolean
  onClick: () => void
}

const MOTES = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  left: `${(i * 61) % 100}%`,
  top: `${(i * 37 + 8) % 100}%`,
  delay: `${(i % 8) * 0.7}s`,
  duration: `${18 + (i % 5) * 3.2}s`,
  size: `${1.5 + (i % 4)}px`,
}))

type WordBit = { id: number; text: string; x: number; delay: number }

function PresenceWords({ phrase }: { phrase: string }) {
  const [bits, setBits] = useState<WordBit[]>([])
  const seen = useRef('')
  useEffect(() => {
    const text = phrase.trim()
    if (!text || text === seen.current) return
    seen.current = text
    const units = [...text].slice(0, 6)
    const stamp = Date.now()
    setBits(
      units.map((unit, i) => ({
        id: stamp + i,
        text: unit,
        x: 50 + (i - (units.length - 1) / 2) * 9,
        delay: i * 0.16,
      })),
    )
    const timer = window.setTimeout(() => setBits([]), 4600)
    return () => window.clearTimeout(timer)
  }, [phrase])
  if (!bits.length) return null
  return (
    <div className="presence-words" aria-hidden="true">
      {bits.map((bit) => (
        <span
          key={bit.id}
          className="presence-word"
          lang="zh-HK"
          style={{ left: `${bit.x}%`, animationDelay: `${bit.delay}s` }}
        >
          {bit.text}
        </span>
      ))}
    </div>
  )
}

export function PartnerPresence({
  place,
  mood,
  celebrate,
  listening,
  phrase,
  invite,
  speakLabel,
  speakDisabled,
  onSpeak,
  whispers,
  quiet,
}: {
  place: 'home' | 'sitting'
  mood: PresenceMood
  celebrate: boolean
  listening: boolean
  phrase: string
  invite: boolean
  speakLabel: string
  speakDisabled: boolean
  onSpeak: () => void
  whispers: PresenceWhisper[]
  quiet: boolean
}) {
  const live = listening ? 'listening' : mood
  return (
    <div
      className={`presence${quiet ? ' is-quiet' : ''}`}
      data-place={place}
      data-mood={mood}
      data-live={live}
      data-celebrate={celebrate ? 'true' : 'false'}
    >
      <div className="presence-motes" aria-hidden="true">
        {MOTES.map((mote) => (
          <i
            key={mote.id}
            style={{
              left: mote.left,
              top: mote.top,
              animationDelay: mote.delay,
              animationDuration: mote.duration,
              width: mote.size,
              height: mote.size,
            }}
          />
        ))}
      </div>
      <div className="presence-halo" aria-hidden="true" />
      <button
        type="button"
        className="presence-speak"
        aria-label={speakLabel}
        disabled={speakDisabled}
        onClick={(event) => {
          event.stopPropagation()
          onSpeak()
        }}
      >
        <span className="presence-wave" />
        <span className="presence-wave" />
        <span className="presence-wave" />
      </button>
      {invite ? (
        <p className="presence-invite">
          <span>Tap to speak</span>
          <span lang="zh-HK">輕觸講</span>
        </p>
      ) : null}
      <PresenceWords phrase={place === 'sitting' ? phrase : ''} />
      <nav className="presence-whispers" aria-label="With 港灣">
        {whispers.map((whisper) => (
          <button
            key={whisper.id}
            type="button"
            disabled={whisper.disabled}
            onClick={(event) => {
              event.stopPropagation()
              whisper.onClick()
            }}
          >
            <span>{whisper.label}</span>
            <span lang="zh-HK">{whisper.zh}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
