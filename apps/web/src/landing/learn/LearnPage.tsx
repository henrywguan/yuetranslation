import { MotionConfig, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { BiText } from '../../components/BiText'
import { openApp, openHome, openLearn, openTones } from '../../lib/siteLinks'
import { inkEase } from '../../lib/motion'
import { ui } from '../../lib/uiCopy'
import { useDocumentMeta } from '../../lib/useDocumentMeta'
import { learnLevelFromHash } from '../../lib/useHashRoute'
import { MarketingCtaBand } from '../MarketingCtaBand'
import { MarketingFooter } from '../MarketingFooter'
import { MarketingPageShell } from '../MarketingPageShell'
import { Reveal } from '../Reveal'
import { HARBOR_LEVELS } from './curriculum'
import { HarborMap, LearnSession } from './LearnPlay'
import { hydrateHarborProgress, loadHarborProgress, type HarborProgress } from './progress'
import '../landing.css'
import './learn.css'

const OC_GUIDE = 'https://opencantonese.org/books/cantonese-life-1/pronunciation-guide'

/**
 * Learn · Harbor Quest — CodeCombat-style Jyutping voyage
 * paced to the Open Cantonese Pronunciation Guide.
 */
export function LearnPage() {
  useDocumentMeta({
    title: 'Learn · Harbor Quest — JyutTranslate',
    description:
      'Play through Cantonese pronunciation like a game — Jyutping initials, finals, and tones from the Open Cantonese guide.',
    path: '/#/learn',
  })

  const [progress, setProgress] = useState<HarborProgress>(() => loadHarborProgress())
  const [levelId, setLevelId] = useState<string | null>(() => learnLevelFromHash())

  useEffect(() => {
    const sync = () => setLevelId(learnLevelFromHash())
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  useEffect(() => {
    let cancelled = false
    void hydrateHarborProgress().then((p) => {
      if (!cancelled) setProgress(p)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const openLevel = useCallback((id: string) => {
    openLearn(id)
    setLevelId(id)
  }, [])

  const exitLevel = useCallback(() => {
    openLearn()
    setLevelId(null)
    setProgress(loadHarborProgress())
  }, [])

  if (levelId) {
    // Fullscreen game shell — no marketing nav/footer so the harbor fills the viewport.
    return (
      <MotionConfig reducedMotion="user">
        <div className="learn-page learn-page--play learn-page--immersive">
          <LearnSession
            levelId={levelId}
            onExit={exitLevel}
            onOpenLevel={openLevel}
            onProgress={setProgress}
          />
        </div>
      </MotionConfig>
    )
  }

  const cleared = progress.cleared.length
  const total = HARBOR_LEVELS.length

  return (
    <MarketingPageShell className="learn-page" onFeatures={() => openHome()}>
      <header className="hq-hero">
        <div className="hq-hero-wash" aria-hidden="true" />
        <motion.div
          className="hq-hero-inner"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: inkEase }}
        >
          <p className="hq-hero-brand">
            <span className="hq-hero-brand-en">JyutTranslate</span>
            <span className="hq-hero-brand-mark" aria-hidden="true">
              ·
            </span>
            <span className="hq-hero-brand-game">Harbor Quest</span>
          </p>
          <h1 className="hq-hero-title">
            <BiText copy={ui.learnHeroTitle} size="lg" />
          </h1>
          <p className="hq-hero-sub">
            <BiText copy={ui.learnHeroSub} size="md" hideJp />
          </p>
          <div className="hq-hero-cta">
            <button
              type="button"
              className="hq-btn hq-btn--primary hq-btn--lg"
              onClick={() => openLevel(HARBOR_LEVELS[0]!.id)}
            >
              <BiText copy={ui.learnBegin} size="sm" hideJp only="en" />
            </button>
            <a className="hq-hero-oc" href={OC_GUIDE} target="_blank" rel="noreferrer">
              <BiText copy={ui.learnOcLink} size="sm" hideJp only="en" />
            </a>
          </div>
          <p className="hq-hero-progress">
            {cleared}/{total} piers cleared
            {progress.correctCount > 0 ? ` · ${progress.correctCount} correct casts` : ''}
          </p>
        </motion.div>
      </header>

      <section className="hq-campaign" aria-label={ui.navLearn.en}>
        <Reveal y={28}>
          <HarborMap progress={progress} onSelect={openLevel} />
        </Reveal>
      </section>

      <section className="hq-how">
        <Reveal y={24}>
          <h2 className="hq-how-title">
            <BiText copy={ui.learnHowTitle} size="md" />
          </h2>
          <p className="hq-how-body">
            <BiText copy={ui.learnHowBody} size="sm" hideJp />
          </p>
          <ul className="hq-how-list">
            <li>
              <BiText copy={ui.learnHow1} size="sm" hideJp />
            </li>
            <li>
              <BiText copy={ui.learnHow2} size="sm" hideJp />
            </li>
            <li>
              <BiText copy={ui.learnHow3} size="sm" hideJp />
            </li>
          </ul>
          <p className="hq-how-tones">
            <button type="button" className="hq-text-link" onClick={() => openTones()}>
              <BiText copy={ui.learnTonesLink} size="sm" hideJp only="en" />
            </button>
          </p>
        </Reveal>
      </section>

      <p className="hq-credit">
        Curriculum path from{' '}
        <a href={OC_GUIDE} target="_blank" rel="noreferrer">
          Open Cantonese — Cantonese Pronunciation Guide
        </a>
        . Game writing and Harbor Quest interaction are original to JyutTranslate. You are free to
        use their books to learn or teach Cantonese.
      </p>

      <MarketingCtaBand
        className="hq-cta"
        title={ui.learnCtaTitle}
        body={ui.learnCtaBody}
        button={ui.learnOpenApp}
        onClick={() => openApp()}
      />

      <MarketingFooter />
    </MarketingPageShell>
  )
}
