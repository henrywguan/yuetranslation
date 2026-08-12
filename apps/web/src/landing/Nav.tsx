import { navigate } from '../lib/useHashRoute'

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
        onClick={() => navigate('home')}
        aria-label="Yue home"
      >
        <span className="ln-brand-mark" aria-hidden="true">
          粵
        </span>
        <span className="ln-brand-name">Yue</span>
      </button>
      <div className="ln-nav-links">
        <button type="button" onClick={() => (onFeatures ? onFeatures() : navigate('home'))}>
          Features
        </button>
        <button type="button" onClick={() => navigate('pricing')}>
          Pricing
        </button>
        <button type="button" className="ln-nav-cta" onClick={() => navigate('app')}>
          Launch app
        </button>
      </div>
    </nav>
  )
}
