import { useJpPopup } from '../lib/useJpPopup'
import { ui } from '../lib/uiCopy'
import { JpPop } from '../components/JpPop'

/** Footer tagline: English line + Cantonese translation with Jyutping popup. */
export function FooterLangPair() {
  const line = ui.footerTagline
  const jp = useJpPopup(Boolean(line.jp))

  return (
    <p className="ln-footer-langs">
      <span className="ln-footer-langs-row">
        <span className="ln-footer-lang-stack">
          <span className="ln-footer-lang-en">{line.en}</span>
          <span className="ln-footer-lang-zh" lang="zh-HK" {...jp.bind}>
            {line.zh}
            <JpPop show={jp.show} id={jp.tipId} han={line.zh} anchorRef={jp.wrapRef} />
          </span>
        </span>
      </span>
    </p>
  )
}
