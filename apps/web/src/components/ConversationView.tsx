import type { Lang } from '../lib/types'
import { motion } from 'framer-motion'
import { CantoneseText } from './CantoneseText'
import { MandarinText } from './MandarinText'
import { ShanghaineseText } from './ShanghaineseText'
import { TagalogText } from './TagalogText'
import { MexicanSpanishText } from './MexicanSpanishText'
import { InkSettle } from './InkSettle'
import { LangLabelButton } from './LangLabelButton'
import { LiveHoldButton } from './LiveHoldButton'
import { ClearIconButton } from './ClearIconButton'
import { SpeakButton } from './SpeakButton'
import { TranslateThinking } from './TranslateThinking'
import { useYueStore } from '../lib/store'
import { ui } from '../lib/uiCopy'
import { normalizeEnglishApostrophes } from '../lib/typography'

function langHintAttr(lang: Lang): string {
  if (lang === 'cmn') return 'zh-CN'
  if (lang === 'wuu') return 'wuu-CN'
  if (lang === 'tl') return 'tl'
  if (lang === 'es') return 'es-MX'
  if (lang === 'en') return 'en'
  return 'zh-HK'
}

function langPlaceholder(lang: Lang): string {
  if (lang === 'tl') return ui.dirTagalog.en
  if (lang === 'es') return ui.dirMexicanSpanish.en
  if (lang === 'cmn') return ui.dirMandarin.zh
  if (lang === 'wuu') return ui.dirShanghainese.zh
  if (lang === 'en') return ui.enTranslation.en
  return ui.yueTranslation.zh
}

function isLatinLang(lang: Lang): boolean {
  return lang === 'en' || lang === 'tl' || lang === 'es'
}

/**
 * Conversation: two language-pure cards on a shared phone.
 * Partner pane sits on top, rotated 180° for the person across the table.
 * You pane sits on the bottom, upright — both sides can pick any supported language.
 *
 * Pipeline: mic → live STT on the speaking side → after capture ends, one final
 * translation on the opposite pane (no interim machine translation).
 * Tap a finished translation to open details (definition + character breakdown).
 */
export function ConversationView() {
  const face = useYueStore((s) => s.face)
  const openBreakdown = useYueStore((s) => s.openBreakdown)
  const clearCurrent = useYueStore((s) => s.clearCurrent)
  const chineseLang = useYueStore((s) => s.chineseLang)
  const conversationYouLang = useYueStore((s) => s.conversationYouLang)
  const setConversationPaneLang = useYueStore((s) => s.setConversationPaneLang)
  const translateTyped = useYueStore((s) => s.translateTyped)
  const live = useYueStore((s) => s.live)
  const liveSide = useYueStore((s) => s.liveSide)
  const status = useYueStore((s) => s.status)
  const translating = useYueStore((s) => s.translating)
  const translatingTo = useYueStore((s) => s.translatingTo)

  const youLang = conversationYouLang
  const partnerLang = chineseLang

  const youThinking = translating && translatingTo === youLang
  const partnerThinking = translating && translatingTo === partnerLang

  const youText = face.enTranslation || face.enInterim
  const partnerText = face.yueTranslation || face.yueInterim
  const youLive = Boolean(face.enInterim) && !face.enTranslation && !face.yueTranslation
  const partnerLive = Boolean(face.yueInterim) && !face.enTranslation && !face.yueTranslation
  const youListening = live && liveSide === youLang
  const partnerListening = live && liveSide === partnerLang

  const openYouDetails = () => {
    const other = (face.yueInterim || face.yueTranslation).trim()
    const phrase = face.enTranslation.trim()
    if (!phrase) return
    openBreakdown(phrase, {
      lang: youLang,
      translation: other || undefined,
      definition: face.yueDefinition || undefined,
      definitions: face.yueDefinitions,
    })
  }

  const openPartnerDetails = (phrase: string) => {
    const source = phrase.trim()
    if (!source) return
    openBreakdown(source, {
      lang: partnerLang,
      translation: face.enTranslation.trim() || undefined,
      definition: face.yueDefinition || undefined,
      definitions: face.yueDefinitions,
      romanization: partnerLang === 'wuu' ? face.romanization : undefined,
      sandhiHint: partnerLang === 'wuu' ? face.sandhiHint : undefined,
      ipa: partnerLang === 'wuu' ? face.ipa : undefined,
    })
  }

  const onPaneLang = (pane: 'you' | 'partner', lang: Lang) => {
    const thisLang = pane === 'you' ? youLang : partnerLang
    const otherLang = pane === 'you' ? partnerLang : youLang
    if (lang === thisLang) return

    const youSource = face.enInterim.trim()
    const partnerSource = face.yueInterim.trim()
    const otherSource = pane === 'you' ? partnerSource : youSource
    const swapping = lang === otherLang

    setConversationPaneLang(pane, lang)
    if (swapping) return
    if (otherSource) void translateTyped(otherSource, otherLang)
  }

  const partnerLatin = isLatinLang(partnerLang)
  const youLatin = isLatinLang(youLang)

  const renderPhrase = (
    lang: Lang,
    text: string,
    onActivate: (phrase: string) => void,
    className: string,
  ) => {
    if (lang === 'tl') {
      return (
        <TagalogText
          text={text}
          definition={face.yueDefinition}
          definitions={face.yueDefinitions}
          className={className}
          onActivate={onActivate}
        />
      )
    }
    if (lang === 'es') {
      return (
        <MexicanSpanishText
          text={text}
          definition={face.yueDefinition}
          definitions={face.yueDefinitions}
          className={className}
          onActivate={onActivate}
        />
      )
    }
    if (lang === 'cmn') {
      return (
        <MandarinText
          text={text}
          definition={face.yueDefinition}
          definitions={face.yueDefinitions}
          className={className}
          onActivate={onActivate}
        />
      )
    }
    if (lang === 'wuu') {
      return (
        <ShanghaineseText
          text={text}
          romanization={face.romanization}
          className={className}
          onActivate={onActivate}
        />
      )
    }
    if (lang === 'yue') {
      return (
        <CantoneseText
          text={text}
          definition={face.yueDefinition}
          definitions={face.yueDefinitions}
          className={className}
          onActivate={onActivate}
        />
      )
    }
    // English (or unknown): plain action text when a finished translation exists.
    return null
  }

  return (
    <div className={`conversation ${live ? 'live' : ''} status-${status}`}>
      {face.enTranslation || face.yueTranslation || face.enInterim || face.yueInterim ? (
        <div className="conversation-clear">
          <ClearIconButton onClick={clearCurrent} />
        </div>
      ) : null}

      <section
        className={`pane pane-yue${partnerListening ? ' is-listening' : ''}${partnerThinking ? ' is-thinking' : ''}`}
      >
        <div className="pane-face">
          <header>
            <LangLabelButton
              lang={partnerLang}
              active={partnerListening}
              drawer="bottom"
              variant="dropdown"
              onSelect={(lang) => onPaneLang('partner', lang)}
            />
            <p lang={langHintAttr(partnerLang)}>
              {partnerLatin ? ui.friendLooksHere.en : ui.friendLooksHere.zh}
            </p>
          </header>
          <div className="pane-body pane-body--hero">
            {partnerThinking ? (
              <TranslateThinking className="pane-thinking" />
            ) : (
              <InkSettle
                id={partnerLive ? 'face-zh-live' : partnerText || 'face-zh-empty'}
                className="pane-hero pane-hero--yue"
                interim={partnerLive}
              >
                {partnerText ? (
                  <span className="spoken-line">
                    {partnerLang === 'en' ? (
                      face.yueTranslation && !partnerLive ? (
                        <button
                          type="button"
                          className="spoken-line-text spoken-line-text--action"
                          onClick={() => openPartnerDetails(partnerText)}
                          aria-label={`${ui.enTranslation.en}. Open details.`}
                        >
                          {normalizeEnglishApostrophes(partnerText)}
                        </button>
                      ) : (
                        <span className="spoken-line-text">{partnerText}</span>
                      )
                    ) : (
                      renderPhrase(partnerLang, partnerText, openPartnerDetails, 'pane-hero--yue')
                    )}
                    {face.yueTranslation ? (
                      <SpeakButton text={face.yueTranslation} lang={partnerLang} />
                    ) : null}
                  </span>
                ) : (
                  <span className="placeholder">{langPlaceholder(partnerLang)}</span>
                )}
              </InkSettle>
            )}
          </div>
          <div className="pane-live">
            <LiveHoldButton
              side={partnerLang}
              labelLang={partnerLatin ? 'en' : 'zh'}
              className="live-btn--pane live-btn--yue"
            />
          </div>
        </div>
      </section>

      <div className="conversation-gutter" aria-hidden="true">
        <span className="conversation-gutter-glow" />
      </div>

      <motion.section
        className={`pane pane-en${youListening ? ' is-listening' : ''}${youThinking ? ' is-thinking' : ''}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
        <header>
          <LangLabelButton
            lang={youLang}
            active={youListening}
            drawer="bottom"
            variant="dropdown"
            onSelect={(lang) => onPaneLang('you', lang)}
          />
          <p>{ui.holdFacingYou.en}</p>
        </header>
        <div className="pane-body pane-body--hero">
          {youThinking ? (
            <TranslateThinking className="pane-thinking" />
          ) : (
            <InkSettle
              id={youLive ? 'face-en-live' : youText || 'face-en-empty'}
              className="pane-hero pane-hero--en"
              interim={youLive}
            >
              {youText ? (
                <span className="spoken-line">
                  {youLang === 'en' ? (
                    face.enTranslation && !youLive ? (
                      <button
                        type="button"
                        className="spoken-line-text spoken-line-text--action"
                        onClick={openYouDetails}
                        aria-label={`${ui.enTranslation.en}. Open details.`}
                      >
                        {normalizeEnglishApostrophes(youText)}
                      </button>
                    ) : (
                      <span className="spoken-line-text">{youText}</span>
                    )
                  ) : (
                    renderPhrase(youLang, youText, () => openYouDetails(), 'pane-hero--en')
                  )}
                  {face.enTranslation ? <SpeakButton text={face.enTranslation} lang={youLang} /> : null}
                </span>
              ) : (
                <span className="placeholder">{langPlaceholder(youLang)}</span>
              )}
            </InkSettle>
          )}
        </div>
        <div className="pane-live">
          <LiveHoldButton
            side={youLang}
            labelLang={youLatin ? 'en' : 'zh'}
            className="live-btn--pane live-btn--en"
          />
        </div>
      </motion.section>
    </div>
  )
}
