import { useYueStore } from '../lib/store'
import type { CantoneseRomanization } from '../lib/romanizationPref'
import { biPlain, ui } from '../lib/uiCopy'
import { BiText } from './BiText'

const OPTIONS: Array<{ id: CantoneseRomanization; label: typeof ui.romanizationJyutping }> = [
  { id: 'jyutping', label: ui.romanizationJyutping },
  { id: 'yale', label: ui.romanizationYale },
]

/** Jyutping (default) / Yale display switch for Cantonese results. */
export function CantoneseRomanizationToggle({ className = '' }: { className?: string }) {
  const mode = useYueStore((s) => s.cantoneseRomanization)
  const setMode = useYueStore((s) => s.setCantoneseRomanization)

  return (
    <div
      className={`canto-roman-toggle ${className}`.trim()}
      role="group"
      aria-label={biPlain(ui.romanizationToggle)}
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          className={`canto-roman-toggle-btn${mode === opt.id ? ' is-active' : ''}`}
          aria-pressed={mode === opt.id}
          onClick={() => setMode(opt.id)}
        >
          <BiText copy={opt.label} size="sm" only="en" hideJp />
        </button>
      ))}
    </div>
  )
}
