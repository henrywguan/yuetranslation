import { motion } from 'framer-motion'
import { BiText } from '../components/BiText'
import { CopyJyutpingButton } from '../components/CopyJyutpingButton'
import { openApp, openHome, openPricing } from '../lib/siteLinks'
import { inkEase } from '../lib/motion'
import { ui, type Bi } from '../lib/uiCopy'
import { MarketingCtaBand } from './MarketingCtaBand'
import { MarketingFooter } from './MarketingFooter'
import { MarketingPageShell } from './MarketingPageShell'
import { Reveal } from './Reveal'
import { useDocumentMeta } from '../lib/useDocumentMeta'
import './landing.css'
import './creators.css'

/** Official Google Fonts zip downloads (SIL OFL). */
const NOTO_SANS_ZIP = 'https://fonts.google.com/download?family=Noto%20Sans'
const NOTO_SANS_HK_ZIP = 'https://fonts.google.com/download?family=Noto%20Sans%20HK'
const NOTO_SANS_SPECIMEN = 'https://fonts.google.com/noto/specimen/Noto+Sans'
const NOTO_SANS_HK_SPECIMEN = 'https://fonts.google.com/noto/specimen/Noto+Sans+HK'

/** Demo phrase for the live copy button (Family+). */
const DEMO_HAN = '聽唔聽得'
/** Expected clipboard shape (Jyutping numbers + Chao tone letters). */
const DEMO_CHAOS = 'teng1˥ m4˨˩ teng1˥ dak1˥'

type Step = { title: Bi; body: Bi }

/** In-page jump without clobbering hash route `#/creators` → home. */
function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/**
 * Creator kit: Jyutping + Chao tone letters copy walkthrough, Noto font downloads,
 * and how to load custom fonts in CapCut / Instagram / other editors.
 */
export function CreatorsPage() {
  useDocumentMeta({
    title: 'Creator kit — Jyutping + Chao tone letters · JyutTranslate',
    description:
      'How to copy Jyutping + Chao tone letters, download Noto Sans / Noto Sans HK, and use them in CapCut, Instagram, and other editors.',
    path: '/#/creators',
  })

  const copySteps: Step[] = [
    { title: ui.creatorsCopyStep1Title, body: ui.creatorsCopyStep1Body },
    { title: ui.creatorsCopyStep2Title, body: ui.creatorsCopyStep2Body },
    { title: ui.creatorsCopyStep3Title, body: ui.creatorsCopyStep3Body },
    { title: ui.creatorsCopyStep4Title, body: ui.creatorsCopyStep4Body },
    { title: ui.creatorsCopyStep5Title, body: ui.creatorsCopyStep5Body },
  ]

  return (
    <MarketingPageShell
      className="creators-page"
      background="orbital"
      onFeatures={() => openHome()}
    >
      <header className="creators-hero">
        <motion.div
          className="creators-hero-inner"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: inkEase }}
        >
          <span className="ln-kicker">
            <BiText copy={ui.creatorsKicker} size="sm" />
          </span>
          <h1 className="creators-hero-title">
            <BiText copy={ui.creatorsHeroTitle} size="lg" />
          </h1>
          <p className="creators-hero-sub">
            <BiText copy={ui.creatorsHeroSub} size="md" hideJp />
          </p>
          <nav className="creators-toc" aria-label={ui.creatorsTocLabel.en}>
            <a
              href="#/creators"
              onClick={(e) => {
                e.preventDefault()
                scrollToSection('creators-fonts')
              }}
            >
              <BiText copy={ui.creatorsTocFonts} size="sm" hideJp only="en" />
            </a>
            <a
              href="#/creators"
              onClick={(e) => {
                e.preventDefault()
                scrollToSection('creators-copy')
              }}
            >
              <BiText copy={ui.creatorsTocCopy} size="sm" hideJp only="en" />
            </a>
            <a
              href="#/creators"
              onClick={(e) => {
                e.preventDefault()
                scrollToSection('creators-editors')
              }}
            >
              <BiText copy={ui.creatorsTocEditors} size="sm" hideJp only="en" />
            </a>
          </nav>
        </motion.div>
      </header>

      <Reveal y={28}>
        <section id="creators-fonts" className="creators-section">
          <h2 className="creators-h2">
            <BiText copy={ui.creatorsFontsTitle} size="lg" />
          </h2>
          <p className="creators-lead">
            <BiText copy={ui.creatorsFontsLead} size="md" hideJp />
          </p>

          <div className="creators-font-grid">
            <article className="creators-font-card">
              <h3 className="creators-h3">
                <BiText copy={ui.creatorsFontHkTitle} size="md" />
              </h3>
              <p className="creators-font-hint">
                <BiText copy={ui.creatorsFontHkHint} size="sm" hideJp />
              </p>
              <div className="creators-font-actions">
                <a className="creators-btn creators-btn--primary" href={NOTO_SANS_HK_ZIP} download>
                  <BiText copy={ui.creatorsDownloadHk} size="sm" hideJp only="en" />
                </a>
                <a
                  className="creators-btn creators-btn--ghost"
                  href={NOTO_SANS_HK_SPECIMEN}
                  target="_blank"
                  rel="noreferrer"
                >
                  <BiText copy={ui.creatorsFontSpecimen} size="sm" hideJp only="en" />
                </a>
              </div>
            </article>

            <article className="creators-font-card">
              <h3 className="creators-h3">
                <BiText copy={ui.creatorsFontSansTitle} size="md" />
              </h3>
              <p className="creators-font-hint">
                <BiText copy={ui.creatorsFontSansHint} size="sm" hideJp />
              </p>
              <div className="creators-font-actions">
                <a className="creators-btn creators-btn--primary" href={NOTO_SANS_ZIP} download>
                  <BiText copy={ui.creatorsDownloadSans} size="sm" hideJp only="en" />
                </a>
                <a
                  className="creators-btn creators-btn--ghost"
                  href={NOTO_SANS_SPECIMEN}
                  target="_blank"
                  rel="noreferrer"
                >
                  <BiText copy={ui.creatorsFontSpecimen} size="sm" hideJp only="en" />
                </a>
              </div>
            </article>
          </div>

          <aside className="creators-callout" aria-label={ui.creatorsPairTitle.en}>
            <h3 className="creators-h3">
              <BiText copy={ui.creatorsPairTitle} size="md" />
            </h3>
            <p>
              <BiText copy={ui.creatorsPairBody} size="sm" hideJp />
            </p>
            <p className="creators-preview-label">
              <BiText copy={ui.creatorsPreviewLabel} size="sm" hideJp only="en" />
            </p>
            <p className="creators-preview" lang="yue">
              <span className="creators-preview-han">{DEMO_HAN}</span>
              <span className="creators-preview-chao">{DEMO_CHAOS}</span>
            </p>
            <p className="creators-license">
              <BiText copy={ui.creatorsFontLicense} size="sm" hideJp />
            </p>
          </aside>
        </section>
      </Reveal>

      <Reveal y={28}>
        <section id="creators-copy" className="creators-section">
          <h2 className="creators-h2">
            <BiText copy={ui.creatorsCopyTitle} size="lg" />
          </h2>
          <p className="creators-lead">
            <BiText copy={ui.creatorsCopyLead} size="md" hideJp />
          </p>

          <ol className="creators-steps">
            {copySteps.map((step, i) => (
              <li key={step.title.en} className="creators-step">
                <span className="creators-step-num" aria-hidden="true">
                  {i + 1}
                </span>
                <div className="creators-step-body">
                  <h3 className="creators-h3">
                    <BiText copy={step.title} size="md" />
                  </h3>
                  <p>
                    <BiText copy={step.body} size="sm" hideJp />
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="creators-demo">
            <p className="creators-demo-label">
              <BiText copy={ui.creatorsDemoLabel} size="sm" hideJp />
            </p>
            <div className="creators-demo-row">
              <span className="creators-demo-han" lang="yue">
                {DEMO_HAN}
              </span>
              <CopyJyutpingButton text={DEMO_HAN} />
            </div>
            <p className="creators-demo-hint">
              <BiText copy={ui.creatorsDemoHint} size="sm" hideJp />
            </p>
            <button
              type="button"
              className="creators-btn creators-btn--ghost"
              onClick={() => openPricing()}
            >
              <BiText copy={ui.creatorsSeeFamily} size="sm" hideJp only="en" />
            </button>
          </div>
        </section>
      </Reveal>

      <Reveal y={28}>
        <section id="creators-editors" className="creators-section">
          <h2 className="creators-h2">
            <BiText copy={ui.creatorsEditorsTitle} size="lg" />
          </h2>
          <p className="creators-lead">
            <BiText copy={ui.creatorsEditorsLead} size="md" hideJp />
          </p>

          <div className="creators-editor-stack">
            <article className="creators-editor-card">
              <h3 className="creators-h3">
                <BiText copy={ui.creatorsCapcutTitle} size="md" />
              </h3>
              <ol className="creators-mini-steps">
                <li>
                  <BiText copy={ui.creatorsCapcut1} size="sm" hideJp />
                </li>
                <li>
                  <BiText copy={ui.creatorsCapcut2} size="sm" hideJp />
                </li>
                <li>
                  <BiText copy={ui.creatorsCapcut3} size="sm" hideJp />
                </li>
                <li>
                  <BiText copy={ui.creatorsCapcut4} size="sm" hideJp />
                </li>
                <li>
                  <BiText copy={ui.creatorsCapcut5} size="sm" hideJp />
                </li>
              </ol>
            </article>

            <article className="creators-editor-card">
              <h3 className="creators-h3">
                <BiText copy={ui.creatorsIgTitle} size="md" />
              </h3>
              <p className="creators-editor-note">
                <BiText copy={ui.creatorsIgNote} size="sm" hideJp />
              </p>
              <ol className="creators-mini-steps">
                <li>
                  <BiText copy={ui.creatorsIg1} size="sm" hideJp />
                </li>
                <li>
                  <BiText copy={ui.creatorsIg2} size="sm" hideJp />
                </li>
                <li>
                  <BiText copy={ui.creatorsIg3} size="sm" hideJp />
                </li>
              </ol>
            </article>

            <article className="creators-editor-card">
              <h3 className="creators-h3">
                <BiText copy={ui.creatorsCanvaTitle} size="md" />
              </h3>
              <ol className="creators-mini-steps">
                <li>
                  <BiText copy={ui.creatorsCanva1} size="sm" hideJp />
                </li>
                <li>
                  <BiText copy={ui.creatorsCanva2} size="sm" hideJp />
                </li>
                <li>
                  <BiText copy={ui.creatorsCanva3} size="sm" hideJp />
                </li>
              </ol>
            </article>

            <article className="creators-editor-card">
              <h3 className="creators-h3">
                <BiText copy={ui.creatorsDesktopTitle} size="md" />
              </h3>
              <ol className="creators-mini-steps">
                <li>
                  <BiText copy={ui.creatorsDesktop1} size="sm" hideJp />
                </li>
                <li>
                  <BiText copy={ui.creatorsDesktop2} size="sm" hideJp />
                </li>
                <li>
                  <BiText copy={ui.creatorsDesktop3} size="sm" hideJp />
                </li>
              </ol>
            </article>

            <article className="creators-editor-card">
              <h3 className="creators-h3">
                <BiText copy={ui.creatorsOtherTitle} size="md" />
              </h3>
              <p>
                <BiText copy={ui.creatorsOtherBody} size="sm" hideJp />
              </p>
            </article>
          </div>
        </section>
      </Reveal>

      <MarketingCtaBand
        className="creators-cta"
        title={ui.creatorsCtaTitle}
        body={ui.creatorsCtaBody}
        button={ui.creatorsCtaButton}
        onClick={() => openApp()}
      />

      <MarketingFooter />
    </MarketingPageShell>
  )
}
