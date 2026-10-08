import { useEffect, useState } from 'react'
import { BiText } from './BiText'
import {
  getDeferredInstallPrompt,
  promptPwaInstall,
  subscribeInstallPrompt,
} from '../lib/pwaInstallPrompt'
import { isDisplayStandalone } from '../lib/pwaInstall'
import { biPlain, ui } from '../lib/uiCopy'

/** Chromium / Android install affordance (beforeinstallprompt). */
export function PwaInstallButton() {
  const [available, setAvailable] = useState(() => Boolean(getDeferredInstallPrompt()))
  const [standalone] = useState(() => isDisplayStandalone())

  useEffect(() => subscribeInstallPrompt((p) => setAvailable(Boolean(p))), [])

  if (standalone || !available) return null

  return (
    <button
      type="button"
      className="pwa-install-btn"
      aria-label={biPlain(ui.pwaInstall)}
      onClick={() => {
        void promptPwaInstall()
      }}
    >
      <BiText copy={ui.pwaInstall} size="sm" layout="inline" hideJp />
    </button>
  )
}
