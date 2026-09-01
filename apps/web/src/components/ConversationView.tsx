import { motion } from 'framer-motion'
import { CantoneseText } from './CantoneseText'
import { InkSettle } from './InkSettle'
import { JyutLogo } from './JyutLogo'
import { LiveHoldButton } from './LiveHoldButton'
import { SpeakButton } from './SpeakButton'
import { TranslateThinking } from './TranslateThinking'
import { useYueStore } from '../lib/store'
import { ui } from '../lib/uiCopy'
import { normalizeEnglishApostrophes } from '../lib/typography'

/**
 * Conversation: two language-pure cards on a shared phone.
 * Cantonese sits on top, rotated 180° for the person across the table.
 * English sits on the bottom, upright for you.
 *
 * Pipeline: mic → STT source preview on the speaking side → after capture
 * ends, one final translation on the other side (no interim MT).
 * Tap a finished translation to open details (definition + character breakdown).
 */
export function ConversationView() {
  const face = useYueStore((s) => s.face)
  const openBreakdown = useYueStore((s) => s.openBreakdown)
  const live = useYueStore((s) => s.live)
  const liveSide = useYueStore((s) => s.liveSide)
  const status = useYueStore((s) => s.status)
  const translating = useYueStore((s) => s.translating)
  const translatingTo = useYueStore((s) => s.translatingTo)

  // Independent loaders: each pane shows thinking when it is receiving a translation.
  const enThinking = translating && translatingTo === 'en'
  const yueThinking = translating && translatingTo === 'yue'

  const enText = face.enTranslation || face.enInterim
  const yueText = face.yueTranslation || face.yueInterim
  // Live = STT source preview only, before the post-capture translation lands.
  const enLive =
    Boolean(face.enInterim) && !face.enTranslation && !face.yueTranslation
  const yueLive =
    Boolean(face.yueInterim) && !face.enTranslation && !face.yueTranslation
  const enListening = live && liveSide === 'en'
  const yueListening = live && liveSide === 'yue'

  const openEnDetails = () => {
    const source = (face.yueInterim || face.yueTranslation).trim()
    const translation = face.enTranslation.trim()
    if (!source || !translation) return
    openBreakdown(source, {
      translation,
      definition: face.yueDefinition || undefined,
      definitions: face.yueDefinitions,
    })
  }

  const openYueDetails = (phrase: string) => {
    const source = phrase.trim()
    if (!source) return
    openBreakdown(source, {
      translation: face.enTranslation.trim() || undefined,
      definition: face.yueDefinition || undefined,
      definitions: face.yueDefinitions,
    })
  }

  return (
    <div className={`conversation ${live ? 'live' : ''} status-${status}`}>
      <section
        className={`pane pane-yue${yueListening ? ' is-listening' : ''}${yueThinking ? ' is-thinking' : ''}`}
      >
        <div className="pane-face">
          <header>
            <h2 lang="zh-HK">{ui.cantonese.zh}</h2>
            <p lang="zh-HK">{ui.friendLooksHere.zh}</p>
          </header>
          <div className="pane-body pane-body--hero">
            {yueThinking ? (
              <TranslateThinking className="pane-thinking" />
            ) : (
              <InkSettle
                id={yueLive ? 'face-yue-live' : yueText || 'face-yue-empty'}
                className="pane-hero pane-hero--yue"
                interim={yueLive}
              >
                {yueText ? (
                  <span className="spoken-line">
                    <CantoneseText
                      text={yueText}
                      definition={face.yueDefinition}
                      definitions={face.yueDefinitions}
                      className="pane-hero--yue"
                      onActivate={openYueDetails}
                    />
                    {face.yueTranslation ? (
                      <SpeakButton text={face.yueTranslation} lang="yue" />
                    ) : null}
                  </span>
                ) : (
                  <span className="placeholder">{ui.yueTranslation.zh}</span>
                )}
              </InkSettle>
            )}
          </div>
          <div className="pane-live">
            <LiveHoldButton side="yue" labelLang="zh" className="live-btn--pane live-btn--yue" />
          </div>
        </div>
      </section>

      <div className="conversation-gutter" aria-hidden="true">
        <span className="conversation-gutter-line" />
        <JyutLogo variant="mark" className="conversation-gutter-logo" />
        <span className="conversation-gutter-line" />
      </div>

      <motion.section
        className={`pane pane-en${enListening ? ' is-listening' : ''}${enThinking ? ' is-thinking' : ''}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
        <header>
          <h2>{ui.english.en}</h2>
          <p>{ui.holdFacingYou.en}</p>
        </header>
        <div className="pane-body pane-body--hero">
          {enThinking ? (
            <TranslateThinking className="pane-thinking" />
          ) : (
            <InkSettle
              id={enLive ? 'face-en-live' : enText || 'face-en-empty'}
              className="pane-hero pane-hero--en"
              interim={enLive}
            >
              {enText ? (
                <span className="spoken-line">
                  {face.enTranslation && !enLive ? (
                    <button
                      type="button"
                      className="spoken-line-text spoken-line-text--action"
                      onClick={openEnDetails}
                      aria-label={`${ui.enTranslation.en}. Open details.`}
                    >
                      {normalizeEnglishApostrophes(enText)}
                    </button>
                  ) : (
                    <span className="spoken-line-text">{enText}</span>
                  )}
                  {face.enTranslation ? <SpeakButton text={face.enTranslation} lang="en" /> : null}
                </span>
              ) : (
                <span className="placeholder">{ui.enTranslation.en}</span>
              )}
            </InkSettle>
          )}
        </div>
        <div className="pane-live">
          <LiveHoldButton side="en" labelLang="en" className="live-btn--pane live-btn--en" />
        </div>
      </motion.section>
    </div>
  )
}
