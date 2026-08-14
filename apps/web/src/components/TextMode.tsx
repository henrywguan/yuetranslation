import { useState } from 'react'
import { CantoneseText } from './CantoneseText'
import { TranslationAlternatives } from './TranslationAlternatives'
import { useYueStore } from '../lib/store'
import type { Lang } from '../lib/types'

export function TextMode() {
  const [text, setText] = useState('')
  const [from, setFrom] = useState<Lang>('en')
  const translateTyped = useYueStore((s) => s.translateTyped)
  const openBreakdown = useYueStore((s) => s.openBreakdown)
  const selectYueVariation = useYueStore((s) => s.selectYueVariation)
  const history = useYueStore((s) => s.history)
  const latest = history[0]

  return (
    <div className="text-mode">
      <div className="text-dirs">
        <button type="button" className={from === 'en' ? 'active' : ''} onClick={() => setFrom('en')}>
          EN → 粵
        </button>
        <button type="button" className={from === 'yue' ? 'active' : ''} onClick={() => setFrom('yue')}>
          粵 → EN
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder={from === 'en' ? 'Type English…' : '輸入粵語…'}
      />
      <button
        type="button"
        className="primary"
        onClick={() => void translateTyped(text, from)}
      >
        Translate
      </button>
      {latest ? (
        <div className="text-result">
          <p className="muted">Result</p>
          {latest.to === 'yue' ? (
            <CantoneseText
              text={latest.translation}
              className="result-text"
              onActivate={openBreakdown}
              activateLabel="Open character breakdown"
            />
          ) : (
            <p className="result-text">{latest.translation}</p>
          )}
          {latest.to === 'yue' ? (
            <TranslationAlternatives
              alternatives={latest.alternatives || []}
              onSelect={selectYueVariation}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
