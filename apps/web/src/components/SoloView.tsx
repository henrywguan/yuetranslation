import { motion } from 'framer-motion'
import { BiText } from './BiText'
import { InkSettle } from './InkSettle'
import { PaneParticles } from './PaneParticles'
import { ResultWithDefinition } from './ResultWithDefinition'
import { TranslationAlternatives } from './TranslationAlternatives'
import { useYueStore } from '../lib/store'
import { ui } from '../lib/uiCopy'

export function SoloView() {
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
  const history = useYueStore((s) => s.history)

  const latest = history[0]
  const enText =
    enInterim ||
    enTranslation ||
    (latest ? (latest.from === 'en' ? latest.source : latest.translation) : '')
  const yueText =
    yueInterim ||
    yueTranslation ||
    (latest ? (latest.from === 'yue' ? latest.source : latest.translation) : '')
  const yueDef = yueDefinition || latest?.definition || ''
  const alts =
    yueAlternatives.length
      ? yueAlternatives
      : latest?.to === 'yue'
        ? latest.alternatives || []
        : []
  const enLive = Boolean(enInterim)
  const yueLive = Boolean(yueInterim)

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
          <InkSettle
            id={enLive ? 'en-live' : enText || 'en-empty'}
            className="solo-source"
            interim={enLive}
          >
            {enText || <BiText className="placeholder" copy={ui.speakToTranslate} size="sm" only="en" />}
          </InkSettle>
        </div>

        <div className="solo-divider" />

        <div className="solo-lower">
          <PaneParticles />
          <p className="solo-label">
            <BiText copy={ui.cantonese} size="sm" only="zh" />
          </p>
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
                  textClassName="solo-tr-text"
                  onActivate={openBreakdown}
                />
                <TranslationAlternatives alternatives={alts} onSelect={selectYueVariation} />
              </>
            ) : (
              <BiText className="placeholder" copy={ui.speakToTranslate} size="sm" only="zh" />
            )}
          </InkSettle>
        </div>
      </motion.div>
    </div>
  )
}
