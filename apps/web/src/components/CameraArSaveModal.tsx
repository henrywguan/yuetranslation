import { createPortal } from 'react-dom'
import { BiText } from './BiText'
import { biPlain, ui } from '../lib/uiCopy'

type Props = {
  open: boolean
  onClose: () => void
  onSavePhoto: () => void
  onCopyTranslations: () => void
  busy?: boolean
}

/** AR export menu: save composite photo or copy all translations top→bottom. */
export function CameraArSaveModal({
  open,
  onClose,
  onSavePhoto,
  onCopyTranslations,
  busy = false,
}: Props) {
  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="cam-overlay" role="dialog" aria-modal="true" aria-labelledby="cam-ar-save-title">
      <button type="button" className="cam-backdrop" aria-label={biPlain(ui.camChoiceClose)} onClick={onClose} />
      <div className="cam-choice-card cam-ar-save-card">
        <button type="button" className="cam-choice-close" onClick={onClose} aria-label={biPlain(ui.camChoiceClose)}>
          ×
        </button>
        <h2 id="cam-ar-save-title" className="cam-choice-title">
          <BiText copy={ui.camArSaveTitle} size="md" />
        </h2>
        <p className="cam-choice-body">
          <BiText copy={ui.camArSaveBody} size="sm" />
        </p>
        <div className="cam-choice-actions">
          <button
            type="button"
            className="cam-choice-btn cam-choice-btn--ar"
            disabled={busy}
            onClick={onSavePhoto}
          >
            <span className="cam-choice-btn-label">
              <BiText copy={ui.camSaveSnapshot} size="md" />
            </span>
            <span className="cam-choice-btn-hint">
              <BiText copy={ui.camArSavePhotoHint} size="sm" />
            </span>
          </button>
          <button
            type="button"
            className="cam-choice-btn cam-choice-btn--upload"
            disabled={busy}
            onClick={onCopyTranslations}
          >
            <span className="cam-choice-btn-label">
              <BiText copy={ui.camArCopyTranslations} size="md" />
            </span>
            <span className="cam-choice-btn-hint">
              <BiText copy={ui.camArCopyTranslationsHint} size="sm" />
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
