import { useJpPopup } from '../lib/useJpPopup'
import { ui } from '../lib/uiCopy'
import { JpPop } from '../components/JpPop'

/**
 * One kicker stack = one Jyutping popup for the whole Chinese phrase
 * (never per-character tips).
 */
function EyebrowStack({
  en,
  zh,
  jp,
  className = '',
}: {
  en: string
  zh: string
  jp: string
  className?: string
}) {
  const enabled = Boolean(jp.trim())
  const { tipId, show, bind, wrapRef } = useJpPopup(enabled)

  return (
    <span
      {...bind}
      className={`ln-eyebrow-stack${enabled ? ' is-hint' : ''}${className ? ` ${className}` : ''}`}
      lang="zh-HK"
    >
      <span className="ln-eyebrow-en">{en}</span>
      <span className="ln-eyebrow-zh">{zh}</span>
      {enabled ? (
        <JpPop
          show={show}
          id={tipId}
          text={jp}
          /* Phrase tip only — do not pass `han` (that enables per-char ruby cells). */
          anchorRef={wrapRef}
        />
      ) : null}
    </span>
  )
}

/**
 * Hero pill: English / Cantonese / Live translator.
 * Exactly three Jyutping popups — one per phrase stack.
 */
export function HeroEyebrow() {
  const e = ui.heroEyebrow

  return (
    <span className="ln-eyebrow">
      <span className="ln-eyebrow-row">
        <EyebrowStack en={e.enLang} zh={e.zhLang} jp={e.jpLang} />
        <span className="ln-eyebrow-arrow-stack" aria-hidden="true">
          <span className="ln-eyebrow-en">↔</span>
          <span className="ln-eyebrow-zh ln-eyebrow-zh--plain">↔</span>
        </span>
        <EyebrowStack en={e.enYue} zh={e.zhYue} jp={e.jpYue} />
        <EyebrowStack en={e.enLive} zh={e.zhLive} jp={e.jpLive} className="ln-eyebrow-live" />
      </span>
    </span>
  )
}
