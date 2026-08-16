import { useJpPopup } from '../lib/useJpPopup'
import { ui } from '../lib/uiCopy'
import { JpPop } from '../components/JpPop'

/** One Chinese phrase with a single Jyutping popup for the whole stack. */
function EyebrowZhPhrase({ zh, jp }: { zh: string; jp: string }) {
  const enabled = Boolean(jp.trim())
  const { tipId, show, bind } = useJpPopup(enabled)

  return (
    <span {...bind} className={`ln-eyebrow-zh${enabled ? ' is-hint' : ''}`} lang="zh-HK">
      {zh}
      {enabled ? <JpPop show={show} id={tipId} text={jp} han={zh} /> : null}
    </span>
  )
}

/**
 * Hero pill: English / Cantonese / Live translator stacks.
 * Each Chinese phrase gets one Jyutping popup (not per character).
 */
export function HeroEyebrow() {
  const e = ui.heroEyebrow

  return (
    <span className="ln-eyebrow">
      <span className="ln-eyebrow-row">
        <span className="ln-eyebrow-stack">
          <span className="ln-eyebrow-en">{e.enLang}</span>
          <EyebrowZhPhrase zh={e.zhLang} jp={e.jpLang} />
        </span>
        <span className="ln-eyebrow-arrow-stack" aria-hidden="true">
          <span className="ln-eyebrow-en">↔</span>
          <span className="ln-eyebrow-zh ln-eyebrow-zh--plain">↔</span>
        </span>
        <span className="ln-eyebrow-stack">
          <span className="ln-eyebrow-en">{e.enYue}</span>
          <EyebrowZhPhrase zh={e.zhYue} jp={e.jpYue} />
        </span>
        <span className="ln-eyebrow-stack ln-eyebrow-live">
          <span className="ln-eyebrow-en">{e.enLive}</span>
          <EyebrowZhPhrase zh={e.zhLive} jp={e.jpLive} />
        </span>
      </span>
    </span>
  )
}
