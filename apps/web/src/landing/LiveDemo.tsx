import { useState } from 'react'
import { translateText } from '../lib/api'
import { BiText } from '../components/BiText'
import { ResultWithDefinition } from '../components/ResultWithDefinition'
import { ui } from '../lib/uiCopy'

const SAMPLES = ['hello', 'thank you', 'good morning', 'how are you']

export function LiveDemo() {
  const [text, setText] = useState('good morning')
  const [result, setResult] = useState('早晨')
  const [definition, setDefinition] = useState('good morning')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    try {
      const res = await translateText(trimmed, 'en', 'yue')
      setResult(res.text)
      setDefinition(res.definition || trimmed)
    } catch {
      setError('api')
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
        <span className="demo-window-label">
          <BiText copy={ui.demoLive} size="sm" hideJp />
        </span>
      </div>

      <label className="demo-label" htmlFor="demo-input">
        <BiText copy={ui.demoTypeEn} size="sm" />
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
          placeholder={`${ui.demoPlaceholder.en} / ${ui.demoPlaceholder.zh}`}
        />
        <button
          type="button"
          className="demo-go"
          onClick={() => void run(text)}
          disabled={loading}
        >
          {loading ? '…' : <BiText copy={ui.translate} size="sm" hideJp />}
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
        <span className="demo-label">
          <BiText copy={ui.demoCantonese} size="sm" />
        </span>
          <ResultWithDefinition
            text={result}
            definition={definition}
            className="demo-result-row"
            textClassName="demo-output-text"
          />
        {error ? (
          <p className="demo-error">
            <BiText copy={ui.demoApiError} layout="stack" size="sm" />
          </p>
        ) : null}
      </div>
    </div>
  )
}
