import { AnimatePresence, motion } from 'framer-motion'
import { BiText } from './BiText'
import { CantoneseText } from './CantoneseText'
import { ResultWithDefinition } from './ResultWithDefinition'
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
            : {}
        }
        transition={{ duration: 2.4, repeat: live ? Infinity : 0 }}
      >
        <p className="solo-label">
          <BiText copy={ui.english} size="sm" only="en" />
        </p>
        <AnimatePresence mode="wait">
          <motion.p
            key={enText || 'empty-en'}
            className="solo-source"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {enText || <BiText className="placeholder" copy={ui.speakToTranslate} size="sm" only="en" />}
          </motion.p>
        </AnimatePresence>

        <div className="solo-divider" />

        <p className="solo-label">
          <BiText copy={ui.cantonese} size="sm" only="zh" />
        </p>
        <AnimatePresence mode="wait">
          <motion.div
            key={yueText || 'empty-yue'}
            className="solo-translation"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {yueText ? (
              <ResultWithDefinition text={yueText} definition={yueDef} textClassName="solo-tr-text" />
            ) : (
              <BiText className="placeholder" copy={ui.speakToTranslate} size="sm" only="zh" />
            )}
          </motion.div>
        </AnimatePresence>
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
