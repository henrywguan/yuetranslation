import { useEffect, useState } from 'react'
import { useJpPopup } from '../lib/useJpPopup'
import { ensureJyutpingSegs, type JyutSeg } from '../lib/jyutping'
import { ui } from '../lib/uiCopy'
import { JpPop } from '../components/JpPop'

/** One Chinese character with its own Jyutping popup (char above romanization). */
function EyebrowZhChar({ char, jp }: { char: string; jp: string }) {
  const enabled = Boolean(jp.trim())
  const { tipId, show, bind } = useJpPopup(enabled)

  return (
    <span
      {...bind}
      className={`ln-eyebrow-zh-char${enabled ? ' is-hint' : ''}`}
      lang="zh-HK"
    >
      {char}
      {enabled ? <JpPop show={show} id={tipId} text={jp} han={char} /> : null}
    </span>
  )
}

/** Split a Chinese phrase into per-character Jyutping hit targets. */
function EyebrowZhPhrase({ text }: { text: string }) {
  const [segs, setSegs] = useState<JyutSeg[]>([])

  useEffect(() => {
    let cancelled = false
    void ensureJyutpingSegs(text).then((next) => {
      if (!cancelled) setSegs(next)
    })
    return () => {
      cancelled = true
    }
  }, [text])

  if (!segs.length) {
    return (
      <span className="ln-eyebrow-zh" lang="zh-HK">
        {text}
      </span>
    )
  }

  return (
    <span className="ln-eyebrow-zh" lang="zh-HK">
      {segs.map((seg, i) => (
        <EyebrowZhChar key={`${seg.char}-${i}`} char={seg.char} jp={seg.jp} />
      ))}
    </span>
  )
}

/** Hero pill: EN↔粵 stacks with aligned arrows; live label centered under its English. */
export function HeroEyebrow() {
  const e = ui.heroEyebrow

  return (
    <span className="ln-eyebrow">
      <span className="ln-eyebrow-row">
        <span className="ln-eyebrow-stack">
          <span className="ln-eyebrow-en">{e.enLang}</span>
          <EyebrowZhPhrase text={e.zhLang} />
        </span>
        <span className="ln-eyebrow-arrow-stack" aria-hidden="true">
          <span className="ln-eyebrow-en">↔</span>
          <span className="ln-eyebrow-zh ln-eyebrow-zh--plain">↔</span>
        </span>
        <span className="ln-eyebrow-stack">
          <span className="ln-eyebrow-en">{e.enYue}</span>
          <EyebrowZhPhrase text={e.zhYue} />
        </span>
        <span className="ln-eyebrow-stack ln-eyebrow-live">
          <span className="ln-eyebrow-en">{e.enLive}</span>
          <EyebrowZhPhrase text={e.zhLive} />
        </span>
      </span>
    </span>
  )
}
