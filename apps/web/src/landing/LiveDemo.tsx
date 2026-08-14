import { useState } from 'react'
import { translateText } from '../lib/api'
import { CantoneseText } from '../components/CantoneseText'
import { TranslationAlternatives } from '../components/TranslationAlternatives'

const SAMPLES = ['hello', 'thank you', 'good morning', 'how are you']

export function LiveDemo() {
  const [text, setText] = useState('good morning')
  const [result, setResult] = useState('早晨')
  const [alternatives, setAlternatives] = useState<string[]>(['早安'])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    try {
      const res = await translateText(trimmed, 'en', 'yue', { includeAlternatives: true })
      setResult(res.text)
      setAlternatives(res.alternatives || [])
    } catch {
      setError('Live API not reachable from here — this runs against your deployed backend.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="demo-card">
      <div className="demo-window">
        <span className="demo-dot" />
        <span className="demo-dot" />
        <span className="demo-dot" />
        <span className="demo-window-label">Yue · live</span>
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
          <CantoneseText text={result} jyutpingClassName="jyutping demo-jyutping" />
        </div>
        <TranslationAlternatives alternatives={alternatives} className="demo-alts" />
        {error ? <p className="demo-error">{error}</p> : null}
      </div>
    </div>
  )
}
