import { motion } from 'framer-motion'
import { CantoneseText } from './CantoneseText'
import { InkSettle } from './InkSettle'
import { JyutLogo } from './JyutLogo'
import { SpeakButton } from './SpeakButton'
import { TranslateThinking } from './TranslateThinking'
import { useYueStore } from '../lib/store'
import { ui } from '../lib/uiCopy'

/**
 * Face-to-face: two language-pure cards on a shared phone.
 * English card stays upright for you. Cantonese card is rotated 180°
 * so the person across the table reads it the right way up.
 *
 * Results live in `face` store state only — never shared with Solo/Text,
 * and never accumulate history or “other variations” lists.
 */
export function ConversationView() {
  const face = useYueStore((s) => s.face)
  const openBreakdown = useYueStore((s) => s.openBreakdown)
  const live = useYueStore((s) => s.live)
  const status = useYueStore((s) => s.status)
  const translating = useYueStore((s) => s.translating)
  const translatingTo = useYueStore((s) => s.translatingTo)
  const enThinking = translating && translatingTo === 'en'
  const yueThinking = translating && translatingTo === 'yue'

  const enText = face.enTranslation || face.enInterim
  const yueText = face.yueTranslation || face.yueInterim
  const enLive = Boolean(face.enInterim) && !face.enTranslation
  const yueLive = Boolean(face.yueInterim) && !face.yueTranslation

  return (
    <div className={`conversation ${live ? 'live' : ''} status-${status}`}>
      <motion.section
        className="pane pane-en"
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
            <TranslateThinking className="pane-thinking" size="sm" />
          ) : (
            <InkSettle
              id={enLive ? 'face-en-live' : enText || 'face-en-empty'}
              className="pane-hero pane-hero--en"
              interim={enLive}
            >
              {enText ? (
                <span className="spoken-line">
                  <span className="spoken-line-text">{enText}</span>
                  {face.enTranslation ? <SpeakButton text={face.enTranslation} lang="en" /> : null}
                </span>
              ) : (
                <span className="placeholder">{ui.enTranslation.en}</span>
              )}
            </InkSettle>
          )}
        </div>
      </motion.section>

      <div className="conversation-gutter" aria-hidden="true">
        <span className="conversation-gutter-line" />
        <JyutLogo variant="mark" className="conversation-gutter-logo" />
        <span className="conversation-gutter-line" />
      </div>

      <section className="pane pane-yue">
        <div className="pane-face">
          <header>
            <h2 lang="zh-HK">{ui.cantonese.zh}</h2>
            <p lang="zh-HK">{ui.friendLooksHere.zh}</p>
          </header>
          <div className="pane-body pane-body--hero">
            {yueThinking ? (
              <TranslateThinking className="pane-thinking" size="sm" />
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
                      className="pane-hero-canto"
                      onActivate={openBreakdown}
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
        </div>
      </section>
    </div>
  )
}
