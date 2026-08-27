import type { RefObject } from 'react'
import { BiText } from './BiText'
import { CopyButton } from './CopyButton'
import { SpeakButton } from './SpeakButton'
import type { EditableBox } from '../lib/camera/types'
import { biPlain, ui } from '../lib/uiCopy'
import type { Lang } from '../lib/types'

type Props = {
  boxes: EditableBox[]
  selectedId: string | null
  onSelect: (id: string) => void
  onOpenDetails: (box: EditableBox) => void
  panelRef?: RefObject<HTMLDivElement | null>
  className?: string
}

function resultLang(box: EditableBox): Lang {
  if (box.to === 'zh') return 'yue'
  if (box.to === 'en') return 'en'
  return /[\u3400-\u9fff]/.test(box.translated || box.text) ? 'yue' : 'en'
}

/** Scrollable selectable list of every OCR/translate region with text. */
export function CamResultsList({
  boxes,
  selectedId,
  onSelect,
  onOpenDetails,
  panelRef,
  className,
}: Props) {
  const results = boxes.filter((b) => Boolean(b.translated || b.text))
  if (!results.length) return null

  const selected = results.find((b) => b.id === selectedId) || results[0]!
  const speakText = selected.translated || selected.text
  const copyText = selected.translated || selected.text
  const lang = resultLang(selected)

  return (
    <div
      className={['cam-detail cam-results', className].filter(Boolean).join(' ')}
      ref={panelRef}
      aria-label={biPlain(ui.camResults)}
    >
      <div className="cam-detail-head">
        <h3 className="cam-detail-title">
          <BiText copy={ui.camResults} size="sm" />
          <span className="cam-results-count">{results.length}</span>
        </h3>
        <div className="cam-detail-icons">
          <CopyButton text={copyText} lang={lang} />
          {speakText ? <SpeakButton text={speakText} lang={lang} /> : null}
        </div>
      </div>

      <ul className="cam-results-list" role="listbox" aria-label={biPlain(ui.camResults)}>
        {results.map((b, i) => {
          const active = b.id === selected.id
          return (
            <li key={b.id}>
              <button
                type="button"
                role="option"
                aria-selected={active}
                className={`cam-results-item${active ? ' is-selected' : ''}`}
                onClick={() => onSelect(b.id)}
              >
                <span className="cam-results-index">{i + 1}</span>
                <span className="cam-results-body">
                  {b.text ? <span className="cam-detail-src">{b.text}</span> : null}
                  {b.translated ? <span className="cam-detail-tr">{b.translated}</span> : null}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="cam-detail-actions">
        <button
          type="button"
          className="cam-tool-btn cam-tool-btn--primary"
          onClick={() => onOpenDetails(selected)}
        >
          <BiText copy={ui.camOpenDetails} size="sm" />
        </button>
      </div>
    </div>
  )
}
