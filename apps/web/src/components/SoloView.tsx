import { AnimatePresence, motion } from 'framer-motion'
import { CantoneseText } from './CantoneseText'
import { useYueStore } from '../lib/store'

export function SoloView() {
  const enInterim = useYueStore((s) => s.enInterim)
  const yueInterim = useYueStore((s) => s.yueInterim)
  const enTranslation = useYueStore((s) => s.enTranslation)
  const yueTranslation = useYueStore((s) => s.yueTranslation)
  const live = useYueStore((s) => s.live)
  const status = useYueStore((s) => s.status)
  const history = useYueStore((s) => s.history)

  const source = enInterim || yueInterim
  const sourceIsYue = Boolean(yueInterim)
  const translation = sourceIsYue ? enTranslation : yueTranslation
  const latest = history[0]

  return (
    <div className="solo">
      <motion.div
        className={`solo-stage ${live ? 'live' : ''} status-${status}`}
        animate={live ? { boxShadow: ['0 0 0 0 rgba(61,207,182,0)', '0 0 0 12px rgba(61,207,182,0.08)', '0 0 0 0 rgba(61,207,182,0)'] } : {}}
        transition={{ duration: 2.4, repeat: live ? Infinity : 0 }}
      >
        <p className="solo-label">
          {sourceIsYue ? <CantoneseText text="粵語" /> : 'English'}
        </p>
        <AnimatePresence mode="wait">
          <motion.p
            key={source || 'empty-src'}
            className="solo-source"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <CantoneseText
              text={source}
              placeholder={<span className="placeholder">Speak to translate</span>}
            />
          </motion.p>
        </AnimatePresence>

        <div className="solo-divider" />

        <p className="solo-label">
          {sourceIsYue ? 'English' : <CantoneseText text="粵語" />}
        </p>
        <AnimatePresence mode="wait">
          <motion.div
            key={translation || latest?.translation || 'empty-tr'}
            className="solo-translation"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <CantoneseText
              text={translation || latest?.translation || ''}
              placeholder={<span className="placeholder">Translation appears here</span>}
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {history.length > 1 ? (
        <ul className="history">
          {history.slice(1, 6).map((t) => (
            <li key={t.id}>
              <span className="h-src">
                <CantoneseText text={t.source} />
              </span>
              <span className="h-arrow">→</span>
              <span className="h-tr">
                <CantoneseText text={t.translation} />
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
