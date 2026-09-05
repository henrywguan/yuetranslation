import { useEffect } from 'react'
import { useTextScramble } from '../lib/useTextScramble'

const BRAND_EN = 'JyutTranslate'
const BRAND_ZH = '粵翻譯'

/**
 * Homepage wordmark: loads as 粵翻譯, scrambles into JyutTranslate,
 * then toggles back to 粵翻譯 on hover / focus.
 */
export function BrandScramble() {
  const { text, scrambleTo, busy } = useTextScramble(BRAND_ZH)
  const showingZh = /[\u4e00-\u9fff]/.test(text)

  useEffect(() => {
    // Brief beat so the Chinese brand reads before the decode.
    const t = window.setTimeout(() => scrambleTo(BRAND_EN), 420)
    return () => window.clearTimeout(t)
  }, [scrambleTo])

  return (
    <span
      className={`brand-scramble${busy ? ' is-scrambling' : ''}`}
      lang={showingZh ? 'zh-HK' : 'en'}
      tabIndex={0}
      aria-label="JyutTranslate"
      title="JyutTranslate · 粵翻譯"
      onPointerEnter={() => scrambleTo(BRAND_ZH)}
      onPointerLeave={() => scrambleTo(BRAND_EN)}
      onFocus={() => scrambleTo(BRAND_ZH)}
      onBlur={() => scrambleTo(BRAND_EN)}
    >
      <span className="brand-scramble-spacer" aria-hidden="true">
        {BRAND_EN}
      </span>
      <span className="brand-scramble-live" aria-hidden="true">
        {text}
      </span>
    </span>
  )
}
