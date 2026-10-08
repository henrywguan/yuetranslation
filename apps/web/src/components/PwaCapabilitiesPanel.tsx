import { BiText } from './BiText'
import { PwaInstallButton } from './PwaInstallButton'
import { IosHomescreenHubButton } from './IosHomescreenGuide'
import { shouldOfferIosHomescreenGuide, isDisplayStandalone } from '../lib/pwaInstall'
import { ui } from '../lib/uiCopy'

/** Teach share-target / file open / shortcuts + install CTAs. */
export function PwaCapabilitiesPanel({
  onOpenIosGuide,
}: {
  onOpenIosGuide: () => void
}) {
  const standalone = isDisplayStandalone()

  return (
    <div className="pwa-capabilities-panel">
      <p className="account-hub-hint">
        <BiText copy={ui.pwaCapabilitiesHint} size="sm" />
      </p>
      <ul className="pwa-capabilities-list">
        <li>
          <BiText copy={ui.pwaCapShare} size="sm" />
        </li>
        <li>
          <BiText copy={ui.pwaCapFiles} size="sm" />
        </li>
        <li>
          <BiText copy={ui.pwaCapShortcuts} size="sm" />
        </li>
      </ul>
      <div className="pwa-capabilities-actions">
        <PwaInstallButton />
        {shouldOfferIosHomescreenGuide() ? (
          <IosHomescreenHubButton onOpen={onOpenIosGuide} />
        ) : null}
        {standalone ? (
          <p className="account-hub-hint">
            <BiText copy={ui.pwaInstalled} size="sm" layout="inline" hideJp />
          </p>
        ) : null}
      </div>
    </div>
  )
}
