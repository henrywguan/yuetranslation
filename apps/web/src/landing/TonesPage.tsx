import { useEffect, useState } from 'react'
import { MotionConfig, motion } from 'framer-motion'
import { JadeGlassField } from '../components/JadeGlassField'
import { JyutLogo } from '../components/JyutLogo'
import { BiText } from '../components/BiText'
import { openApp, openHome } from '../lib/siteLinks'
import { inkEase } from '../lib/motion'
import { useReducedMotion } from '../lib/useReducedMotion'
import { ui } from '../lib/uiCopy'
import { FooterLangPair } from './FooterLangPair'
import { FooterMeta } from './FooterMeta'
import { MagneticButton } from './MagneticButton'
import { Nav } from './Nav'
import { Reveal } from './Reveal'
import { ScrollProgress } from './ScrollProgress'
import { useSmoothScroll } from './useSmoothScroll'
import { humContour } from './tones/humTone'
import { ToneContour } from './tones/ToneContour'
import { ToneTheater } from './tones/ToneTheater'
import { TONE_TWINS, TONES } from './tones/tonesData'
import './landing.css'
import './tones.css'

/** Cinematic ELI5 explainer for the six Cantonese tones. */
export function TonesPage() {
  useSmoothScroll(true)
  const reduce = useReducedMotion()
  const [heroTone, setHeroTone] = useState(0)

  useEffect(() => {
    if (reduce) return
    const id = window.setInterval(() => {
      setHeroTone((n) => (n + 1) % TONES.length)
    }, 2200)
    return () => window.clearInterval(id)
  }, [reduce])

  const hero = TONES[heroTone]!

  return (
    <MotionConfig reducedMotion="user">
      <div className="landing tones-page">
        <ScrollProgress />
        <JadeGlassField variant="marketing" />
        <Nav onFeatures={() => openHome()} />

        <header className="tones-hero">
          <div className="tones-hero-wash" aria-hidden="true" />
          <motion.div
            className="tones-hero-inner"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.95, ease: inkEase }}
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

            <div className="tones-hero-orb" aria-hidden="true">
              <AnimateHeroTone toneIndex={heroTone} reduce={reduce} />
              <div className="tones-hero-orb-copy">
                <span className="tones-hero-orb-n">{hero.n}</span>
                <span className="tones-hero-orb-han" lang="zh-HK">
                  {hero.han}
                </span>
              </div>
              <ToneContour points={hero.contour} active={!reduce} />
            </div>
          </motion.div>
          <div className="ln-scroll-hint" aria-hidden="true">
            <span />
          </div>
        </header>

        <section className="tones-act tones-act--eli5" aria-label="Same letters">
          <Reveal className="tones-eli5" y={32}>
            <div className="tones-eli5-row">
              {TONES.map((t, i) => (
                <motion.button
                  key={t.n}
                  type="button"
                  className="tones-eli5-chip"
                  initial={reduce ? false : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ delay: i * 0.06, duration: 0.5, ease: inkEase }}
                  onClick={() => {
                    if (!reduce) void humContour(t.freqs).catch(() => {})
                  }}
                >
                  <span className="tones-eli5-han" lang="zh-HK">
                    {t.han}
                  </span>
                  <ToneContour points={t.contour} compact active={!reduce} />
                  <span className="tones-eli5-n">{t.n}</span>
                </motion.button>
              ))}
            </div>
            <p className="tones-eli5-caption">
              <BiText copy={ui.tonesHeroSub} size="sm" hideJp />
            </p>
          </Reveal>
        </section>

        <section className="tones-act tones-act--theater" aria-label={ui.navTones.en}>
          <Reveal y={40}>
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
                freqs={TONE_TWINS.buy.freqs}
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
                freqs={TONE_TWINS.sell.freqs}
                reduce={reduce}
              />
            </div>
          </Reveal>
        </section>

        <section className="ln-cta-band tones-cta">
          <Reveal className="ln-cta-inner">
            <div className="ln-cta-glow" aria-hidden="true" />
            <JyutLogo variant="mark" className="ln-cta-mark" />
            <h2 className="ln-h2">
              <BiText copy={ui.tonesCtaTitle} size="lg" />
            </h2>
            <BiText className="ln-p" copy={ui.tonesCtaBody} size="sm" as="p" />
            <MagneticButton className="btn-primary" onClick={() => openApp()}>
              <BiText copy={ui.tonesOpenApp} size="sm" />
            </MagneticButton>
          </Reveal>
        </section>

        <footer className="ln-footer">
          <button type="button" className="ln-brand ln-brand-btn" onClick={() => openHome()}>
            <JyutLogo className="ln-brand-logo" />
          </button>
          <FooterLangPair />
          <FooterMeta />
        </footer>
      </div>
    </MotionConfig>
  )
}

function AnimateHeroTone({ toneIndex, reduce }: { toneIndex: number; reduce: boolean }) {
  return (
    <motion.div
      key={toneIndex}
      className="tones-hero-pulse"
      initial={reduce ? false : { scale: 0.92, opacity: 0.5 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.7, ease: inkEase }}
    />
  )
}

function TwinCard({
  side,
  han,
  jp,
  chao,
  label,
  contour,
  freqs,
  reduce,
}: {
  side: 'buy' | 'sell'
  han: string
  jp: string
  chao: string
  label: (typeof ui)['tonesBuy']
  contour: (typeof TONE_TWINS.buy)['contour']
  freqs: number[]
  reduce: boolean
}) {
  return (
    <button
      type="button"
      className={`tones-twin tones-twin--${side}`}
      onClick={() => {
        if (!reduce) void humContour(freqs).catch(() => {})
      }}
    >
      <span className="tones-twin-han" lang="zh-HK">
        {han}
      </span>
      <span className="tones-twin-label">
        <BiText copy={label} size="sm" hideJp />
      </span>
      <span className="tones-twin-jp">
        {jp}
        <span className="tones-twin-chao">{chao}</span>
      </span>
      <ToneContour points={contour} compact active={!reduce} />
    </button>
  )
}
