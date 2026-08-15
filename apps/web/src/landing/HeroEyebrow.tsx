import { useJpPopup } from '../lib/useJpPopup'
import { ui } from '../lib/uiCopy'
import { JpPop } from '../components/JpPop'

/** Hero pill: EN↔粵 stacks with aligned arrows; live label centered under its English. */
export function HeroEyebrow() {
  const { tipId, show, bind } = useJpPopup(Boolean(ui.heroEyebrow.jp))
  const e = ui.heroEyebrow

  return (
    <span className="ln-eyebrow" {...bind}>
      <span className="ln-eyebrow-row">
        <span className="ln-eyebrow-stack">
          <span className="ln-eyebrow-en">{e.enLang}</span>
          <span className="ln-eyebrow-zh" lang="zh-HK">
            {e.zhLang}
          </span>
        </span>
        <span className="ln-eyebrow-arrow-stack" aria-hidden="true">
          <span className="ln-eyebrow-en">↔</span>
          <span className="ln-eyebrow-zh">↔</span>
        </span>
        <span className="ln-eyebrow-stack">
          <span className="ln-eyebrow-en">{e.enYue}</span>
          <span className="ln-eyebrow-zh" lang="zh-HK">
            {e.zhYue}
          </span>
        </span>
        <span className="ln-eyebrow-stack ln-eyebrow-live">
          <span className="ln-eyebrow-en">{e.enLive}</span>
          <span className="ln-eyebrow-zh" lang="zh-HK">
            {e.zhLive}
          </span>
        </span>
      </span>
      <JpPop show={show} id={tipId} text={e.jp} />
    </span>
  )
}
