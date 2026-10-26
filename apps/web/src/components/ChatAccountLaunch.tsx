import { useId } from 'react'
import { DeepSeekMark } from './DeepSeekMark'
import { openDeepseekChat, openPricing } from '../lib/siteLinks'
import { useYueStore } from '../lib/store'
import { biPlain, ui } from '../lib/uiCopy'
import './HarborQuestAccountLaunch.css'

type Props = {
  /** Close Account Hub before navigating. */
  onNavigate?: () => void
}

function unlocked(entitlement: ReturnType<typeof useYueStore.getState>['entitlement']): boolean {
  if (!entitlement) return false
  if (entitlement.allowed?.chat) return true
  if (entitlement.isAdmin) return true
  return entitlement.plan === 'family' || entitlement.plan === 'business'
}

/** Account Hub launcher for DeepSeek Chat — Family/Business; Free sees locked CTA. */
export function ChatAccountLaunch({ onNavigate }: Props) {
  const uid = useId().replace(/:/g, '')
  const seaId = `ds-sea-${uid}`
  const entitlement = useYueStore((s) => s.entitlement)
  const open = unlocked(entitlement)
  const label = open
    ? `${biPlain(ui.deepseekChatLaunch)} (${biPlain(ui.deepseekChatPlan)})`
    : `${biPlain(ui.deepseekChatLocked)} (${biPlain(ui.deepseekChatPlan)})`

  return (
    <button
      type="button"
      className={`hq-account-launch ds-account-launch${open ? '' : ' is-locked'}`}
      aria-label={label}
      title={label}
      onClick={() => {
        onNavigate?.()
        if (open) openDeepseekChat()
        else openPricing()
      }}
    >
      <span className="hq-account-launch-glyph" aria-hidden="true">
        <svg className="hq-account-launch-svg" viewBox="0 0 40 40" width={40} height={40}>
          <defs>
            <linearGradient id={seaId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#243056" />
              <stop offset="100%" stopColor="#12182a" />
            </linearGradient>
          </defs>
          <circle className="hq-account-launch-ring" cx="20" cy="20" r="18.5" />
          <circle cx="20" cy="20" r="16.5" fill={`url(#${seaId})`} />
          <g transform="translate(8.5 11.5) scale(0.41)" className="ds-account-launch-whale">
            <DeepSeekMark />
          </g>
        </svg>
      </span>
      <span className="hq-account-launch-meta">
        <span className="hq-account-launch-beta">
          {open ? biPlain(ui.deepseekChatPlan) : biPlain(ui.deepseekChatLockedBadge)}
        </span>
        <span className="hq-account-launch-name">{biPlain(ui.deepseekChatShort)}</span>
      </span>
    </button>
  )
}
