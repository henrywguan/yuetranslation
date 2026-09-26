import { SUPPORTED_LANG_CARDS } from './supportedLangs'
import { biPlain, ui } from '../lib/uiCopy'

const LOOP = [...SUPPORTED_LANG_CARDS, ...SUPPORTED_LANG_CARDS]

/** Aceternity Infinite Moving Cards — Harbor jade chips for every supported language. */
export function LangMarquee() {
  return (
    <section className="ln-lang-marquee" aria-label={biPlain(ui.langMarqueeLabel)}>
      <div className="ln-lang-marquee-fade" aria-hidden="true" />
      <div className="ln-lang-marquee-viewport">
        <ul className="ln-lang-marquee-track">
          {LOOP.map((lang, i) => (
            <li
              key={`${lang.id}-${i}`}
              className={`ln-lang-chip${lang.voice ? '' : ' is-text'}`}
              data-dup={i >= SUPPORTED_LANG_CARDS.length ? '' : undefined}
            >
              <span className="ln-lang-chip-mark" aria-hidden="true">
                {lang.mark}
              </span>
              <span className="ln-lang-chip-copy">
                <strong>{lang.native}</strong>
                <em>{lang.en}</em>
              </span>
              {!lang.voice ? (
                <span className="ln-lang-chip-kind">{biPlain(ui.langMarqueeType)}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
