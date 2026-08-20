import { useJpPopup } from '../lib/useJpPopup'
import { ui } from '../lib/uiCopy'
import { JpPop } from './JpPop'

function splitPair(line: string) {
  const [left, right] = line.split(/\s*↔\s*/)
  return { left: left?.trim() || line, right: right?.trim() || '' }
}

/** English ↔ Cantonese stacked so both arrows share one column. */
export function BrandTag() {
  const en = splitPair(ui.brandTag.en)
  const zh = splitPair(ui.brandTag.zh)
  const { tipId, show, bind, wrapRef } = useJpPopup(Boolean(ui.brandTag.jp))

  return (
    <p className="brand-tag">
      <span className="brand-tag-inner" {...bind}>
        <span className="brand-pair">
          <span className="bp-side bp-end">{en.left}</span>
          <span className="bp-arrow" aria-hidden="true">
            ↔
          </span>
          <span className="bp-side">{en.right}</span>
          <span className="bp-side bp-end">{zh.left}</span>
          <span className="bp-arrow" aria-hidden="true">
            ↔
          </span>
          <span className="bp-side">{zh.right}</span>
        </span>
        <JpPop show={show} id={tipId} han={ui.brandTag.zh} anchorRef={wrapRef} />
      </span>
    </p>
  )
}
