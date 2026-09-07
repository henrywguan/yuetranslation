import { useJpPopup } from '../lib/useJpPopup'
import { ui } from '../lib/uiCopy'
import { JpPop } from '../components/JpPop'

/**
 * Hero pill: Cantonese Language Tool / 粵語翻譯器.
 */
export function HeroEyebrow() {
  const e = ui.heroEyebrow
  const enabled = Boolean(e.jp.trim())
  const { tipId, show, bind, wrapRef } = useJpPopup(enabled)

  return (
    <span className="ln-eyebrow">
      <span
        {...bind}
        className={`ln-eyebrow-stack${enabled ? ' is-hint' : ''}`}
        lang="zh-HK"
      >
        <span className="ln-eyebrow-en">{e.en}</span>
        <span className="ln-eyebrow-zh">{e.zh}</span>
        {enabled ? <JpPop show={show} id={tipId} han={e.zh} anchorRef={wrapRef} /> : null}
      </span>
    </span>
  )
}
