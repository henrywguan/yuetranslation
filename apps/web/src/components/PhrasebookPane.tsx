import { useState } from 'react'
import { useYueStore } from '../lib/store'
import { formatPhrasebookExport } from '../lib/phrasebook'
import { biPlain, ui } from '../lib/uiCopy'
import { BiText } from './BiText'
import { LangLine, langShort } from './HistoryCard'
import { ShareButton } from './ShareButton'
import { SpeakButton } from './SpeakButton'

/** Starred phrases — local device list with unstar + copy / share export. */
export function PhrasebookPane({
  className = '',
  onOpenBreakdown,
}: {
  className?: string
  onOpenBreakdown?: () => void
}) {
  const cards = useYueStore((s) => s.phrasebook)
  const removePhrase = useYueStore((s) => s.removePhrase)
  const openBreakdown = useYueStore((s) => s.openBreakdown)
  const [copied, setCopied] = useState(false)

  if (!cards.length) {
    return (
      <div className={`history-pane history-pane--empty ${className}`.trim()}>
        <p className="history-empty">
          <BiText copy={ui.phrasebookEmpty} size="sm" layout="inline" />
        </p>
      </div>
    )
  }

  const exportText = formatPhrasebookExport(cards)

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(exportText)
    } catch {
      const area = document.createElement('textarea')
      area.value = exportText
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.left = '-9999px'
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      document.body.removeChild(area)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={`history-pane phrasebook-pane ${className}`.trim()}>
      <div className="phrasebook-toolbar">
        <span className="phrasebook-count">
          <BiText copy={ui.phrasebookCount} size="sm" layout="inline" hideJp /> · {cards.length}
        </span>
        <div className="phrasebook-toolbar-actions">
          <button
            type="button"
            className={`phrasebook-copy-btn${copied ? ' is-copied' : ''}`}
            onClick={() => void copyAll()}
            aria-label={biPlain(copied ? ui.copied : ui.phrasebookCopy)}
            title={biPlain(copied ? ui.copied : ui.phrasebookCopy)}
          >
            <BiText copy={copied ? ui.copied : ui.phrasebookCopy} size="sm" layout="inline" hideJp />
          </button>
          <ShareButton text={exportText} title="JyutTranslate phrasebook" />
        </div>
      </div>
      <div className="history-card-list" role="list">
        {cards.map((card) => (
          <div key={card.id} role="listitem">
            <article className="history-card phrasebook-card">
              <div className="history-card-top">
                <span className="history-card-dir">
                  {langShort(card.from)} → {langShort(card.to)}
                </span>
                <div className="history-card-top-actions">
                  <SpeakButton text={card.translation} lang={card.to} warm={false} />
                  <button
                    type="button"
                    className="copy-btn star-btn is-starred"
                    aria-label={biPlain(ui.phrasebookUnstar)}
                    title={biPlain(ui.phrasebookUnstar)}
                    onClick={() => removePhrase(card.id)}
                  >
                    <svg className="copy-btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="m12 4.4 2.38 4.82 5.32.77-3.85 3.75.91 5.3L12 16.55l-4.76 2.5.91-5.3L4.3 9.99l5.32-.77L12 4.4Z"
                        fill="currentColor"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="history-card-body phrasebook-card-body">
                <div className="history-card-block">
                  <div className="history-card-line-wrap">
                    <LangLine
                      lang={card.from}
                      text={card.source}
                      romanization={card.romanization}
                      onBreakdown={(phrase) => {
                        openBreakdown(phrase, { lang: card.from, translation: card.translation })
                        onOpenBreakdown?.()
                      }}
                    />
                  </div>
                </div>
                <div className="history-card-block">
                  <div className="history-card-line-wrap">
                    <LangLine
                      lang={card.to}
                      text={card.translation}
                      romanization={card.romanization}
                      onBreakdown={(phrase) => {
                        openBreakdown(phrase, { lang: card.to, translation: card.source })
                        onOpenBreakdown?.()
                      }}
                    />
                  </div>
                </div>
              </div>
            </article>
          </div>
        ))}
      </div>
    </div>
  )
}
