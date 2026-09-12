import { useEffect, useMemo, useState } from 'react'
import {
  OrbitalSphereBackground,
  ORBITAL_SPHERE_DEFAULTS,
  type OrbitalSphereOptions,
} from './ui/orbital-sphere'
import './AdminPracticePartnerLab.css'

export type PartnerMood = 'idle' | 'listening' | 'thinking' | 'speaking'

type SubtitleRole = 'you' | 'partner' | 'system'

type SubtitleLine = {
  role: SubtitleRole
  text: string
  /** Optional Jyutping / secondary line under the main caption. */
  secondary?: string
  interim?: boolean
}

const MOODS: { id: PartnerMood; label: string; hint: string }[] = [
  { id: 'idle', label: 'Idle', hint: 'Waiting — soft drift' },
  { id: 'listening', label: 'Listening', hint: 'User is speaking' },
  { id: 'thinking', label: 'Thinking', hint: 'Agent turn / tools' },
  { id: 'speaking', label: 'Speaking', hint: 'TTS + captions' },
]

const MOOD_ORBIT: Record<PartnerMood, Partial<OrbitalSphereOptions>> = {
  idle: {
    speed: 0.85,
    scale: 1,
    particleOpacity: 0.55,
    orbitOpacity: 0.22,
    haloOpacity: 0.18,
    hue: 0,
  },
  listening: {
    speed: 1.2,
    scale: 1.1,
    particleOpacity: 0.82,
    orbitOpacity: 0.4,
    haloOpacity: 0.36,
    hue: -6,
  },
  thinking: {
    speed: 0.5,
    scale: 0.94,
    particleOpacity: 0.42,
    orbitOpacity: 0.18,
    haloOpacity: 0.28,
    hue: 18,
  },
  speaking: {
    speed: 1.65,
    scale: 1.14,
    particleOpacity: 0.92,
    orbitOpacity: 0.48,
    haloOpacity: 0.44,
    hue: -12,
  },
}

/** Simulated bilingual turn for the lab — replaced by live STT / agent text later. */
const DEMO_SCRIPT: Record<PartnerMood, SubtitleLine> = {
  idle: {
    role: 'system',
    text: 'Tap a mood, or auto-cycle to preview orb + captions.',
  },
  listening: {
    role: 'you',
    text: '早晨，今日天氣點呀？',
    secondary: 'zou2 san4, gam1 jat6 tin1 hei3 dim2 aa3?',
    interim: true,
  },
  thinking: {
    role: 'system',
    text: 'Partner is thinking…',
  },
  speaking: {
    role: 'partner',
    text: '早晨！今日幾好天，適合出街呀。',
    secondary: 'zou2 san4! gam1 jat6 gei2 hou2 tin1, sik1 hap6 ceot1 gaai1 aa3.',
  },
}

const ROLE_LABEL: Record<SubtitleRole, string> = {
  you: 'You',
  partner: 'Partner',
  system: 'Lab',
}

/**
 * Admin-only Practice Partner visual lab.
 * Chosen direction: reactive Harbor orb + live subtitles.
 * Not wired to Voice Live yet, and not exposed in the consumer app.
 */
export function AdminPracticePartnerLab() {
  const [mood, setMood] = useState<PartnerMood>('idle')
  const [demo, setDemo] = useState(false)
  const [amp, setAmp] = useState(0)
  const [caption, setCaption] = useState<SubtitleLine>(DEMO_SCRIPT.idle)
  const [history, setHistory] = useState<SubtitleLine[]>([])

  useEffect(() => {
    if (!demo) return undefined
    const order: PartnerMood[] = ['idle', 'listening', 'thinking', 'speaking']
    let i = 0
    setMood(order[0]!)
    const id = window.setInterval(() => {
      i = (i + 1) % order.length
      setMood(order[i]!)
    }, 2800)
    return () => window.clearInterval(id)
  }, [demo])

  useEffect(() => {
    if (mood !== 'speaking' && mood !== 'listening') {
      setAmp(0)
      return undefined
    }
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = (now - start) / 1000
      const wave =
        mood === 'speaking'
          ? 0.35 + 0.55 * Math.abs(Math.sin(t * 6.2)) * (0.6 + 0.4 * Math.sin(t * 2.1))
          : 0.2 + 0.35 * Math.abs(Math.sin(t * 3.4))
      setAmp(wave)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [mood])

  useEffect(() => {
    const next = DEMO_SCRIPT[mood]
    setCaption(next)
    if (mood === 'listening' || mood === 'speaking') {
      setHistory((prev) => {
        const last = prev[prev.length - 1]
        if (last && last.role === next.role && last.text === next.text) return prev
        return [...prev.slice(-5), { ...next, interim: false }]
      })
    }
  }, [mood])

  const orbitProps = useMemo((): Partial<OrbitalSphereOptions> => {
    const base = { ...ORBITAL_SPHERE_DEFAULTS, ...MOOD_ORBIT[mood] }
    const breathe = mood === 'speaking' || mood === 'listening' ? amp * 0.12 : 0
    return {
      ...base,
      scale: (base.scale ?? 1) * (1 + breathe),
      speed: (base.speed ?? 1) * (1 + amp * 0.35),
      particleOpacity: Math.min(1, (base.particleOpacity ?? 0.72) + amp * 0.12),
      haloOpacity: Math.min(1, (base.haloOpacity ?? 0.22) + amp * 0.2),
    }
  }, [mood, amp])

  const moodMeta = MOODS.find((m) => m.id === mood)!

  return (
    <section className="partner-lab" aria-label="Practice Partner lab">
      <header className="partner-lab-head">
        <div>
          <p className="partner-lab-kicker">Internal · not in app</p>
          <h2 className="partner-lab-title">Practice Partner</h2>
          <p className="partner-lab-lede">
            Direction locked: reactive Harbor orb + live subtitles. Moods and captions are simulated
            here — Voice Live / Foundry are not connected. Nothing in this lab shows in the consumer
            app.
          </p>
        </div>
        <label className="partner-lab-demo">
          <input
            type="checkbox"
            checked={demo}
            onChange={(e) => setDemo(e.target.checked)}
          />
          Auto-cycle moods
        </label>
      </header>

      <div className={`partner-lab-stage partner-lab-stage--${mood}`} data-mood={mood}>
        <div className="partner-lab-glow" aria-hidden="true" />
        <OrbitalSphereBackground className="partner-lab-orb" {...orbitProps} />

        <div
          className={`partner-lab-subtitles partner-lab-subtitles--${caption.role}${
            caption.interim ? ' is-interim' : ''
          }`}
          aria-live="polite"
        >
          <span className="partner-lab-subtitles-role">{ROLE_LABEL[caption.role]}</span>
          <p className="partner-lab-subtitles-text">{caption.text}</p>
          {caption.secondary ? (
            <p className="partner-lab-subtitles-secondary">{caption.secondary}</p>
          ) : null}
        </div>

        <p className="partner-lab-status" aria-live="polite">
          <span className="partner-lab-status-mood">{moodMeta.label}</span>
          <span className="partner-lab-status-hint">{moodMeta.hint}</span>
        </p>
      </div>

      <div className="partner-lab-controls" role="group" aria-label="Partner mood">
        {MOODS.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`partner-lab-mood${mood === m.id ? ' is-active' : ''}`}
            aria-pressed={mood === m.id}
            disabled={demo}
            onClick={() => setMood(m.id)}
          >
            <span className="partner-lab-mood-label">{m.label}</span>
            <span className="partner-lab-mood-hint">{m.hint}</span>
          </button>
        ))}
      </div>

      <aside className="partner-lab-transcript" aria-label="Caption history">
        <h3>Caption reel</h3>
        {history.length ? (
          <ul>
            {history.map((line, i) => (
              <li key={`${line.role}-${i}-${line.text.slice(0, 12)}`}>
                <span className={`partner-lab-transcript-role is-${line.role}`}>
                  {ROLE_LABEL[line.role]}
                </span>
                <span className="partner-lab-transcript-text">{line.text}</span>
                {line.secondary ? (
                  <span className="partner-lab-transcript-secondary">{line.secondary}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="partner-lab-transcript-empty">
            Listening and speaking turns will stack here — like live captions under the orb.
          </p>
        )}
      </aside>

      <aside className="partner-lab-notes">
        <h3>Next when we wire speech</h3>
        <ul>
          <li>
            Partial STT → Listening + interim You captions
          </li>
          <li>
            Agent / tool wait → Thinking (system line)
          </li>
          <li>
            TTS stream → Speaking + Partner captions (Jyutping secondary optional)
          </li>
          <li>Silence / end → Idle</li>
        </ul>
        <p>
          Keep this tab admin-only until the partner flow is entitlement-metered, mic-safe, and
          publishable.
        </p>
      </aside>
    </section>
  )
}
