import { openApp, openHome, openPricing } from '../lib/siteLinks'
import { ThemeToggle } from '../components/ThemeToggle'
import { JyutLogo } from '../components/JyutLogo'
import { BiText } from '../components/BiText'
import { biPlain, ui } from '../lib/uiCopy'

type NavProps = {
  /** Called when "Features" is clicked; defaults to navigating home. */
  onFeatures?: () => void
}

export function Nav({ onFeatures }: NavProps) {
  return (
    <nav className="ln-nav">
      <button
        type="button"
        className="ln-brand ln-brand-btn"
        onClick={() => openHome()}
        aria-label={biPlain(ui.backHome)}
      >
        <JyutLogo className="ln-brand-logo" />
      </button>
      <div className="ln-nav-links">
        <button type="button" onClick={() => (onFeatures ? onFeatures() : openHome())}>
          <BiText copy={ui.navFeatures} size="sm" />
        </button>
        <button type="button" onClick={() => openPricing()}>
          <BiText copy={ui.navPricing} size="sm" />
        </button>
        <ThemeToggle />
        <button type="button" className="ln-nav-cta" onClick={() => openApp()}>
          <BiText copy={ui.navLaunch} size="sm" />
        </button>
      </div>
    </nav>
  )
}
