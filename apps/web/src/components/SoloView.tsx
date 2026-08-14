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

  const source = enInterim || yueInterim
  const sourceIsYue = Boolean(yueInterim)
  const translation = sourceIsYue ? enTranslation : yueTranslation
  const latest = history[0]
  const yueText = translation || latest?.translation || ''
  const yueDef = yueDefinition || latest?.definition || latest?.source || ''

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
          <BiText copy={sourceIsYue ? ui.cantonese : ui.english} size="sm" />
        </p>
        <AnimatePresence mode="wait">
          <motion.p
            key={source || 'empty-src'}
            className="solo-source"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {sourceIsYue ? (
              <CantoneseText
                text={source}
                placeholder={<BiText className="placeholder" copy={ui.speakToTranslate} size="sm" />}
              />
            ) : (
              source || <BiText className="placeholder" copy={ui.speakToTranslate} size="sm" />
            )}
          </motion.p>
        </AnimatePresence>

        <div className="solo-divider" />

        <p className="solo-label">
          <BiText copy={sourceIsYue ? ui.english : ui.cantonese} size="sm" />
        </p>
        <AnimatePresence mode="wait">
          <motion.div
            key={yueText || enTranslation || 'empty-tr'}
            className="solo-translation"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {sourceIsYue ? (
              translation ||
              latest?.translation || <BiText className="placeholder" copy={ui.translationHere} size="sm" />
            ) : yueText ? (
              <ResultWithDefinition text={yueText} definition={yueDef} textClassName="solo-tr-text" />
            ) : (
              <BiText className="placeholder" copy={ui.translationHere} size="sm" />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {history.length > 1 ? (
        <ul className="history">
          {history.slice(1, 6).map((t) => (
            <li key={t.id}>
              <span className="h-src">{t.from === 'yue' ? <CantoneseText text={t.source} /> : t.source}</span>
              <span className="h-arrow">→</span>
              <span className="h-tr">
                {t.to === 'yue' ? <CantoneseText text={t.translation} /> : t.translation}
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
