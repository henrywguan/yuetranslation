import { usePanelDock } from '../lib/panelDock'
import './DetailPanel.css'

/**
 * Left vertical taskbar for minimized panels (virtual desktop).
 * Harbor/jade glass strip; each tab shows a clear title.
 */
export function PanelDock() {
  const items = usePanelDock((s) => s.items)
  if (!items.length) return null

  return (
    <nav className="panel-taskbar" aria-label="Minimized panels">
      <div className="panel-taskbar-brand" aria-hidden="true">
        <span className="panel-taskbar-brand-mark" />
      </div>
      <ul className="panel-taskbar-list">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`panel-taskbar-tab panel-taskbar-tab--${item.kind || 'other'}`}
              onClick={() => {
                window.dispatchEvent(new CustomEvent('yue-dock-restore', { detail: item.id }))
              }}
              title={`Restore ${item.title}`}
              aria-label={`Restore ${item.title}${item.subtitle ? ` (${item.subtitle})` : ''}`}
            >
              <span className="panel-taskbar-tab-rail" aria-hidden="true" />
              <span className="panel-taskbar-tab-copy">
                <span className="panel-taskbar-tab-title">{item.title}</span>
                {item.subtitle ? (
                  <span className="panel-taskbar-tab-sub" lang="zh-HK">
                    {item.subtitle}
                  </span>
                ) : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
