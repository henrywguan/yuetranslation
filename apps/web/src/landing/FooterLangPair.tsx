import { useJpPopup } from '../lib/useJpPopup'
import { ui } from '../lib/uiCopy'
import { JpPop } from '../components/JpPop'

/** Footer: English ↔ Cantonese with 英文 / 粵語 centered under each word; separate Jyutping popups. */
export function FooterLangPair() {
  const en = ui.footerEnLang
  const yue = ui.footerYueLang
  const enJp = useJpPopup(Boolean(en.jp))
  const yueJp = useJpPopup(Boolean(yue.jp))

  return (
    <p className="ln-footer-langs">
      <span className="ln-footer-langs-row">
        <span className="ln-footer-lang-stack">
          <span className="ln-footer-lang-en">{en.en}</span>
          <span className="ln-footer-lang-zh" lang="zh-HK" {...enJp.bind}>
            {en.zh}
            <JpPop show={enJp.show} id={enJp.tipId} text={en.jp} han={en.zh} />
          </span>
        </span>
        <span className="ln-footer-lang-arrow-stack" aria-hidden="true">
          <span className="ln-footer-lang-en">↔</span>
          <span className="ln-footer-lang-zh ln-footer-lang-zh--arrow">↔</span>
        </span>
        <span className="ln-footer-lang-stack">
          <span className="ln-footer-lang-en">{yue.en}</span>
          <span className="ln-footer-lang-zh" lang="zh-HK" {...yueJp.bind}>
            {yue.zh}
            <JpPop show={yueJp.show} id={yueJp.tipId} text={yue.jp} han={yue.zh} />
          </span>
        </span>
      </span>
    </p>
  )
}
