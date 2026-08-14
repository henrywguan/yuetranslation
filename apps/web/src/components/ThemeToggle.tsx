import { useTheme } from '../lib/theme'
import { biPlain, ui } from '../lib/uiCopy'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const label = isDark ? ui.lightTheme : ui.darkTheme

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      onClick={toggleTheme}
      aria-label={biPlain(label)}
      title={biPlain(label)}
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <span className={`theme-toggle-thumb ${isDark ? 'is-dark' : 'is-light'}`}>
          {isDark ? '☾' : '☀'}
        </span>
      </span>
    </button>
  )
}
