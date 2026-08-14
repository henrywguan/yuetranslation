import { openApp, openHome, openPricing } from '../lib/siteLinks'
import { ThemeToggle } from '../components/ThemeToggle'
import { CantoneseText } from '../components/CantoneseText'

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
        aria-label="Yue home"
      >
        <span className="ln-brand-mark" aria-hidden="true">
          <CantoneseText text="粵" />
        </span>
        <span className="ln-brand-name">Yue</span>
      </button>
      <div className="ln-nav-links">
        <button type="button" onClick={() => (onFeatures ? onFeatures() : openHome())}>
          Features
        </button>
        <button type="button" onClick={() => openPricing()}>
          Pricing
        </button>
        <ThemeToggle />
        <button type="button" className="ln-nav-cta" onClick={() => openApp()}>
          Launch app
        </button>
      </div>
    </nav>
  )
}
