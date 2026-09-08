import { motion, useReducedMotion } from 'framer-motion'

type Props = {
  onAskAi?: () => void
  aiBusy?: boolean
}

/**
 * Native take on Aceternity’s text-highlight illustration:
 * prose with a wipe highlight + floating BIUS / Ask AI toolbar.
 * Decorative for Email hub Compose — Ask AI can trigger the real draft action.
 */
export function EmailTextHighlightIllustration({ onAskAi, aiBusy = false }: Props) {
  const reduce = useReducedMotion()

  return (
    <div className="email-highlight-illu" aria-hidden={onAskAi ? undefined : true}>
      <div className="email-highlight-illu-card">
        <p className="email-highlight-illu-copy">
          Once upon a send, your campaign opens with a clear line of trust — then{' '}
          <span className="email-highlight-illu-mark-wrap">
            <motion.span
              className="email-highlight-illu-mark"
              initial={reduce ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }
              }
            />
            <span className="email-highlight-illu-mark-text">Lily finds the right words</span>
            <motion.div
              className="email-highlight-illu-toolbar"
              initial={reduce ? false : { opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { delay: 0.95, duration: 0.35, ease: [0.22, 1, 0.36, 1] }
              }
            >
              <span className="email-highlight-illu-tool" title="Bold">
                B
              </span>
              <span className="email-highlight-illu-tool email-highlight-illu-tool--italic" title="Italic">
                I
              </span>
              <span className="email-highlight-illu-tool email-highlight-illu-tool--underline" title="Underline">
                U
              </span>
              <span className="email-highlight-illu-tool email-highlight-illu-tool--strike" title="Strikethrough">
                S
              </span>
              <span className="email-highlight-illu-tool-sep" />
              <button
                type="button"
                className={`email-highlight-illu-ask${aiBusy ? ' is-busy' : ''}`}
                disabled={!onAskAi || aiBusy}
                onClick={(e) => {
                  e.preventDefault()
                  onAskAi?.()
                }}
              >
                <span className="email-highlight-illu-ask-orb" aria-hidden />
                {aiBusy ? 'Thinking…' : 'Ask AI'}
              </button>
            </motion.div>
          </span>{' '}
          for the rest of the story.
        </p>
        <p className="email-highlight-illu-sub">
          Select a thought, polish the tone, or let AI draft the body — then preview and send.
        </p>
      </div>
    </div>
  )
}
