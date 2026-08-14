import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CantoneseText } from './CantoneseText'
import { useYueStore } from '../lib/store'

const ease = [0.22, 1, 0.36, 1] as const

export function SoloView() {
  const enInterim = useYueStore((s) => s.enInterim)
  const yueInterim = useYueStore((s) => s.yueInterim)
  const enTranslation = useYueStore((s) => s.enTranslation)
  const yueTranslation = useYueStore((s) => s.yueTranslation)
  const live = useYueStore((s) => s.live)
  const status = useYueStore((s) => s.status)
  const history = useYueStore((s) => s.history)
  const reduce = useReducedMotion()

  const source = enInterim || yueInterim
  const sourceIsYue = Boolean(yueInterim)
  const translation = sourceIsYue ? enTranslation : yueTranslation
  const latest = history[0]
  const translationText = translation || latest?.translation || ''

  return (
    <div className="solo">
      <motion.div
        className={`solo-stage reading-plane ${live ? 'live' : ''} status-${status}`}
        animate={
          reduce || !live
            ? {}
            : {
                boxShadow: [
                  '0 0 0 0 rgba(61,207,182,0)',
                  'inset 0 0 0 1px rgba(61,207,182,0.18), 0 0 0 10px rgba(61,207,182,0.05)',
                  '0 0 0 0 rgba(61,207,182,0)',
                ],
              }
        }
        transition={{ duration: 2.8, repeat: live && !reduce ? Infinity : 0, ease: 'easeInOut' }}
      >
        <p className="solo-label">{sourceIsYue ? '粵語' : 'English'}</p>
        <AnimatePresence mode="wait">
          <motion.div
            key={source || 'empty-src'}
            className="solo-source"
            initial={reduce ? false : { opacity: 0, y: 10, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={reduce ? undefined : { opacity: 0, y: -6, filter: 'blur(4px)' }}
            transition={{ duration: 0.42, ease }}
          >
            {sourceIsYue ? (
              <CantoneseText
                text={source}
                placeholder={<span className="placeholder">Speak to translate</span>}
              />
            ) : (
              source || <span className="placeholder">Speak to translate</span>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="solo-divider" aria-hidden="true" />

        <p className="solo-label">{sourceIsYue ? 'English' : '粵語'}</p>
        <AnimatePresence mode="wait">
          <motion.div
            key={translationText || 'empty-tr'}
            className="solo-translation"
            initial={reduce ? false : { opacity: 0, y: 14, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={reduce ? undefined : { opacity: 0, y: -8, filter: 'blur(4px)' }}
            transition={{ duration: 0.5, ease }}
          >
            {sourceIsYue ? (
              translationText || <span className="placeholder">Translation appears here</span>
            ) : (
              <CantoneseText
                text={translationText}
                placeholder={<span className="placeholder">Translation appears here</span>}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {history.length > 1 ? (
        <ul className="history">
          {history.slice(1, 6).map((t) => (
            <li key={t.id}>
              <span className="h-src">
                {t.from === 'yue' ? <CantoneseText text={t.source} /> : t.source}
              </span>
              <span className="h-arrow">→</span>
              <span className="h-tr">
                {t.to === 'yue' ? <CantoneseText text={t.translation} /> : t.translation}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
