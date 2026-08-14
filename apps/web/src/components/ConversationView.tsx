import { motion } from 'framer-motion'
import { CantoneseText } from './CantoneseText'
import { TranslationAlternatives } from './TranslationAlternatives'
import { useYueStore } from '../lib/store'

export function ConversationView() {
  const enInterim = useYueStore((s) => s.enInterim)
  const yueInterim = useYueStore((s) => s.yueInterim)
  const enTranslation = useYueStore((s) => s.enTranslation)
  const yueTranslation = useYueStore((s) => s.yueTranslation)
  const yueAlternatives = useYueStore((s) => s.yueAlternatives)
  const openBreakdown = useYueStore((s) => s.openBreakdown)
  const selectYueVariation = useYueStore((s) => s.selectYueVariation)
  const live = useYueStore((s) => s.live)
  const status = useYueStore((s) => s.status)

  return (
    <div className={`conversation ${live ? 'live' : ''} status-${status}`}>
      <motion.section
        className="pane pane-en"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <header>
          <h2>English</h2>
          <p>Hold phone facing you</p>
        </header>
        <div className="pane-body">
          <p className="heard">{enInterim || <span className="placeholder">Listening…</span>}</p>
          <div className="said">
            <CantoneseText
              text={yueTranslation}
              placeholder={<span className="placeholder">粵語 translation</span>}
              onActivate={openBreakdown}
            />
            <TranslationAlternatives
              alternatives={yueAlternatives}
              onSelect={selectYueVariation}
            />
          </div>
        </div>
      </motion.section>

      <div className="conversation-gutter" aria-hidden="true">
        <span>粵</span>
      </div>

      <motion.section
        className="pane pane-yue"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
      >
        <div className="pane-body flipped">
          <p className="heard">
            <CantoneseText
              text={yueInterim}
              placeholder={<span className="placeholder">聽緊…</span>}
              onActivate={openBreakdown}
            />
          </p>
          <p className="said">{enTranslation || <span className="placeholder">English translation</span>}</p>
        </div>
        <header>
          <h2>粵語</h2>
          <p>對面朋友望住呢度</p>
        </header>
      </motion.section>
    </div>
  )
}
