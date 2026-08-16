import { usePanelDock } from '../lib/panelDock'
import './DetailPanel.css'

/** Collects minimized floating panels (History, Details, …) like a desktop dock. */
export function PanelDock() {
  const items = usePanelDock((s) => s.items)
  if (!items.length) return null

  return (
    <nav className="panel-dock" aria-label="Minimized panels">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className="panel-dock-chip"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('yue-dock-restore', { detail: item.id }))
          }}
          title={`Restore ${item.subtitle || item.title}`}
        >
          {item.subtitle ? <span className="panel-dock-chip-sub">{item.subtitle}</span> : null}
          <span className="panel-dock-chip-title" lang="zh-HK">
            {item.title}
          </span>
        </button>
      ))}
    </nav>
  )
}
