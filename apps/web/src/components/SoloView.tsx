import { motion } from 'framer-motion'
import { BiText } from './BiText'
import { InkSettle } from './InkSettle'
import { ResultWithDefinition } from './ResultWithDefinition'
import { SpeakButton } from './SpeakButton'
import { TranslateThinking } from './TranslateThinking'
import { TranslationAlternatives } from './TranslationAlternatives'
import { useYueStore } from '../lib/store'
import { ui } from '../lib/uiCopy'

export function SoloView() {
  const enInterim = useYueStore((s) => s.enInterim)
  const yueInterim = useYueStore((s) => s.yueInterim)
  const enTranslation = useYueStore((s) => s.enTranslation)
  const yueTranslation = useYueStore((s) => s.yueTranslation)
  const yueDefinition = useYueStore((s) => s.yueDefinition)
  const yueDefinitions = useYueStore((s) => s.yueDefinitions)
  const yueAlternatives = useYueStore((s) => s.yueAlternatives)
  const openBreakdown = useYueStore((s) => s.openBreakdown)
  const selectYueVariation = useYueStore((s) => s.selectYueVariation)
  const live = useYueStore((s) => s.live)
  const status = useYueStore((s) => s.status)
  const history = useYueStore((s) => s.history)
  const translating = useYueStore((s) => s.translating)
  const translatingTo = useYueStore((s) => s.translatingTo)

  const latest = history[0]
  // While capturing or translating, never fall back to a prior turn’s translation
  // (that reads as an interim / stale MT result).
  const turnActive =
    live || translating || Boolean(enInterim) || Boolean(yueInterim)
  const enText =
    enInterim ||
    enTranslation ||
    (!turnActive && latest
      ? latest.from === 'en'
        ? latest.source
        : latest.translation
      : '')
  const yueText =
    yueInterim ||
    yueTranslation ||
    (!turnActive && latest
      ? latest.from === 'yue'
        ? latest.source
        : latest.translation
      : '')
  const yueDef = turnActive
    ? yueDefinition
    : yueDefinition || latest?.definition || ''
  const yueDefs = turnActive
    ? yueDefinitions
    : yueDefinitions.length
      ? yueDefinitions
      : latest?.definitions || []
  const alts = turnActive
    ? yueAlternatives
    : yueAlternatives.length
      ? yueAlternatives
      : latest?.to === 'yue'
        ? latest.alternatives || []
        : []
  // Live STT preview of the source pane only (not a machine translation).
  const enLive = Boolean(enInterim) && !enTranslation && !yueTranslation
  const yueLive = Boolean(yueInterim) && !enTranslation && !yueTranslation
  const enThinking = translating && translatingTo === 'en'
  const yueThinking = translating && translatingTo === 'yue'

  return (
    <div className="solo">
      <motion.div
        className={`solo-stage ${live ? 'live' : ''} status-${status}`}
        animate={
          live
            ? {
                boxShadow: [
                  '0 0 0 0 rgba(61,207,182,0)',
                  '0 0 0 12px rgba(61,207,182,0.08)',
                  '0 0 0 0 rgba(61,207,182,0)',
                ],
              }
            : { boxShadow: '0 0 0 0 rgba(61,207,182,0)' }
        }
        transition={{ duration: 2.4, repeat: live ? Infinity : 0 }}
      >
        <div className="solo-upper">
          <p className="solo-label">
            <BiText copy={ui.english} size="sm" only="en" />
          </p>
          {enThinking ? (
            <TranslateThinking className="solo-thinking" />
          ) : (
            <InkSettle
              id={enLive ? 'en-live' : enText || 'en-empty'}
              className="solo-source"
              interim={enLive}
            >
              {enText ? (
                <span className="spoken-line">
                  {!enLive && (enTranslation || yueTranslation) ? (
                    <button
                      type="button"
                      className="spoken-line-text spoken-line-text--action"
                      onClick={() => {
                        const yue = (yueTranslation || yueInterim || yueText).trim()
                        const en = enText.trim()
                        if (!yue && !en) return
                        openBreakdown(yue || en, {
                          translation: en,
                          definition: yueDef || undefined,
                          definitions: yueDefs,
                          alternatives: alts,
                        })
                      }}
                      aria-label="Open translation details"
                    >
                      {enText}
                    </button>
                  ) : (
                    <span className="spoken-line-text">{enText}</span>
                  )}
                  <SpeakButton text={enText} lang="en" />
                </span>
              ) : (
                <BiText className="placeholder" copy={ui.speakToTranslate} size="sm" only="en" />
              )}
            </InkSettle>
          )}
        </div>

        <div className="solo-divider" />

        <div className="solo-lower">
          <p className="solo-label">
            <BiText copy={ui.cantonese} size="sm" only="zh" />
          </p>
          {yueThinking ? (
            <TranslateThinking className="solo-thinking" />
          ) : (
            <InkSettle
              id={yueLive ? 'yue-live' : yueText || 'yue-empty'}
              className="solo-translation"
              interim={yueLive}
            >
              {yueText ? (
                <>
                  <ResultWithDefinition
                    text={yueText}
                    definition={yueDef}
                    definitions={yueDefs}
                    textClassName="solo-tr-text"
                    onActivate={(phrase) =>
                      openBreakdown(phrase, {
                        translation: (enTranslation || enText).trim() || undefined,
                        definition: yueDef || undefined,
                        definitions: yueDefs,
                        alternatives: alts,
                      })
                    }
                    speakLang="yue"
                  />
                  <TranslationAlternatives alternatives={alts} onSelect={selectYueVariation} />
                </>
              ) : (
                <BiText className="placeholder" copy={ui.speakToTranslate} size="sm" only="zh" />
              )}
            </InkSettle>
          )}
        </div>
      </motion.div>
    </div>
  )
}
