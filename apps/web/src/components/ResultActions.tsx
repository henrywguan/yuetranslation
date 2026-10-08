import { hasHan } from '../lib/jyutping'
import { copyableText } from '../lib/copyText'
import type { Lang } from '../lib/types'
import { CopyButton } from './CopyButton'
import { CopyJyutpingButton } from './CopyJyutpingButton'
import { JyutpingFontTip } from './JyutpingFontTip'
import { SayItBack } from './SayItBack'
import { ShareButton } from './ShareButton'
import { SpeakButton } from './SpeakButton'
import { StarPhraseButton } from './StarPhraseButton'

/** Source side of a result — lets the star control save a full phrase pair. */
export type ResultPair = {
  source: string
  from: Lang
  romanization?: string
  origin?: 'solo' | 'conversation' | 'camera' | 'manual'
}

/** Speak + copy controls stacked beside a translation result. */
export function ResultActions({
  text,
  lang,
  className = '',
  showCopy = true,
  /** Second copy control: Jyutping + Chao tone letters (Details / Cantonese creators). */
  showJyutpingCopy = false,
  /** When set, shows a phrasebook star for source → this line. */
  pair,
  showShare = true,
}: {
  text: string
  lang: Lang
  className?: string
  showCopy?: boolean
  showJyutpingCopy?: boolean
  pair?: ResultPair
  showShare?: boolean
}) {
  const trimmed = text.trim()
  if (!trimmed) return null

  const showJyutping = lang === 'yue' && showJyutpingCopy && hasHan(trimmed)
  const sharePayload =
    lang === 'yue' || lang === 'cmn' ? copyableText(trimmed, lang) || trimmed : trimmed
  const showMinor = showShare || Boolean(pair)

  return (
    <div className={`result-actions ${className}`.trim()}>
      <div className="result-actions-stack">
        <SpeakButton text={trimmed} lang={lang} />
        {lang === 'yue' ? <SayItBack text={trimmed} /> : null}
        {(lang === 'yue' || lang === 'cmn') && showCopy ? (
          <CopyButton text={trimmed} lang={lang} />
        ) : null}
        {showJyutping ? <CopyJyutpingButton text={trimmed} /> : null}
        {showMinor ? (
          <div className="result-actions-minor">
            {pair ? (
              <StarPhraseButton
                source={pair.source}
                translation={trimmed}
                from={pair.from}
                to={lang}
                romanization={pair.romanization}
                origin={pair.origin}
              />
            ) : null}
            {showShare ? <ShareButton text={sharePayload} /> : null}
          </div>
        ) : null}
      </div>
      {showJyutping ? <JyutpingFontTip /> : null}
    </div>
  )
}
