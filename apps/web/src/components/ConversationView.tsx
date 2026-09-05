import { motion } from 'framer-motion'
import { CantoneseText } from './CantoneseText'
import { MandarinText } from './MandarinText'
import { InkSettle } from './InkSettle'
import { JyutLogo } from './JyutLogo'
import { LangLabelButton } from './LangLabelButton'
import { LiveHoldButton } from './LiveHoldButton'
import { ClearIconButton } from './ClearIconButton'
import { SpeakButton } from './SpeakButton'
import { TranslateThinking } from './TranslateThinking'
import { useYueStore } from '../lib/store'
import { ui } from '../lib/uiCopy'
import { normalizeEnglishApostrophes } from '../lib/typography'

/**
 * Conversation: two language-pure cards on a shared phone.
 * Chinese (粵 or 普) sits on top, rotated 180° for the person across the table.
 * English sits on the bottom, upright for you.
 *
 * Pipeline: mic → live STT on the speaking side → after capture ends, one final
 * translation on the opposite pane (no interim machine translation).
 * Tap a finished translation to open details (definition + character breakdown).
 */
export function ConversationView() {
  const face = useYueStore((s) => s.face)
  const openBreakdown = useYueStore((s) => s.openBreakdown)
  const clearHistory = useYueStore((s) => s.clearHistory)
  const chineseLang = useYueStore((s) => s.chineseLang)
  const setSpeakDirection = useYueStore((s) => s.setSpeakDirection)
  const live = useYueStore((s) => s.live)
  const liveSide = useYueStore((s) => s.liveSide)
  const status = useYueStore((s) => s.status)
  const translating = useYueStore((s) => s.translating)
  const translatingTo = useYueStore((s) => s.translatingTo)

  // Independent loaders: each pane shows thinking when it is receiving a translation.
  const enThinking = translating && translatingTo === 'en'
  const zhThinking = translating && translatingTo === chineseLang

  const enText = face.enTranslation || face.enInterim
  const zhText = face.yueTranslation || face.yueInterim
  // Live = STT source preview on the speaking side, before post-capture translation.
  const enLive =
    Boolean(face.enInterim) && !face.enTranslation && !face.yueTranslation
  const zhLive =
    Boolean(face.yueInterim) && !face.enTranslation && !face.yueTranslation
  const enListening = live && liveSide === 'en'
  const zhListening = live && (liveSide === 'yue' || liveSide === 'cmn')

  const openEnDetails = () => {
    const zh = (face.yueInterim || face.yueTranslation).trim()
    const en = face.enTranslation.trim()
    if (!en) return
    openBreakdown(en, {
      lang: 'en',
      translation: zh || undefined,
      definition: face.yueDefinition || undefined,
      definitions: face.yueDefinitions,
    })
  }

  const openZhDetails = (phrase: string) => {
    const source = phrase.trim()
    if (!source) return
    openBreakdown(source, {
      lang: chineseLang,
      translation: face.enTranslation.trim() || undefined,
      definition: face.yueDefinition || undefined,
      definitions: face.yueDefinitions,
    })
  }

  const onChineseLang = (lang: 'yue' | 'cmn' | 'en') => {
    if (lang === 'en') return
    setSpeakDirection(lang)
  }

  return (
    <div className={`conversation ${live ? 'live' : ''} status-${status}`}>
      {(face.enTranslation || face.yueTranslation || face.enInterim || face.yueInterim) ? (
        <div className="conversation-clear">
          <ClearIconButton onClick={clearHistory} />
        </div>
      ) : null}

      <section
        className={`pane pane-yue${zhListening ? ' is-listening' : ''}${zhThinking ? ' is-thinking' : ''}`}
      >
        <div className="pane-face">
          <header>
            <LangLabelButton
              lang={chineseLang}
              active={zhListening}
              only="zh"
              onSelect={(lang) => {
                if (lang === 'yue' || lang === 'cmn') onChineseLang(lang)
              }}
            />
            <p lang={chineseLang === 'cmn' ? 'zh-CN' : 'zh-HK'}>{ui.friendLooksHere.zh}</p>
          </header>
          <div className="pane-body pane-body--hero">
            {zhThinking ? (
              <TranslateThinking className="pane-thinking" />
            ) : (
              <InkSettle
                id={zhLive ? 'face-zh-live' : zhText || 'face-zh-empty'}
                className="pane-hero pane-hero--yue"
                interim={zhLive}
              >
                {zhText ? (
                  <span className="spoken-line">
                    {chineseLang === 'cmn' ? (
                      <MandarinText
                        text={zhText}
                        definition={face.yueDefinition}
                        definitions={face.yueDefinitions}
                        className="pane-hero--yue"
                        onActivate={openZhDetails}
                      />
                    ) : (
                      <CantoneseText
                        text={zhText}
                        definition={face.yueDefinition}
                        definitions={face.yueDefinitions}
                        className="pane-hero--yue"
                        onActivate={openZhDetails}
                      />
                    )}
                    {face.yueTranslation ? (
                      <SpeakButton text={face.yueTranslation} lang={chineseLang} />
                    ) : null}
                  </span>
                ) : (
                  <span className="placeholder">
                    {chineseLang === 'cmn' ? ui.dirMandarin.zh : ui.yueTranslation.zh}
                  </span>
                )}
              </InkSettle>
            )}
          </div>
          <div className="pane-live">
            <LiveHoldButton
              side={chineseLang}
              labelLang="zh"
              className="live-btn--pane live-btn--yue"
            />
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
