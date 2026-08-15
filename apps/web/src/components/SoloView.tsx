import { motion } from 'framer-motion'
import { BiText } from './BiText'
import { CantoneseText } from './CantoneseText'
import { InkSettle } from './InkSettle'
import { ResultWithDefinition } from './ResultWithDefinition'
import { tideTransition, tideY } from '../lib/motion'
import { useYueStore } from '../lib/store'
import { ui } from '../lib/uiCopy'

export function SoloView() {
  const enInterim = useYueStore((s) => s.enInterim)
  const yueInterim = useYueStore((s) => s.yueInterim)
  const enTranslation = useYueStore((s) => s.enTranslation)
  const yueTranslation = useYueStore((s) => s.yueTranslation)
  const yueDefinition = useYueStore((s) => s.yueDefinition)
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
  const enLive = Boolean(enInterim)
  const yueLive = Boolean(yueInterim)

  return (
    <div className="solo">
      <motion.div
        className={`solo-stage ${live ? 'live' : ''} status-${status}`}
        animate={
          live
            ? {
                y: 0,
                boxShadow: [
                  '0 0 0 0 rgba(61,207,182,0)',
                  '0 0 0 12px rgba(61,207,182,0.08)',
                  '0 0 0 0 rgba(61,207,182,0)',
                ],
              }
            : { y: tideY, boxShadow: '0 0 0 0 rgba(61,207,182,0)' }
        }
        transition={
          live
            ? { duration: 2.4, repeat: Infinity, boxShadow: { duration: 2.4, repeat: Infinity } }
            : tideTransition
        }
      >
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

        <div className="solo-divider" />

        <p className="solo-label">
          <BiText copy={ui.cantonese} size="sm" only="zh" />
        </p>
        <InkSettle
          id={yueLive ? 'yue-live' : yueText || 'yue-empty'}
          className="solo-translation"
          interim={yueLive}
        >
          {yueText ? (
            <ResultWithDefinition text={yueText} definition={yueDef} textClassName="solo-tr-text" />
          ) : (
            <BiText className="placeholder" copy={ui.speakToTranslate} size="sm" only="zh" />
          )}
        </InkSettle>
      </motion.div>

      {history.length > 1 ? (
        <ul className="history">
          {history.slice(1, 6).map((t) => (
            <li key={t.id}>
              <span className="h-src">
                {t.from === 'yue' ? <CantoneseText text={t.source} definition={t.definition} /> : t.source}
              </span>
              <span className="h-arrow">→</span>
              <span className="h-tr">
                {t.to === 'yue' ? (
                  <CantoneseText text={t.translation} definition={t.definition} />
                ) : (
                  t.translation
                )}
                {t.to === 'yue' && t.definition ? (
                  <span className="h-def" title={t.definition}>
                    {t.definition}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
