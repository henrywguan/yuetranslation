import { useState } from 'react'
import { BiText } from './BiText'
import { ResultWithDefinition } from './ResultWithDefinition'
import { useYueStore } from '../lib/store'
import { biPlain, ui } from '../lib/uiCopy'
import type { Lang } from '../lib/types'

export function TextMode() {
  const [text, setText] = useState('')
  const [from, setFrom] = useState<Lang>('en')
  const translateTyped = useYueStore((s) => s.translateTyped)
  const history = useYueStore((s) => s.history)
  const latest = history[0]
  const placeholder = from === 'en' ? ui.typeEnglish : ui.typeCantonese

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
        placeholder={`${placeholder.en} / ${placeholder.zh}`}
        aria-label={biPlain(placeholder)}
      />
      <button type="button" className="primary" onClick={() => void translateTyped(text, from)}>
        <BiText copy={ui.translate} size="sm" />
      </button>
      {latest ? (
        <div className="text-result">
          <p className="muted">
            <BiText copy={ui.result} size="sm" />
          </p>
          <ResultWithDefinition
            text={latest.translation}
            definition={latest.to === 'yue' ? latest.definition || latest.source : latest.definition}
            cantonese={latest.to === 'yue'}
          />
        </div>
      ) : null}
    </div>
  )
}
