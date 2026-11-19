import { useEffect, useId, useState } from 'react'
import { ChatWorkspacePanel } from '../../../components/ChatWorkspacePanel'
import { DeepSeekMark } from '../../../components/DeepSeekMark'
import { IosHomescreenTip } from '../../../components/IosHomescreenGuide'
import { PwaInstallButton } from '../../../components/PwaInstallButton'
import { openAuthScreen } from '../../../lib/auth'
import { canUseDeepseekChat } from '../../../lib/chatAccess'
import { isChatAuiEnabled, setChatAuiEnabled } from '../../../lib/chatAuiFlag'
import { openApp, openPricing } from '../../../lib/siteLinks'
import { useYueStore } from '../../../lib/store'
import { useAppViewportLock } from '../../../lib/useAppViewportLock'
import { useDocumentMeta } from '../../../lib/useDocumentMeta'
import { safeShellViewportHeight } from '../../../lib/visualViewportHeight'
import '../../ChatPage.css'
import './ChatAui.css'
import { ChatAuiRuntimeProvider, useChatAuiSession } from './ChatAuiRuntime'
import { ChatAuiSidebar, ChatAuiThread } from './ChatAuiThread'

const MENU_ICON = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
    <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

const BACK_ICON = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
    <path d="M12 4L6 10l6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const PLUS_ICON = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
    <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

function TopBrand() {
  return (
    <div className="ds-chat-top-brand" aria-hidden="true">
      <DeepSeekMark className="ds-chat-top-brand-mark" />
      <span className="ds-chat-top-brand-name">
        Deep<span>Seek</span>
      </span>
    </div>
  )
}

function AuiShell({ unlocked }: { unlocked: boolean }) {
  const titleId = useId()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const {
    startNewChat,
    busy,
    harnessOn,
    workspaceOpen,
    setWorkspaceOpen,
    activeWorkspace,
    setActiveWorkspace,
    scheduleJobs,
    addSchedule,
    removeSchedule,
    toggleSchedule,
  } = useChatAuiSession()
  const showWorkspace = harnessOn && workspaceOpen

  return (
    <div
      className={`ds-chat aui-chat${showWorkspace ? ' has-workspace' : ''}${harnessOn ? ' is-harness' : ''}`}
      aria-labelledby={titleId}
    >
      <h1 id={titleId} className="aui-sr-only">
        DeepSeek Chat
      </h1>
      {/* Backdrop + drawer are siblings of main under `.ds-chat` (classic). An
          unstyled in-flow scrim pushed main right and left a black gap. */}
      {sidebarOpen ? (
        <button
          type="button"
          className="ds-chat-sidebar-backdrop"
          aria-label="Close history"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <aside className={`ds-chat-sidebar${sidebarOpen ? ' is-open' : ''}`} aria-label="Chat history">
        <div className="ds-chat-sidebar-brand">
          <DeepSeekMark className="ds-chat-sidebar-brand-mark" />
          <span className="ds-chat-sidebar-brand-name">
            Deep<span>Seek</span>
          </span>
        </div>
        <ChatAuiSidebar onNavigate={() => setSidebarOpen(false)} />
        <div className="ds-chat-sidebar-foot">
          <button
            type="button"
            className="ds-chat-sidebar-link"
            onClick={() => {
              setChatAuiEnabled(false)
              window.location.reload()
            }}
          >
            Classic chat UI
          </button>
        </div>
      </aside>

      {/* Top bar must live inside `.ds-chat-main` — `.ds-chat` is a row flex
          (sidebar + main). A header sibling stretched full height and shoved
          the composer into a right-edge sliver on iPhone. */}
      <div className="ds-chat-main aui-main">
        <header className="ds-chat-top">
          <button
            type="button"
            className="ds-chat-icon-btn ds-chat-menu-btn"
            aria-label="Chat history"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((v) => !v)}
          >
            {MENU_ICON}
          </button>
          <button type="button" className="ds-chat-icon-btn" aria-label="Back to app" onClick={() => openApp()}>
            {BACK_ICON}
          </button>
          <TopBrand />
          <span className="ds-chat-top-spacer" />
          {harnessOn ? (
            <button
              type="button"
              className={`ds-chat-icon-btn${workspaceOpen ? ' is-on' : ''}`}
              aria-label={workspaceOpen ? 'Hide workspace' : 'Show workspace'}
              aria-pressed={workspaceOpen}
              onClick={() => setWorkspaceOpen(!workspaceOpen)}
            >
              WS
            </button>
          ) : null}
          <button
            type="button"
            className="ds-chat-icon-btn"
            aria-label="New chat"
            disabled={busy || !unlocked}
            onClick={() => {
              startNewChat()
              setSidebarOpen(false)
            }}
          >
            {PLUS_ICON}
          </button>
          <PwaInstallButton />
        </header>
        <ChatAuiThread />
      </div>
      {showWorkspace ? (
        <ChatWorkspacePanel
          workspace={activeWorkspace}
          onChange={setActiveWorkspace}
          onClose={() => setWorkspaceOpen(false)}
          sheet={typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches}
          scheduleJobs={scheduleJobs}
          onAddSchedule={addSchedule}
          onRemoveSchedule={removeSchedule}
          onToggleSchedule={toggleSchedule}
        />
      ) : null}
    </div>
  )
}

function GateShell({
  title,
  body,
  primaryLabel,
  onPrimary,
}: {
  title: string
  body: string
  primaryLabel: string
  onPrimary: () => void
}) {
  return (
    <div className="ds-chat aui-chat">
      <div className="ds-chat-main aui-main">
        <header className="ds-chat-top">
          <button type="button" className="ds-chat-icon-btn" aria-label="Back to app" onClick={() => openApp()}>
            {BACK_ICON}
          </button>
          <TopBrand />
          <span className="ds-chat-top-spacer" />
        </header>
        <div className="ds-chat-gate">
          <DeepSeekMark className="ds-chat-empty-mark" />
          <h1>{title}</h1>
          <p>{body}</p>
          <button type="button" className="ds-chat-gate-cta" onClick={onPrimary}>
            {primaryLabel}
          </button>
          <button type="button" className="ds-chat-gate-secondary" onClick={() => openApp()}>
            Back to app
          </button>
        </div>
        <IosHomescreenTip />
      </div>
    </div>
  )
}

/** assistant-ui shell for `#/chat` — Family/Business, feature-flagged. */
export function ChatAuiPage() {
  useAppViewportLock(true)
  useDocumentMeta({
    title: 'DeepSeek Chat — JyutTranslate',
    description: 'General AI chat powered by DeepSeek. Family and Business.',
    path: '/#/chat',
  })

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 })
    document
      .querySelectorAll('.account-hub-backdrop, .account-hub-shell')
      .forEach((el) => el.remove())
  }, [])

  useEffect(() => {
    const root = document.documentElement
    let lastPx = ''
    const apply = () => {
      const height = safeShellViewportHeight()
      if (height == null) return
      const next = `${height}px`
      if (next === lastPx) return
      lastPx = next
      root.style.setProperty('--ds-chat-vh', next)
    }
    apply()
    const raf = window.requestAnimationFrame(apply)
    const t = window.setTimeout(apply, 120)
    window.visualViewport?.addEventListener('resize', apply)
    window.addEventListener('resize', apply)
    return () => {
      window.cancelAnimationFrame(raf)
      window.clearTimeout(t)
      root.style.removeProperty('--ds-chat-vh')
      window.visualViewport?.removeEventListener('resize', apply)
      window.removeEventListener('resize', apply)
    }
  }, [])

  // Persist cutover default (clears a stale opt-out only when query forced AUI).
  useEffect(() => {
    if (isChatAuiEnabled()) setChatAuiEnabled(true)
  }, [])

  const entitlement = useYueStore((s) => s.entitlement)
  const loggedIn = Boolean(entitlement?.loggedIn)
  const unlocked = canUseDeepseekChat(entitlement)

  if (entitlement && !loggedIn) {
    return (
      <GateShell
        title="Sign in to chat"
        body="DeepSeek Chat is available on Family and Business plans."
        primaryLabel="Sign in"
        onPrimary={() => openAuthScreen()}
      />
    )
  }

  if (entitlement && loggedIn && !unlocked) {
    return (
      <GateShell
        title="Family or Business"
        body="Upgrade to unlock DeepSeek chat on the go."
        primaryLabel="View plans"
        onPrimary={() => openPricing()}
      />
    )
  }

  return (
    <ChatAuiRuntimeProvider unlocked={unlocked}>
      <AuiShell unlocked={unlocked} />
    </ChatAuiRuntimeProvider>
  )
}
