import type { DictionaryEntry } from '../lib/api'
import { BiText } from './BiText'
import { ui } from '../lib/uiCopy'

type Props = {
  entry: DictionaryEntry | null
  loading: boolean
}

/** AI / multi-source dictionary block inside Details. */
export function DetailDictionaryPanel({ entry, loading }: Props) {
  if (loading && !entry) {
    return (
      <section className="detail-dict" aria-busy="true">
        <h3>
          <BiText copy={ui.detailDictionary} size="sm" />
        </h3>
        <p className="muted">
          <BiText copy={ui.detailDictionaryLoading} size="sm" />
        </p>
      </section>
    )
  }
  if (!entry) return null
  const hasBody =
    entry.senses.length > 0 ||
    entry.examples.length > 0 ||
    entry.usageNotes.length > 0 ||
    entry.media.length > 0 ||
    Boolean(entry.pronunciation)
  if (!hasBody) return null

  return (
    <section className="detail-dict" aria-label="Dictionary">
      <div className="detail-dict-head">
        <h3>
          <BiText copy={ui.detailDictionary} size="sm" />
        </h3>
        {entry.provenance.length ? (
          <p className="detail-dict-provenance muted">
            {entry.provenance.join(' · ')}
          </p>
        ) : null}
      </div>
      {entry.pronunciation ? (
        <p className="detail-dict-pron" lang="en">
          /{entry.pronunciation.replace(/^\/|\/$/g, '')}/
        </p>
      ) : null}
      {entry.senses.length ? (
        <div className="detail-dict-block">
          <h4>
            <BiText copy={ui.detailSenses} size="sm" />
          </h4>
          <ul className="detail-dict-senses">
            {entry.senses.map((s, i) => (
              <li key={`sense-${i}`}>
                {s.pos ? <span className="detail-dict-pos">{s.pos}</span> : null}
                <span className="detail-dict-gloss">{s.gloss}</span>
                {s.note ? <span className="detail-dict-note muted">{s.note}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {entry.examples.length ? (
        <div className="detail-dict-block">
          <h4>
            <BiText copy={ui.detailExamples} size="sm" />
          </h4>
          <ul className="detail-dict-examples">
            {entry.examples.map((ex, i) => (
              <li key={`ex-${i}`}>
                <p className="detail-dict-ex-text">{ex.text}</p>
                {ex.translation ? (
                  <p className="detail-dict-ex-tr muted">{ex.translation}</p>
                ) : null}
                {ex.note ? <p className="detail-dict-note muted">{ex.note}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {entry.usageNotes.length ? (
        <div className="detail-dict-block">
          <h4>
            <BiText copy={ui.detailUsage} size="sm" />
          </h4>
          <ul className="detail-dict-usage">
            {entry.usageNotes.map((n, i) => (
              <li key={`note-${i}`}>{n}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {entry.media.map((m, i) =>
        m.type === 'gif' ? (
          <figure key={`media-${i}`} className="detail-dict-media">
            <img src={m.previewUrl || m.url} alt={m.alt || entry.lemma} loading="lazy" />
            <figcaption className="muted">{m.source}</figcaption>
          </figure>
        ) : null,
      )}
    </section>
  )
}
