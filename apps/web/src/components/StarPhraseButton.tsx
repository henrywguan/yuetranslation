import { useYueStore } from '../lib/store'
import { isStarred, type PhraseCard } from '../lib/phrasebook'
import { biPlain, ui } from '../lib/uiCopy'
import type { Lang } from '../lib/types'

/** Star / unstar a translation pair in the local phrasebook. */
export function StarPhraseButton({
  source,
  translation,
  from,
  to,
  romanization,
  origin = 'solo',
  className = '',
}: {
  source: string
  translation: string
  from: Lang
  to: Lang
  romanization?: string
  origin?: PhraseCard['origin']
  className?: string
}) {
  const src = source.trim()
  const tr = translation.trim()
  const phrasebook = useYueStore((s) => s.phrasebook)
  const toggle = useYueStore((s) => s.toggleStarPhrase)

  if (!src || !tr) return null

  const starred = isStarred(phrasebook, src, tr, from, to)
  const label = starred ? ui.phrasebookUnstar : ui.phrasebookStar

  return (
    <button
      type="button"
      className={`copy-btn star-btn${starred ? ' is-starred' : ''} ${className}`.trim()}
      aria-pressed={starred}
      aria-label={biPlain(label)}
      title={biPlain(label)}
      onClick={(e) => {
        e.stopPropagation()
        toggle({ source: src, translation: tr, from, to, romanization, origin })
      }}
    >
      <svg className="copy-btn-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="m12 4.4 2.38 4.82 5.32.77-3.85 3.75.91 5.3L12 16.55l-4.76 2.5.91-5.3L4.3 9.99l5.32-.77L12 4.4Z"
          fill={starred ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
