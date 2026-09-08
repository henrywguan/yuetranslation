import { useJpPopup } from '../lib/useJpPopup'
import { primaryLangLabel } from '../lib/primaryLanguagePref'
import { useYueStore } from '../lib/store'
import { JpPop } from './JpPop'

/** App chrome tag under the logo — follows Account hub primary language. */
export function BrandTag() {
  const primaryLanguage = useYueStore((s) => s.primaryLanguage)
  const tag = primaryLangLabel(primaryLanguage)
  const { tipId, show, bind, wrapRef } = useJpPopup(Boolean(tag.jp))

  return (
    <p className="brand-tag">
      <span className="brand-tag-inner" {...bind}>
        <span className="brand-tag-stack">
          <span className="brand-tag-en">{tag.en}</span>
          <span className="brand-tag-zh">{tag.zh}</span>
        </span>
        {tag.jp ? <JpPop show={show} id={tipId} han={tag.zh} anchorRef={wrapRef} /> : null}
      </span>
    </p>
  )
}
