import { useState } from 'react'
import type { Lang } from '../lib/types'
import { motion } from 'framer-motion'
import { CantoneseText } from './CantoneseText'
import { MandarinText } from './MandarinText'
import { ShanghaineseText } from './ShanghaineseText'
import { SichuaneseText } from './SichuaneseText'
import { TagalogText } from './TagalogText'
import { MexicanSpanishText } from './MexicanSpanishText'
import { PeninsularSpanishText } from './PeninsularSpanishText'
import { VietnameseText } from './VietnameseText'
import { ThaiText } from './ThaiText'
import { LaoText } from './LaoText'
import { KoreanText } from './KoreanText'
import { JaText } from './JaText'
import { IdText } from './IdText'
import { MsText } from './MsText'
import { PtText } from './PtText'
import { FrText } from './FrText'
import { HiText } from './HiText'
import { KmText } from './KmText'
import { MyText } from './MyText'
import { JvText } from './JvText'
import { ItText } from './ItText'
import { DeText } from './DeText'
import { NlText } from './NlText'
import { ArText } from './ArText'
import { InkSettle } from './InkSettle'
import { LangLabelButton } from './LangLabelButton'
import { LiveHoldButton } from './LiveHoldButton'
import { ClearIconButton } from './ClearIconButton'
import { SpeakButton } from './SpeakButton'
import { TranslateThinking } from './TranslateThinking'
import { useYueStore } from '../lib/store'
import { biPlain, ui } from '../lib/uiCopy'
import { BiText } from './BiText'
import { conversationLabelHtmlLang, conversationPaneHint } from '../lib/conversationUi'
import { langDir } from '../lib/langCapabilities'
import { normalizeEnglishApostrophes } from '../lib/typography'

function langPlaceholder(lang: Lang): string {
  if (lang === 'tl') return ui.dirTagalog.en
  if (lang === 'es') return ui.dirMexicanSpanish.en
  if (lang === 'eses') return ui.dirPeninsularSpanish.en
  if (lang === 'vi') return ui.dirVietnamese.en
  if (lang === 'th') return ui.dirThai.en
  if (lang === 'lo') return ui.dirLao.en
  if (lang === 'ko') return ui.dirKorean.en
  if (lang === 'ja') return ui.dirJapanese.en
  if (lang === 'id') return ui.dirIndonesian.en
  if (lang === 'ms') return ui.dirMalay.en
  if (lang === 'pt') return ui.dirPortuguese.en
  if (lang === 'fr') return ui.dirFrench.en
  if (lang === 'hi') return ui.dirHindi.en
  if (lang === 'km') return ui.dirKhmer.en
  if (lang === 'my') return ui.dirBurmese.en
  if (lang === 'jv') return ui.dirJavanese.en
  if (lang === 'it') return ui.dirItalian.en
  if (lang === 'de') return ui.dirGerman.en
  if (lang === 'nl') return ui.dirDutch.en
  if (lang === 'ar') return ui.dirEgyptianArabic.en
  if (lang === 'arsa') return ui.dirModernStandardArabic.en
  if (lang === 'cmn') return ui.dirMandarin.zh
  if (lang === 'wuu') return ui.dirShanghainese.zh
  if (lang === 'sichuan') return ui.dirSichuanese.zh
  if (lang === 'en') return ui.enTranslation.en
  return ui.yueTranslation.zh
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
  const exportTranscript = useYueStore((s) => s.exportConversationTranscript)
  const [exported, setExported] = useState(false)

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
      romanization:
        partnerLang === 'wuu' || partnerLang === 'sichuan' ? face.romanization : undefined,
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

  const exportConversation = async () => {
    const transcript = exportTranscript()
    if (!transcript) return
    try {
      await navigator.clipboard.writeText(transcript)
    } catch {
      const area = document.createElement('textarea')
      area.value = transcript
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.left = '-9999px'
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      document.body.removeChild(area)
    }
    setExported(true)
    window.setTimeout(() => setExported(false), 1500)
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'JyutTranslate', text: transcript })
      } catch {
        /* dismissed — clipboard copy already succeeded */
      }
    }
  }

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
    if (lang === 'eses') {
      return (
        <PeninsularSpanishText
          text={text}
          definition={face.yueDefinition}
          definitions={face.yueDefinitions}
          className={className}
          onActivate={onActivate}
        />
      )
    }
    if (lang === 'vi') {
      return (
        <VietnameseText
          text={text}
          definition={face.yueDefinition}
          definitions={face.yueDefinitions}
          className={className}
          onActivate={onActivate}
        />
      )
    }
    if (lang === 'th') {
      return <ThaiText text={text} className={className} onActivate={onActivate} />
    }
    if (lang === 'lo') {
      return <LaoText text={text} className={className} onActivate={onActivate} />
    }
    if (lang === 'ko') {
      return <KoreanText text={text} className={className} onActivate={onActivate} />
    }
    if (lang === 'ja') {
      return <JaText text={text} className={className} onActivate={onActivate} />
    }
    if (lang === 'id') {
      return <IdText text={text} className={className} onActivate={onActivate} />
    }
    if (lang === 'ms') {
      return <MsText text={text} className={className} onActivate={onActivate} />
    }
    if (lang === 'pt') {
      return <PtText text={text} className={className} onActivate={onActivate} />
    }
    if (lang === 'fr') {
      return <FrText text={text} className={className} onActivate={onActivate} />
    }
    if (lang === 'hi') {
      return <HiText text={text} className={className} onActivate={onActivate} />
    }
    if (lang === 'km') {
      return <KmText text={text} className={className} onActivate={onActivate} />
    }
    if (lang === 'my') {
      return <MyText text={text} className={className} onActivate={onActivate} />
    }
    if (lang === 'jv') {
      return <JvText text={text} className={className} onActivate={onActivate} />
    }
    if (lang === 'it') {
      return <ItText text={text} className={className} onActivate={onActivate} />
    }
    if (lang === 'de') {
      return <DeText text={text} className={className} onActivate={onActivate} />
    }
    if (lang === 'nl') {
      return <NlText text={text} className={className} onActivate={onActivate} />
    }
    if (lang === 'ar') {
      return <ArText variant="ar" text={text} className={className} onActivate={onActivate} />
    }
    if (lang === 'arsa') {
      return <ArText variant="arsa" text={text} className={className} onActivate={onActivate} />
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
    if (lang === 'sichuan') {
      return (
        <SichuaneseText
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
        <>
          <div className="conversation-clear">
            <ClearIconButton onClick={clearCurrent} />
          </div>
          {face.enTranslation || face.yueTranslation ? (
            <div className="conversation-export">
              <button
                type="button"
                className={`conversation-export-btn${exported ? ' is-copied' : ''}`}
                onClick={() => void exportConversation()}
                aria-label={biPlain(exported ? ui.copied : ui.exportConversation)}
                title={biPlain(exported ? ui.copied : ui.exportConversation)}
              >
                <svg className="conversation-export-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 15.2V4.6M12 4.6 8.4 8.2M12 4.6l3.6 3.6M6 11.5v6.2c0 .9.7 1.6 1.6 1.6h8.8c.9 0 1.6-.7 1.6-1.6v-6.2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <BiText
                  copy={exported ? ui.copied : ui.exportConversation}
                  size="sm"
                  layout="inline"
                  hideJp
                />
              </button>
            </div>
          ) : null}
        </>
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
              scope="conversation"
              onSelect={(lang) => onPaneLang('partner', lang)}
            />
            <p lang={conversationLabelHtmlLang(partnerLang)} dir={langDir(partnerLang)}>
              {conversationPaneHint(partnerLang, 'friend')}
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
              labelLang={partnerLang}
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
            scope="conversation"
            onSelect={(lang) => onPaneLang('you', lang)}
          />
          <p lang={conversationLabelHtmlLang(youLang)} dir={langDir(youLang)}>
            {conversationPaneHint(youLang, 'you')}
          </p>
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
            labelLang={youLang}
            className="live-btn--pane live-btn--en"
          />
        </div>
      </motion.section>
    </div>
  )
}
