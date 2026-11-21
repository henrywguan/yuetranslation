import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { ChatWorkspacePanel } from '../../../components/ChatWorkspacePanel'
import { DeepSeekMark } from '../../../components/DeepSeekMark'
import { IosHomescreenTip } from '../../../components/IosHomescreenGuide'
import { PwaInstallButton } from '../../../components/PwaInstallButton'
import { openAuthScreen } from '../../../lib/auth'
import { canUseDeepseekChat } from '../../../lib/chatAccess'
import { isChatAuiEnabled, setChatAuiEnabled } from '../../../lib/chatAuiFlag'
import { resolveActiveSandboxSessionId } from '../../../lib/chatInbox'
import { shouldShowReviewRail } from '../../../lib/chatReviewActivity'
import {
  CHAT_INBOX_SIDEBAR_WIDTH_DEFAULT,
  CHAT_INBOX_SIDEBAR_WIDTH_MAX,
  CHAT_INBOX_SIDEBAR_WIDTH_MIN,
  clampChatInboxSidebarWidth,
  readChatInboxSidebarWidth,
  writeChatInboxSidebarWidth,
} from '../../../lib/chatUiPrefs'
import { startChatDeepAvatarCloudSync } from '../../../lib/chatDeepAvatarCloudSync'
import { openApp, openPricing } from '../../../lib/siteLinks'
import { useYueStore } from '../../../lib/store'
import { useAppViewportLock } from '../../../lib/useAppViewportLock'
import { useDocumentMeta } from '../../../lib/useDocumentMeta'
import { safeShellViewportHeight } from '../../../lib/visualViewportHeight'
import '../../ChatPage.css'
import './ChatAui.css'
import { ChatInboxProvider, useChatInboxContext } from '../inbox/ChatInboxContext'
import { InboxShell } from '../inbox/InboxShell'
import { ChatAuiRuntimeProvider, useChatAuiSession } from './ChatAuiRuntime'
import { ChatAuiThread } from './ChatAuiThread'
import { ChatDeepAvatarIntroOverlay } from './ChatDeepAvatarIntro'
import { ChatReviewRail } from './ChatReviewRail'

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
  // Desktop defaults open; menu still toggles Inbox chrome open/closed.
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 900px)').matches,
  )
  const [sidebarWidth, setSidebarWidth] = useState(() => readChatInboxSidebarWidth())
  const [sidebarResizing, setSidebarResizing] = useState(false)
  const resizeDrag = useRef<{ startX: number; startW: number } | null>(null)
  const sidebarWidthRef = useRef(sidebarWidth)
  sidebarWidthRef.current = sidebarWidth
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
    reviewActivity,
    reviewOpen,
    setReviewOpen,
    refreshGitDiff,
    gitDiffBusy,
    activeId,
  } = useChatAuiSession()
  const inbox = useChatInboxContext()
  const showWorkspace = harnessOn && workspaceOpen

  const sandboxSessionId = useMemo(
    () => resolveActiveSandboxSessionId(inbox.state),
    [inbox.state],
  )
  const hasBoundWorkspace = inbox.state.workspaces.some((w) => Boolean(w.ref?.trim()))
  const inReviewAgent = inbox.state.agents.find(
    (a) => a.status === 'in_review' || Boolean(a.reviewUrl?.trim()),
  )
  const showReview = shouldShowReviewRail({
    activity: reviewActivity,
    hasBoundWorkspace,
    hasInReview: Boolean(inReviewAgent),
  })
  const reviewVisible = showReview && reviewOpen
  const reviewUrl =
    reviewActivity.reviewUrl ||
    inReviewAgent?.reviewUrl ||
    inbox.state.agents.find((a) => a.threadId === activeId)?.reviewUrl

  useEffect(() => {
    if (!sidebarResizing) return
    const prev = document.body.style.cursor
    const prevSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    return () => {
      document.body.style.cursor = prev
      document.body.style.userSelect = prevSelect
    }
  }, [sidebarResizing])

  const applySidebarWidth = (px: number, persist: boolean) => {
    const next = clampChatInboxSidebarWidth(
      px,
      typeof window !== 'undefined' ? window.innerWidth : undefined,
    )
    sidebarWidthRef.current = next
    setSidebarWidth(next)
    if (persist) writeChatInboxSidebarWidth(next)
  }

  const onResizePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Desktop-only drag; mobile keeps the absolute drawer (no edge resize).
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 899px)').matches) return
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    resizeDrag.current = { startX: e.clientX, startW: sidebarWidth }
    setSidebarResizing(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onResizePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = resizeDrag.current
    if (!drag) return
    applySidebarWidth(drag.startW + (e.clientX - drag.startX), false)
  }

  const endResize = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!resizeDrag.current) return
    resizeDrag.current = null
    setSidebarResizing(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
    writeChatInboxSidebarWidth(sidebarWidthRef.current)
  }

  const shellStyle = {
    ['--ds-sidebar-w' as string]: `${sidebarWidth}px`,
  } as CSSProperties

  return (
    <div
      className={`ds-chat aui-chat${showWorkspace ? ' has-workspace' : ''}${reviewVisible ? ' has-review' : ''}${harnessOn ? ' is-harness' : ''}${sidebarOpen ? ' is-inbox-open' : ' is-inbox-collapsed'}${sidebarResizing ? ' is-inbox-resizing' : ''}`}
      style={shellStyle}
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
          aria-label="Close inbox"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <aside className={`ds-chat-sidebar${sidebarOpen ? ' is-open' : ''}`} aria-label="Inbox">
        <div className="ds-chat-sidebar-brand">
          <DeepSeekMark className="ds-chat-sidebar-brand-mark" />
          <span className="ds-chat-sidebar-brand-name">
            Deep<span>Seek</span>
          </span>
        </div>
        <InboxShell
          onNavigate={() => {
            // Mobile drawer closes after pick; desktop Inbox stays unless menu collapses it.
            if (typeof window !== 'undefined' && window.matchMedia('(max-width: 899px)').matches) {
              setSidebarOpen(false)
            }
          }}
        />
        {/* Classic / Back to app / theme live in InboxSettingsMenu (header cog). */}
        {/* Desktop edge drag only — hidden on mobile drawer via CSS. */}
        {sidebarOpen ? (
          <div
            className="ds-chat-sidebar-resize"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize inbox"
            aria-valuenow={sidebarWidth}
            aria-valuemin={CHAT_INBOX_SIDEBAR_WIDTH_MIN}
            aria-valuemax={CHAT_INBOX_SIDEBAR_WIDTH_MAX}
            title="Drag to resize · double-click to reset"
            tabIndex={0}
            onPointerDown={onResizePointerDown}
            onPointerMove={onResizePointerMove}
            onPointerUp={endResize}
            onPointerCancel={endResize}
            onDoubleClick={() => applySidebarWidth(CHAT_INBOX_SIDEBAR_WIDTH_DEFAULT, true)}
            onKeyDown={(e) => {
              const step = e.shiftKey ? 24 : 12
              if (e.key === 'ArrowLeft') {
                e.preventDefault()
                applySidebarWidth(sidebarWidth - step, true)
              } else if (e.key === 'ArrowRight') {
                e.preventDefault()
                applySidebarWidth(sidebarWidth + step, true)
              } else if (e.key === 'Home') {
                e.preventDefault()
                applySidebarWidth(CHAT_INBOX_SIDEBAR_WIDTH_MIN, true)
              } else if (e.key === 'End') {
                e.preventDefault()
                applySidebarWidth(CHAT_INBOX_SIDEBAR_WIDTH_MAX, true)
              } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                applySidebarWidth(CHAT_INBOX_SIDEBAR_WIDTH_DEFAULT, true)
              }
            }}
          />
        ) : null}
      </aside>

      {/* Top bar must live inside `.ds-chat-main` — `.ds-chat` is a row flex
          (sidebar + main). A header sibling stretched full height and shoved
          the composer into a right-edge sliver on iPhone. */}
      <div className="ds-chat-main aui-main">
        <header className="ds-chat-top">
          <button
            type="button"
            className="ds-chat-icon-btn ds-chat-menu-btn"
            aria-label={sidebarOpen ? 'Collapse inbox' : 'Open inbox'}
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((v) => !v)}
          >
            {MENU_ICON}
          </button>
          <TopBrand />
          <span className="ds-chat-top-spacer" />
          {showReview ? (
            <button
              type="button"
              className={`ds-chat-icon-btn${reviewOpen ? ' is-on' : ''}`}
              aria-label={reviewOpen ? 'Hide review pane' : 'Show diffs and runs'}
              aria-pressed={reviewOpen}
              onClick={() => setReviewOpen(!reviewOpen)}
            >
              Δ
            </button>
          ) : null}
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
              if (typeof window !== 'undefined' && window.matchMedia('(max-width: 899px)').matches) {
                setSidebarOpen(false)
              }
            }}
          >
            {PLUS_ICON}
          </button>
          <PwaInstallButton />
        </header>
        <ChatAuiThread />
      </div>
      {reviewVisible ? (
        <ChatReviewRail
          activity={reviewActivity}
          reviewUrl={reviewUrl}
          sandboxSessionId={sandboxSessionId}
          refreshing={gitDiffBusy}
          sheet={typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches}
          onRefreshGit={() => {
            void refreshGitDiff()
          }}
          onClose={() => setReviewOpen(false)}
        />
      ) : null}
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
      {/* Companion intro — once per character until seen (boy / girl by pick). */}
      <ChatDeepAvatarIntroOverlay />
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

  useEffect(() => {
    if (!entitlement?.loggedIn) return
    startChatDeepAvatarCloudSync(entitlement.prefs?.chatDeepAvatar ?? null)
  }, [entitlement?.loggedIn, entitlement?.prefs?.chatDeepAvatar])

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
    <ChatInboxProvider>
      <ChatAuiRuntimeProvider unlocked={unlocked}>
        <AuiShell unlocked={unlocked} />
      </ChatAuiRuntimeProvider>
    </ChatInboxProvider>
  )
}
