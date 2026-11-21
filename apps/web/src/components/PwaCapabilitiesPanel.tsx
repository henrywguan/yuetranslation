import { BiText } from './BiText'
import { PwaInstallButton } from './PwaInstallButton'
import { IosHomescreenHubButton } from './IosHomescreenGuide'
import { shouldOfferIosHomescreenGuide, isDisplayStandalone } from '../lib/pwaInstall'
import { openDeepseekChat } from '../lib/siteLinks'
import { biPlain, ui } from '../lib/uiCopy'

/** Teach share-target / file open / shortcuts + dual PWA install CTAs. */
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
      <div className="pwa-dual-links" aria-label={biPlain(ui.pwaCapabilities)}>
        <div className="pwa-dual-link">
          <img
            className="pwa-dual-link-icon"
            src={`${import.meta.env.BASE_URL}pwa-192.png`.replace(/\/{2,}/g, '/')}
            alt=""
            width={36}
            height={36}
          />
          <div className="pwa-dual-link-copy">
            <span className="pwa-dual-link-title">
              <BiText copy={ui.pwaInstallTranslator} size="sm" layout="inline" hideJp />
            </span>
            <span className="pwa-dual-link-meta">/#/app</span>
          </div>
        </div>
        <button
          type="button"
          className="pwa-dual-link pwa-dual-link--action"
          onClick={() => openDeepseekChat()}
          aria-label={biPlain(ui.pwaOpenChatToInstall)}
        >
          <img
            className="pwa-dual-link-icon"
            src={`${import.meta.env.BASE_URL}pwa-chat-192.png`.replace(/\/{2,}/g, '/')}
            alt=""
            width={36}
            height={36}
          />
          <div className="pwa-dual-link-copy">
            <span className="pwa-dual-link-title">
              <BiText copy={ui.pwaOpenChatToInstall} size="sm" layout="inline" hideJp />
            </span>
            <span className="pwa-dual-link-meta">/#/chat</span>
          </div>
          <span className="pwa-dual-link-chevron" aria-hidden="true">
            ›
          </span>
        </button>
      </div>
      <p className="account-hub-hint">
        <BiText copy={ui.pwaDualBrowserHint} size="sm" />
      </p>
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
