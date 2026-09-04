import { createPortal } from 'react-dom'
import { BiText } from './BiText'
import { biPlain, ui } from '../lib/uiCopy'

type Props = {
  open: boolean
  onClose: () => void
  onAr: () => void
  onUpload: () => void
  onDocs: () => void
  /** Guests cannot use Documents — grey the button and open sign-in on tap. */
  docsDisabled?: boolean
}

/** Floating modal: AR / upload image / documents. Portaled above the dock. */
export function CameraChoiceModal({ open, onClose, onAr, onUpload, onDocs, docsDisabled = false }: Props) {
  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="cam-overlay" role="dialog" aria-modal="true" aria-labelledby="cam-choice-title">
      <button type="button" className="cam-backdrop" aria-label={biPlain(ui.camChoiceClose)} onClick={onClose} />
      <div className="cam-choice-card">
        <button type="button" className="cam-choice-close" onClick={onClose} aria-label={biPlain(ui.camChoiceClose)}>
          ×
        </button>
        <h2 id="cam-choice-title" className="cam-choice-title">
          <BiText copy={ui.camChoiceTitle} size="md" />
        </h2>
        <p className="cam-choice-body">
          <BiText copy={ui.camChoiceBody} size="sm" />
        </p>
        <div className="cam-choice-actions">
          <button type="button" className="cam-choice-btn cam-choice-btn--ar" onClick={onAr}>
            <span className="cam-choice-btn-label">
              <BiText copy={ui.camChoiceAr} size="md" />
            </span>
            <span className="cam-choice-btn-hint">
              <BiText copy={ui.camChoiceArHint} size="sm" />
            </span>
          </button>
          <button type="button" className="cam-choice-btn cam-choice-btn--upload" onClick={onUpload}>
            <span className="cam-choice-btn-label">
              <BiText copy={ui.camChoiceUpload} size="md" />
            </span>
            <span className="cam-choice-btn-hint">
              <BiText copy={ui.camChoiceUploadHint} size="sm" />
            </span>
          </button>
          <button
            type="button"
            className={`cam-choice-btn cam-choice-btn--docs${docsDisabled ? ' is-disabled' : ''}`}
            onClick={onDocs}
            aria-disabled={docsDisabled}
          >
            <span className="cam-choice-btn-label">
              <BiText copy={ui.camChoiceDocs} size="md" />
            </span>
            <span className="cam-choice-btn-hint">
              <BiText copy={docsDisabled ? ui.guestDocsSignIn : ui.camChoiceDocsHint} size="sm" />
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
