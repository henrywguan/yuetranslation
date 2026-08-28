import { useState } from 'react'
import { translateText } from '../lib/api'
import { BiText } from '../components/BiText'
import { CharacterBreakdownFrame } from '../components/CharacterBreakdownFrame'
import { ResultWithDefinition } from '../components/ResultWithDefinition'
import { TranslateThinking } from '../components/TranslateThinking'
import { TranslationAlternatives } from '../components/TranslationAlternatives'
import { buildLocalBreakdown, type CharBreakdown } from '../lib/jyutping'
import { ui } from '../lib/uiCopy'

const SAMPLES = ['hello', 'thank you', 'good morning', 'what are you doing?']

export function LiveDemo() {
  const [text, setText] = useState('what are you doing?')
  const [result, setResult] = useState('你做緊咩呀？')
  const [definition, setDefinition] = useState('what are you doing?')
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
    const started = Date.now()
    try {
      const res = await translateText(trimmed, 'en', 'yue', {
        includeAlternatives: true,
      })
      setResult(res.text)
      setDefinition(res.definition || trimmed)
      setAlternatives(res.alternatives || [])
    } catch {
      setError('api')
    } finally {
      // Keep the wow bounce on screen long enough to read, even on dictionary hits.
      const elapsed = Date.now() - started
      if (elapsed < 1100) {
        await new Promise((r) => setTimeout(r, 1100 - elapsed))
      }
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
        <span className="demo-window-label">
          <BiText copy={ui.demoLive} size="sm" hideJp />
        </span>
      </div>

      <div className="demo-solo">
        <div className="demo-solo-pane">
          <span className="demo-label">
            <BiText copy={ui.english} size="sm" only="en" />
          </span>
          <textarea
            id="demo-input"
            className="demo-input demo-input--solo"
            value={text}
            rows={2}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || e.shiftKey) return
              e.preventDefault()
              void run(text)
            }}
            placeholder={`${ui.typeEnglish.en} / ${ui.typeEnglish.zh}`}
          />
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
        </div>

        <div className="demo-solo-rule" aria-hidden="true" />

        <div className="demo-solo-pane">
          <span className="demo-label">
            <BiText copy={ui.cantonese} size="sm" only="zh" />
          </span>
          {loading ? (
            <TranslateThinking className="demo-thinking" />
          ) : (
            <>
              <ResultWithDefinition
                text={result}
                definition={definition}
                className="demo-result-row"
                textClassName="demo-output-text"
                speakLang="yue"
                onActivate={(p) => void openPhrase(p, false)}
              />
              <TranslationAlternatives
                alternatives={alternatives}
                className="demo-alts"
                showCopy={false}
                showSpeak
                onSelect={(p) => void openPhrase(p, true)}
              />
            </>
          )}
        </div>
      </div>

      <p className="demo-hint">
        <BiText copy={ui.autoTranslateHint} size="sm" layout="inline" hideJp />
      </p>

      {error ? (
        <p className="demo-error">
          <BiText copy={ui.demoApiError} size="sm" />
        </p>
      ) : null}

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
