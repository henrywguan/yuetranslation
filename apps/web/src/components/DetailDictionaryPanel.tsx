import type { DictionaryEntry } from '../lib/api'
import type { Lang } from '../lib/types'
import { hasHan } from '../lib/charGloss'
import { BiText } from './BiText'
import { CantoneseText } from './CantoneseText'
import { MandarinText } from './MandarinText'
import { DetailCollapsible } from './DetailCollapsible'
import { ui } from '../lib/uiCopy'

type Props = {
  entry: DictionaryEntry | null
  loading: boolean
  /** Account Hub primary — how to render gloss lines (Jyutping / pinyin / plain). */
  glossLang?: Lang
}

/**
 * Render gloss / example / usage lines.
 * Han + Yue (primary or lemma) → Jyutping + Chao tone letters ruby; Han + Cmn → pinyin ruby.
 */
function GlossLine({
  text,
  glossLang,
  lemmaLang,
  className,
  muted,
}: {
  text: string
  glossLang?: Lang
  lemmaLang?: Lang
  className?: string
  muted?: boolean
}) {
  const trimmed = text.trim()
  if (!trimmed) return null
  const cls = [className, muted ? 'muted' : ''].filter(Boolean).join(' ')
  const wantYueRuby =
    hasHan(trimmed) && (glossLang === 'yue' || lemmaLang === 'yue')
  const wantCmnRuby =
    hasHan(trimmed) && !wantYueRuby && (glossLang === 'cmn' || lemmaLang === 'cmn')
  if (wantYueRuby) {
    return <CantoneseText text={trimmed} className={cls || undefined} jpMode="inline" />
  }
  if (wantCmnRuby) {
    return <MandarinText text={trimmed} className={cls || undefined} />
  }
  return (
    <span className={cls || undefined} lang={glossLang || lemmaLang || undefined}>
      {trimmed}
    </span>
  )
}

/** AI / multi-source dictionary block inside Details — nested sections collapse. */
export function DetailDictionaryPanel({ entry, loading, glossLang }: Props) {
  if (loading && !entry) {
    return (
      <DetailCollapsible title={ui.detailDictionary} className="detail-dict" defaultOpen={false}>
        <p className="muted" aria-busy="true">
          <BiText copy={ui.detailDictionaryLoading} size="sm" />
        </p>
      </DetailCollapsible>
    )
  }
  if (!entry) return null
  const renderLang = glossLang || entry.glossLang || entry.lang
  const lemmaLang = entry.lang
  // Cantonese: never surface AI IPA/pinyin — title + ruby already show LSHK Jyutping + Chao tone letters.
  const showAiPron = Boolean(entry.pronunciation) && lemmaLang !== 'yue'
  const hasBody =
    entry.senses.length > 0 ||
    entry.examples.length > 0 ||
    entry.usageNotes.length > 0 ||
    entry.media.length > 0 ||
    showAiPron
  if (!hasBody) return null

  return (
    <DetailCollapsible
      title={ui.detailDictionary}
      className="detail-dict"
      defaultOpen={false}
      meta={
        entry.provenance.length ? entry.provenance.join(' · ') : undefined
      }
    >
      {showAiPron ? (
        <p className="detail-dict-pron" lang="en">
          /{entry.pronunciation!.replace(/^\/|\/$/g, '')}/
        </p>
      ) : null}
      {entry.senses.length ? (
        <DetailCollapsible
          title={ui.detailSenses}
          className="detail-dict-block"
          headingLevel="h4"
          defaultOpen
        >
          <ul className="detail-dict-senses">
            {entry.senses.map((s, i) => (
              <li key={`sense-${i}`}>
                {s.pos ? <span className="detail-dict-pos">{s.pos}</span> : null}
                <GlossLine
                  text={s.gloss}
                  glossLang={renderLang}
                  lemmaLang={lemmaLang}
                  className="detail-dict-gloss"
                />
                {s.note ? (
                  <GlossLine
                    text={s.note}
                    glossLang={renderLang}
                    lemmaLang={lemmaLang}
                    className="detail-dict-note"
                    muted
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </DetailCollapsible>
      ) : null}
      {entry.examples.length ? (
        <DetailCollapsible
          title={ui.detailExamples}
          className="detail-dict-block"
          headingLevel="h4"
          defaultOpen
        >
          <ul className="detail-dict-examples">
            {entry.examples.map((ex, i) => (
              <li key={`ex-${i}`}>
                <p className="detail-dict-ex-text">
                  <GlossLine text={ex.text} glossLang={renderLang} lemmaLang={lemmaLang} />
                </p>
                {ex.translation ? (
                  <p className="detail-dict-ex-tr muted">{ex.translation}</p>
                ) : null}
                {ex.note ? (
                  <p className="detail-dict-note muted">
                    <GlossLine
                      text={ex.note}
                      glossLang={renderLang}
                      lemmaLang={lemmaLang}
                      muted
                    />
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </DetailCollapsible>
      ) : null}
      {entry.usageNotes.length ? (
        <DetailCollapsible
          title={ui.detailUsage}
          className="detail-dict-block"
          headingLevel="h4"
          defaultOpen
        >
          <ul className="detail-dict-usage">
            {entry.usageNotes.map((n, i) => (
              <li key={`note-${i}`}>
                <GlossLine text={n} glossLang={renderLang} lemmaLang={lemmaLang} />
              </li>
            ))}
          </ul>
        </DetailCollapsible>
      ) : null}
      {entry.media.map((m, i) =>
        m.type === 'emoji' && m.emoji ? (
          <figure key={`media-${i}`} className="detail-dict-media detail-dict-media--emoji">
            <span className="detail-dict-emoji" role="img" aria-label={m.alt || entry.lemma}>
              {m.emoji}
            </span>
            <figcaption className="muted">{m.source}</figcaption>
          </figure>
        ) : m.type === 'image' || m.type === 'gif' ? (
          <figure key={`media-${i}`} className="detail-dict-media">
            <img
              src={m.previewUrl || m.url}
              alt={m.alt || entry.lemma}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <figcaption className="muted">{m.source}</figcaption>
          </figure>
        ) : null,
      )}
    </DetailCollapsible>
  )
}
