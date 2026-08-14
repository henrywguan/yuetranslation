import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CantoneseText } from './CantoneseText'
import { useYueStore } from '../lib/store'

const ease = [0.22, 1, 0.36, 1] as const

export function ConversationView() {
  const enInterim = useYueStore((s) => s.enInterim)
  const yueInterim = useYueStore((s) => s.yueInterim)
  const enTranslation = useYueStore((s) => s.enTranslation)
  const yueTranslation = useYueStore((s) => s.yueTranslation)
  const live = useYueStore((s) => s.live)
  const status = useYueStore((s) => s.status)
  const reduce = useReducedMotion()

  return (
    <div className={`conversation ${live ? 'live' : ''} status-${status}`}>
      <motion.section
        className={`pane pane-en reading-plane ${live ? 'live-breath' : ''}`}
        initial={reduce ? false : { opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
      >
        <header>
          <h2>English</h2>
          <p>Hold phone facing you</p>
        </header>
        <div className="pane-body">
          <AnimatePresence mode="wait">
            <motion.p
              key={enInterim || 'en-heard'}
              className="heard"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.35, ease }}
            >
              {enInterim || <span className="placeholder">Listening…</span>}
            </motion.p>
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <motion.div
              key={yueTranslation || 'en-said'}
              className="said"
              initial={reduce ? false : { opacity: 0, y: 12, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={reduce ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.48, ease }}
            >
              <CantoneseText
                text={yueTranslation}
                placeholder={<span className="placeholder">粵語 translation</span>}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.section>

      <div className="conversation-gutter" aria-hidden="true">
        <span>粵</span>
      </div>

      <motion.section
        className={`pane pane-yue reading-plane ${live ? 'live-breath' : ''}`}
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: reduce ? 0 : 0.05, ease }}
      >
        <div className="pane-body flipped">
          <AnimatePresence mode="wait">
            <motion.p
              key={yueInterim || 'yue-heard'}
              className="heard"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.35, ease }}
            >
              <CantoneseText
                text={yueInterim}
                placeholder={<span className="placeholder">聽緊…</span>}
              />
            </motion.p>
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <motion.p
              key={enTranslation || 'yue-said'}
              className="said"
              initial={reduce ? false : { opacity: 0, y: 12, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.48, ease }}
            >
              {enTranslation || <span className="placeholder">English translation</span>}
            </motion.p>
          </AnimatePresence>
        </div>
        <header>
          <h2>粵語</h2>
          <p>對面朋友望住呢度</p>
        </header>
      </motion.section>
    </div>
  )
}
