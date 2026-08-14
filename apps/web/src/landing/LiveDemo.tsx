import { useState } from 'react'
import { translateText } from '../lib/api'
import { CantoneseText } from '../components/CantoneseText'
import { CharacterBreakdownFrame } from '../components/CharacterBreakdownFrame'
import { TranslationAlternatives } from '../components/TranslationAlternatives'
import { buildLocalBreakdown, type CharBreakdown } from '../lib/jyutping'

const SAMPLES = ['hello', 'thank you', 'good morning', 'what are you doing?']

export function LiveDemo() {
  const [text, setText] = useState('what are you doing?')
  const [result, setResult] = useState('你做緊咩呀？')
  const [alternatives, setAlternatives] = useState<string[]>([
    '你而家做緊咩？',
    '做緊咩呀你？',
    '你喺度做緊乜嘢？',
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [breakdown, setBreakdown] = useState<string | null>(null)
  const [rows, setRows] = useState<CharBreakdown[]>([])

  async function run(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    try {
      const res = await translateText(trimmed, 'en', 'yue', {
        includeAlternatives: true,
        stage: 'final',
      })
      setResult(res.text)
      setAlternatives(res.alternatives || [])
    } catch {
      setError('Live API not reachable from here — this runs against your deployed backend.')
    } finally {
      setLoading(false)
    }
  }

  async function openPhrase(phrase: string, promote: boolean) {
    const chosen = phrase.trim()
    if (!chosen) return
    if (promote && chosen !== result) {
      setAlternatives((prev) =>
        [result, ...prev].filter((s) => s && s !== chosen).filter((s, i, a) => a.indexOf(s) === i).slice(0, 3),
      )
      setResult(chosen)
    }
    setBreakdown(chosen)
    setRows(await buildLocalBreakdown(chosen))
  }

  return (
    <div className="demo-card">
      <div className="demo-window">
        <span className="demo-dot" />
        <span className="demo-dot" />
        <span className="demo-dot" />
        <span className="demo-window-label">Jyut · live</span>
      </div>

      <label className="demo-label" htmlFor="demo-input">
        Type English
      </label>
      <div className="demo-input-row">
        <input
          id="demo-input"
          className="demo-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void run(text)
          }}
          placeholder="Say something…"
        />
        <button
          type="button"
          className="demo-go"
          onClick={() => void run(text)}
          disabled={loading}
        >
          {loading ? '…' : 'Translate'}
        </button>
      </div>

      <div className="demo-samples">
        {SAMPLES.map((s) => (
          <button
            key={s}
            type="button"
            className="demo-chip"
            onClick={() => {
              setText(s)
              void run(s)
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="demo-result">
        <span className="demo-label">廣東話 · Cantonese</span>
        <div className="demo-output">
          <CantoneseText
            text={result}
            jyutpingClassName="jyutping demo-jyutping"
            onActivate={(p) => void openPhrase(p, false)}
          />
        </div>
        <TranslationAlternatives
          alternatives={alternatives}
          className="demo-alts"
          onSelect={(p) => void openPhrase(p, true)}
        />
        {error ? <p className="demo-error">{error}</p> : null}
      </div>

      {breakdown ? (
        <CharacterBreakdownFrame
          phrase={breakdown}
          rows={rows}
          onClose={() => setBreakdown(null)}
        />
      ) : null}
    </div>
  )
}
