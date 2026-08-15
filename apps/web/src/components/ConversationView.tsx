import { motion } from 'framer-motion'
import { CantoneseText } from './CantoneseText'
import { InkSettle } from './InkSettle'
import { JyutLogo } from './JyutLogo'
import { PaneParticles } from './PaneParticles'
import { TranslateThinking } from './TranslateThinking'
import { TranslationAlternatives } from './TranslationAlternatives'
import { useYueStore } from '../lib/store'
import { ui } from '../lib/uiCopy'

/**
 * Face-to-face: two language-pure cards on a shared phone.
 * English card stays upright for you. Cantonese card is rotated 180°
 * so the person across the table reads it the right way up.
 */
export function ConversationView() {
  const enInterim = useYueStore((s) => s.enInterim)
  const yueInterim = useYueStore((s) => s.yueInterim)
  const enTranslation = useYueStore((s) => s.enTranslation)
  const yueTranslation = useYueStore((s) => s.yueTranslation)
  const yueDefinition = useYueStore((s) => s.yueDefinition)
  const yueAlternatives = useYueStore((s) => s.yueAlternatives)
  const openBreakdown = useYueStore((s) => s.openBreakdown)
  const selectYueVariation = useYueStore((s) => s.selectYueVariation)
  const live = useYueStore((s) => s.live)
  const status = useYueStore((s) => s.status)
  const translating = useYueStore((s) => s.translating)
  const translatingTo = useYueStore((s) => s.translatingTo)
  const enThinking = translating && translatingTo === 'en'
  const yueThinking = translating && translatingTo === 'yue'

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
        <div className="pane-body">
          <p className="heard">{enInterim || <span className="placeholder">{ui.listening.en}</span>}</p>
          {enThinking ? (
            <TranslateThinking className="pane-thinking" size="sm" />
          ) : (
            <InkSettle
              id={enTranslation || 'en-empty'}
              className="said"
              interim={Boolean(enInterim) && !enTranslation}
            >
              {enTranslation || <span className="placeholder">{ui.enTranslation.en}</span>}
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
        <PaneParticles />
        <div className="pane-face">
          <header>
            <h2 lang="zh-HK">{ui.cantonese.zh}</h2>
            <p lang="zh-HK">{ui.friendLooksHere.zh}</p>
          </header>
          <div className="pane-body">
            <p className="heard">
              <CantoneseText
                text={yueInterim}
                placeholder={<span className="placeholder">{ui.listening.zh}</span>}
                onActivate={openBreakdown}
              />
            </p>
            {yueThinking ? (
              <TranslateThinking className="pane-thinking" size="sm" />
            ) : (
              <InkSettle
                id={yueTranslation || 'yue-empty'}
                className="said"
                interim={Boolean(yueInterim) && !yueTranslation}
              >
                <CantoneseText
                  text={yueTranslation}
                  definition={yueDefinition}
                  placeholder={<span className="placeholder">{ui.yueTranslation.zh}</span>}
                  onActivate={openBreakdown}
                />
                <TranslationAlternatives
                  alternatives={yueAlternatives}
                  onSelect={selectYueVariation}
                />
              </InkSettle>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
