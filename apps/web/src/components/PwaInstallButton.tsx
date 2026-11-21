import { useEffect, useState } from 'react'
import { BiText } from './BiText'
import {
  getDeferredInstallPrompt,
  promptPwaInstall,
  subscribeInstallPrompt,
} from '../lib/pwaInstallPrompt'
import { isDisplayStandalone } from '../lib/pwaInstall'
import { pwaManifestVariantForRoute } from '../lib/pwaManifestLink'
import { biPlain, ui } from '../lib/uiCopy'
import { useRoute } from '../lib/useHashRoute'

/** Chromium / Android install affordance (beforeinstallprompt). */
export function PwaInstallButton() {
  const route = useRoute()
  const variant = pwaManifestVariantForRoute(route)
  const [available, setAvailable] = useState(() => Boolean(getDeferredInstallPrompt()))
  const [standalone] = useState(() => isDisplayStandalone())

  useEffect(() => subscribeInstallPrompt((p) => setAvailable(Boolean(p))), [])

  if (standalone || !available) return null

  const copy = variant === 'chat' ? ui.pwaInstallChat : ui.pwaInstall

  return (
    <button
      type="button"
      className="pwa-install-btn"
      aria-label={biPlain(copy)}
      onClick={() => {
        void promptPwaInstall()
      }}
    >
      <BiText copy={copy} size="sm" layout="inline" hideJp />
    </button>
  )
}
