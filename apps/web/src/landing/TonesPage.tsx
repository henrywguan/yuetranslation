import { motion } from 'framer-motion'
import { BiText } from '../components/BiText'
import { openApp, openHome } from '../lib/siteLinks'
import { inkEase } from '../lib/motion'
import { useYueStore } from '../lib/store'
import { unlockTtsPlayback } from '../lib/tts'
import { useReducedMotion } from '../lib/useReducedMotion'
import { ui } from '../lib/uiCopy'
import { MarketingCtaBand } from './MarketingCtaBand'
import { MarketingFooter } from './MarketingFooter'
import { MarketingPageShell } from './MarketingPageShell'
import { Reveal } from './Reveal'
import { ToneContour } from './tones/ToneContour'
import { ToneRuby, ToneTheater } from './tones/ToneTheater'
import { TONE_TWINS } from './tones/tonesData'
import './landing.css'
import './tones.css'

/** Cinematic ELI5 explainer for the six Cantonese tones. */
export function TonesPage() {
  const reduce = useReducedMotion()

  return (
    <MarketingPageShell className="tones-page" onFeatures={() => openHome()}>
        <header className="tones-hero tones-hero--compact">
          <div className="tones-hero-wash" aria-hidden="true" />
          <motion.div
            className="tones-hero-inner"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: inkEase }}
          >
            <span className="ln-kicker">
              <BiText copy={ui.tonesKicker} size="sm" />
            </span>
            <h1 className="tones-hero-title">
              <BiText copy={ui.tonesHeroTitle} size="lg" />
            </h1>
            <p className="tones-hero-sub">
              <BiText copy={ui.tonesHeroSub} size="md" hideJp />
            </p>
          </motion.div>
        </header>

        <section className="tones-act tones-act--theater" aria-label={ui.navTones.en}>
          <Reveal y={36}>
            <ToneTheater />
          </Reveal>
        </section>

        <section className="tones-act tones-act--twins" aria-label={ui.tonesTwinsTitle.en}>
          <Reveal className="tones-twins" y={36}>
            <h2 className="tones-twins-title">
              <BiText copy={ui.tonesTwinsTitle} size="lg" />
            </h2>
            <div className="tones-twins-stage">
              <TwinCard
                side="buy"
                han={TONE_TWINS.buy.han}
                jp={TONE_TWINS.buy.jp}
                chao={TONE_TWINS.buy.chao}
                label={ui.tonesBuy}
                contour={TONE_TWINS.buy.contour}
                reduce={reduce}
              />
              <div className="tones-twins-vs" aria-hidden="true">
                <span />
              </div>
              <TwinCard
                side="sell"
                han={TONE_TWINS.sell.han}
                jp={TONE_TWINS.sell.jp}
                chao={TONE_TWINS.sell.chao}
                label={ui.tonesSell}
                contour={TONE_TWINS.sell.contour}
                reduce={reduce}
              />
            </div>
          </Reveal>
        </section>

        <MarketingCtaBand
          className="tones-cta"
          title={ui.tonesCtaTitle}
          body={ui.tonesCtaBody}
          button={ui.tonesOpenApp}
          onClick={() => openApp()}
        />

        <MarketingFooter />
    </MarketingPageShell>
  )
}

function TwinCard({
  side,
  han,
  jp,
  chao,
  label,
  contour,
  reduce,
}: {
  side: 'buy' | 'sell'
  han: string
  jp: string
  chao: string
  label: (typeof ui)['tonesBuy']
  contour: (typeof TONE_TWINS.buy)['contour']
  reduce: boolean
}) {
  const speakManual = useYueStore((s) => s.speakManual)
  const speakingText = useYueStore((s) => s.speakingText)
  const status = useYueStore((s) => s.status)
  const speaking = status === 'speaking' && speakingText === han

  return (
    <button
      type="button"
      className={`tones-twin tones-twin--${side}${speaking ? ' is-speaking' : ''}`}
      onClick={() => {
        unlockTtsPlayback()
        void speakManual(han, 'yue')
      }}
    >
      <ToneRuby han={han} jp={jp} size="lg" />
      <span className="tones-twin-label">
        <BiText copy={label} size="sm" hideJp />
      </span>
      <span className="tones-twin-chao">{chao}</span>
      <ToneContour points={contour} compact active={!reduce} speaking={speaking} />
    </button>
  )
}
