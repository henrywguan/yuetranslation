import { motion } from 'framer-motion'
import { CantoneseText } from './CantoneseText'
import { useYueStore } from '../lib/store'
import { ui } from '../lib/uiCopy'

/**
 * Face-to-face: two language-pure cards on a shared phone.
 * English card stays upright for you. Cantonese card is rotated 180°
 * so the person across the table reads it the right way up.
 */
export function ConversationView() {
  const enInterim = useYueStore((s) => s.enInterim)
  const yueInterim = useYueStore((s) => s.yueInterim)
  const enTranslation = useYueStore((s) => s.enTranslation)
  const yueTranslation = useYueStore((s) => s.yueTranslation)
  const yueDefinition = useYueStore((s) => s.yueDefinition)
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
          <h2>{ui.english.en}</h2>
          <p>{ui.holdFacingYou.en}</p>
        </header>
        <div className="pane-body">
          <p className="heard">{enInterim || <span className="placeholder">{ui.listening.en}</span>}</p>
          <p className="said">
            {enTranslation || <span className="placeholder">{ui.enTranslation.en}</span>}
          </p>
        </div>
      </motion.section>

      <div className="conversation-gutter" aria-hidden="true">
        <span className="conversation-gutter-line" />
        <span className="conversation-gutter-mark">粵</span>
        <span className="conversation-gutter-line" />
      </div>

      <motion.section
        className="pane pane-yue"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
      >
        <div className="pane-face">
          <header>
            <h2 lang="zh-HK">{ui.cantonese.zh}</h2>
            <p lang="zh-HK">{ui.holdFacingYou.zh}</p>
          </header>
          <div className="pane-body">
            <p className="heard">
              <CantoneseText
                text={yueInterim}
                placeholder={<span className="placeholder">{ui.listening.zh}</span>}
              />
            </p>
            <div className="said">
              <CantoneseText
                text={yueTranslation}
                definition={yueDefinition}
                placeholder={<span className="placeholder">{ui.yueTranslation.zh}</span>}
              />
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  )
}
