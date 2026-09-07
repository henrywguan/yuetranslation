import { useJpPopup } from '../lib/useJpPopup'
import { ui } from '../lib/uiCopy'
import { JpPop } from './JpPop'

/** App chrome tag under the logo — bilingual product line. */
export function BrandTag() {
  const { tipId, show, bind, wrapRef } = useJpPopup(Boolean(ui.brandTag.jp))

  return (
    <p className="brand-tag">
      <span className="brand-tag-inner" {...bind}>
        <span className="brand-tag-stack">
          <span className="brand-tag-en">{ui.brandTag.en}</span>
          <span className="brand-tag-zh">{ui.brandTag.zh}</span>
        </span>
        <JpPop show={show} id={tipId} han={ui.brandTag.zh} anchorRef={wrapRef} />
      </span>
    </p>
  )
}
