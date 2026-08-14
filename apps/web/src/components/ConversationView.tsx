import { motion } from 'framer-motion'
import { BiText } from './BiText'
import { CantoneseText } from './CantoneseText'
import { useYueStore } from '../lib/store'
import { ui } from '../lib/uiCopy'

export function ConversationView() {
  const enInterim = useYueStore((s) => s.enInterim)
  const yueInterim = useYueStore((s) => s.yueInterim)
  const enTranslation = useYueStore((s) => s.enTranslation)
  const yueTranslation = useYueStore((s) => s.yueTranslation)
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
          <h2>
            <BiText copy={ui.english} size="md" />
          </h2>
          <p>
            <BiText copy={ui.holdFacingYou} size="sm" layout="stack" />
          </p>
        </header>
        <div className="pane-body">
          <p className="heard">
            {enInterim || <BiText className="placeholder" copy={ui.listening} size="sm" />}
          </p>
          <div className="said">
            <CantoneseText
              text={yueTranslation}
              placeholder={<BiText className="placeholder" copy={ui.yueTranslation} size="sm" />}
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
              placeholder={<BiText className="placeholder" copy={ui.listening} size="sm" />}
            />
          </p>
          <p className="said">
            {enTranslation || <BiText className="placeholder" copy={ui.enTranslation} size="sm" />}
          </p>
        </div>
        <header>
          <h2>
            <BiText copy={ui.cantonese} size="md" />
          </h2>
          <p>
            <BiText copy={ui.friendLooksHere} size="sm" layout="stack" />
          </p>
        </header>
      </motion.section>
    </div>
  )
}
