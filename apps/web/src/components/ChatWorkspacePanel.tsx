import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import type { ChatScheduleJob } from '../lib/chatSchedule'
import type { ChatInboxAgent } from '../lib/chatInbox'
import { statusChipLabel } from '../lib/chatInbox'
import {
  CHAT_WORKSPACE_MAX_TEXT_CHARS,
  downloadWorkspaceFile,
  downloadWorkspaceZip,
  type ChatWorkspace,
  type ChatWorkspaceFile,
  normalizeWorkspacePath,
  upsertWorkspaceFile,
} from '../lib/chatWorkspace'
import { suggestPromotedWorkspaceTitle } from '../lib/chatPromotedWorkspace'
import {
  CHAT_WORKSPACE_PANEL_WIDTH_DEFAULT,
  CHAT_WORKSPACE_PANEL_WIDTH_MAX,
  CHAT_WORKSPACE_PANEL_WIDTH_MIN,
  CHAT_WORKSPACE_TAB_IDS,
  clampChatWorkspacePanelWidth,
  normalizeChatWorkspaceTabId,
  readChatWorkspaceActiveTab,
  readChatWorkspaceFilesView,
  readChatWorkspaceOpenTabs,
  readChatWorkspacePanelWidth,
  readChatWorkspaceScheduleOpen,
  writeChatWorkspaceActiveTab,
  writeChatWorkspaceFilesView,
  writeChatWorkspaceOpenTabs,
  writeChatWorkspacePanelWidth,
  writeChatWorkspaceScheduleOpen,
  type ChatWorkspaceFilesView,
  type ChatWorkspaceTabId,
} from '../lib/chatUiPrefs'
import { renderChatMarkdown } from '../lib/renderChatMarkdown'

type Props = {
  workspace: ChatWorkspace | undefined
  onChange: (ws: ChatWorkspace) => void
  onClose: () => void
  /** Narrow viewport: sheet below the chat topbar (Δ / WS stay clickable). */
  sheet?: boolean
  scheduleJobs?: ChatScheduleJob[]
  onAddSchedule?: (prompt: string, cadence: ChatScheduleJob['cadence']) => void
  onRemoveSchedule?: (id: string) => void
  onToggleSchedule?: (id: string, enabled: boolean) => void
  /**
   * Promote Thread files into Inbox → Workspaces (kind `files`).
   * Returns the saved workspace id when successful.
   */
  onPromoteToWorkspaces?: (opts: {
    title: string
    workspace: ChatWorkspace
  }) => Promise<string | void> | string | void
  /** Optional live width override from parent shell (keeps main margin in sync). */
  panelWidth?: number
  onPanelWidthChange?: (px: number, persist: boolean) => void
  /** Agent workspace-write consent gate — red shake pulse on panel chrome. */
  consentHighlight?: boolean
  /** Show Plan / Tasks tabs (AUI Project context). Classic Files-only when false. */
  enablePlanTasks?: boolean
  /** External focus request: files | plan | tasks. */
  focusTab?: ChatWorkspaceTabId | null
  onFocusTabConsumed?: () => void
  planDraft?: string
  onPlanDraftChange?: (text: string) => void
  onSavePlan?: () => { ok: boolean; path?: string; error?: string }
  onBuildPlan?: () => void | Promise<void>
  planBusy?: boolean
  /** Agent turn still running — defer heavy HTML iframe paint. */
  agentBusy?: boolean
  projectAgents?: ChatInboxAgent[]
  onOpenAgent?: (agent: ChatInboxAgent) => void
  projectTitle?: string | null
}

/** Auto-iframe only for tiny static HTML; larger / script-heavy pages need opt-in. */
const HTML_AUTO_PREVIEW_MAX_CHARS = 4_000
const HTML_EDITOR_PAINT_CHARS = 12_000

function htmlNeedsOptInPreview(text: string): boolean {
  if (text.length > HTML_AUTO_PREVIEW_MAX_CHARS) return true
  // Self-contained three.js / splash pages — parsing scripts freezes even with sandbox="".
  if (/<script[\s>]/i.test(text)) return true
  return false
}

function previewMime(file: ChatWorkspaceFile): 'html' | 'markdown' | 'text' {
  if (file.mime?.includes('html') || /\.html?$/i.test(file.path)) return 'html'
  if (
    file.mime?.includes('markdown') ||
    /\.(md|markdown|mdx)$/i.test(file.path)
  ) {
    return 'markdown'
  }
  return 'text'
}

function slugZipName(title: string): string {
  const base = title.replace(/[^\w.\u3400-\u9fff-]+/g, '_').slice(0, 48) || 'workspace-files'
  return base.endsWith('.zip') ? base : `${base}.zip`
}

function fileExt(path: string): string {
  const base = path.split('/').pop() || path
  const i = base.lastIndexOf('.')
  if (i <= 0) return ''
  return base.slice(i + 1).toLowerCase()
}

function ricedIconLabel(path: string): string {
  const ext = fileExt(path)
  const map: Record<string, string> = {
    md: 'MD',
    markdown: 'MD',
    html: 'HT',
    htm: 'HT',
    ts: 'TS',
    tsx: 'TX',
    js: 'JS',
    jsx: 'JX',
    json: '{ }',
    css: 'CS',
    svg: 'SV',
    txt: 'TX',
    csv: 'CV',
    py: 'PY',
  }
  return map[ext] || '·'
}

function nextUntitledPath(files: ChatWorkspaceFile[]): string {
  const used = new Set(files.map((f) => f.path))
  if (!used.has('notes/scratch.md')) return 'notes/scratch.md'
  for (let i = 1; i < 100; i += 1) {
    const p = `notes/untitled-${i}.md`
    if (!used.has(p)) return p
  }
  return `notes/untitled-${Date.now()}.md`
}

const TAB_LABEL: Record<ChatWorkspaceTabId, string> = {
  files: 'Files',
  plan: 'Plan',
  tasks: 'Tasks',
}

function IconBtn({
  label,
  onClick,
  disabled,
  accent,
  danger,
  children,
  pressed,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  accent?: boolean
  danger?: boolean
  children: ReactNode
  pressed?: boolean
}) {
  return (
    <button
      type="button"
      className={`ds-chat-workspace-icon-btn${accent ? ' is-accent' : ''}${danger ? ' is-danger' : ''}${pressed ? ' is-on' : ''}`}
      aria-label={label}
      title={label}
      disabled={disabled}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

const IcUpload = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
    <path
      fill="currentColor"
      d="M8 1.5 4.5 5h2v5h3V5h2L8 1.5ZM2.5 12v1.5h11V12h-11Z"
    />
  </svg>
)
const IcNew = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
    <path fill="currentColor" d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.6" />
  </svg>
)
const IcSelect = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
    <rect x="2" y="2" width="12" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
    <path d="M4.5 8.2 7 10.5 11.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
  </svg>
)
const IcZip = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
    <path
      fill="currentColor"
      d="M3 2.5h6l3.5 3.5V13.5H3v-11Zm6 .8V6h2.7L9 3.3ZM5 8h1v1H5V8Zm1 1h1v1H6V9Zm-1 1h1v1H5v-1Zm1 1h1v1H6v-1Zm2.2 1.2h3.3v1.3H8.2V11.2Z"
    />
  </svg>
)
const IcDl = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
    <path
      fill="currentColor"
      d="M8 2v7.2L5.4 6.6 4.3 7.7 8 11.4l3.7-3.7-1.1-1.1L9 9.2V2H8ZM3 12.5V14h10v-1.5H3Z"
    />
  </svg>
)
const IcSave = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
    <path
      fill="currentColor"
      d="M2.5 2.5h9.2L13.5 4.3V13.5h-11v-11Zm2 1.5v3.5h5V4H4.5Zm1 6.5h5v2h-5v-2Z"
    />
  </svg>
)
const IcList = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
    <path fill="currentColor" d="M2 3.5h12v1.4H2V3.5Zm0 3.8h12v1.4H2V7.3Zm0 3.8h12V12.5H2v-1.4Z" />
  </svg>
)
const IcDesk = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
    <rect x="2" y="2" width="5" height="5" rx="1" fill="currentColor" opacity="0.85" />
    <rect x="9" y="2" width="5" height="5" rx="1" fill="currentColor" opacity="0.55" />
    <rect x="2" y="9" width="5" height="5" rx="1" fill="currentColor" opacity="0.55" />
    <rect x="9" y="9" width="5" height="5" rx="1" fill="currentColor" opacity="0.85" />
  </svg>
)
const IcExpand = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
    <path
      fill="currentColor"
      d="M3 3h4v1.4H4.4V7H3V3Zm6 0h4v4h-1.4V4.4H9V3ZM3 9h1.4v2.6H7V13H3V9Zm8.6 0H13v4H9v-1.4h2.6V9Z"
    />
  </svg>
)

type TaskSectionId = 'working' | 'needs_you' | 'in_review' | 'done' | 'canceled' | 'idle'

const TASK_SECTIONS: Array<{ id: TaskSectionId; title: string; match: (s: string) => boolean }> = [
  {
    id: 'working',
    title: 'Working',
    match: (s) => s === 'working' || s === 'queued',
  },
  {
    id: 'needs_you',
    title: 'Needs you',
    match: (s) => s === 'needs_attention',
  },
  {
    id: 'in_review',
    title: 'In review',
    match: (s) => s === 'in_review',
  },
  {
    id: 'done',
    title: 'Done',
    match: (s) => s === 'done',
  },
  {
    id: 'canceled',
    title: 'Canceled',
    match: (s) => s === 'canceled',
  },
  {
    id: 'idle',
    title: 'Idle',
    match: (s) => s === 'idle',
  },
]

export function ChatWorkspacePanel({
  workspace,
  onChange,
  onClose,
  sheet,
  scheduleJobs = [],
  onAddSchedule,
  onRemoveSchedule,
  onToggleSchedule,
  onPromoteToWorkspaces,
  panelWidth: panelWidthProp,
  onPanelWidthChange,
  consentHighlight = false,
  enablePlanTasks = false,
  focusTab = null,
  onFocusTabConsumed,
  planDraft = '',
  onPlanDraftChange,
  onSavePlan,
  onBuildPlan,
  planBusy = false,
  agentBusy = false,
  projectAgents = [],
  onOpenAgent,
  projectTitle = null,
}: Props) {
  const files = workspace?.files || []
  const [selectedPath, setSelectedPath] = useState<string | null>(files[0]?.path || null)
  const [checked, setChecked] = useState<Set<string>>(() => new Set())
  const [scheduleDraft, setScheduleDraft] = useState('')
  const [scheduleCadence, setScheduleCadence] = useState<ChatScheduleJob['cadence']>('daily')
  const [promoteBusy, setPromoteBusy] = useState(false)
  const [promoteNote, setPromoteNote] = useState<string | null>(null)
  const [planSaveNote, setPlanSaveNote] = useState<string | null>(null)
  const [previewExpanded, setPreviewExpanded] = useState(false)
  /** Explicit HTML render — never auto for large / scripted files while Agent is Working. */
  const [htmlLivePreview, setHtmlLivePreview] = useState(false)
  /** Markdown defaults to rendered preview; source toggle for edit. */
  const [mdShowSource, setMdShowSource] = useState(false)
  const [localWidth, setLocalWidth] = useState(() => readChatWorkspacePanelWidth())
  const [resizing, setResizing] = useState(false)
  const [openTabs, setOpenTabs] = useState<ChatWorkspaceTabId[]>(() => {
    const stored = readChatWorkspaceOpenTabs()
    return enablePlanTasks ? stored : (['files'] as ChatWorkspaceTabId[])
  })
  const [activeTab, setActiveTab] = useState<ChatWorkspaceTabId>(() => {
    const stored = readChatWorkspaceActiveTab()
    if (!enablePlanTasks) return 'files'
    return stored
  })
  const [filesView, setFilesView] = useState<ChatWorkspaceFilesView>(() =>
    readChatWorkspaceFilesView('list'),
  )
  const [scheduleOpen, setScheduleOpen] = useState(() =>
    readChatWorkspaceScheduleOpen(scheduleJobs.length > 0),
  )
  const [idleTasksOpen, setIdleTasksOpen] = useState(false)
  const [tabMenuOpen, setTabMenuOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resizeDrag = useRef<{ startX: number; startW: number } | null>(null)
  const widthRef = useRef(localWidth)

  const width = panelWidthProp ?? localWidth
  widthRef.current = width

  useEffect(() => {
    if (!enablePlanTasks) {
      setOpenTabs(['files'])
      setActiveTab('files')
      return
    }
    const stored = readChatWorkspaceOpenTabs()
    setOpenTabs(stored)
    const act = readChatWorkspaceActiveTab()
    setActiveTab(stored.includes(act) ? act : stored[0] || 'files')
  }, [enablePlanTasks])

  useEffect(() => {
    if (!focusTab || !enablePlanTasks) return
    const tab = normalizeChatWorkspaceTabId(focusTab)
    setOpenTabs((prev) => {
      const next = prev.includes(tab) ? prev : [...prev, tab]
      writeChatWorkspaceOpenTabs(next)
      return next
    })
    setActiveTab(tab)
    writeChatWorkspaceActiveTab(tab)
    onFocusTabConsumed?.()
  }, [focusTab, enablePlanTasks, onFocusTabConsumed])

  useEffect(() => {
    if (!previewExpanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewExpanded(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [previewExpanded])

  useEffect(() => {
    if (!resizing) return
    const prev = document.body.style.cursor
    const prevSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    return () => {
      document.body.style.cursor = prev
      document.body.style.userSelect = prevSelect
    }
  }, [resizing])

  const selected = useMemo(
    () => files.find((f) => f.path === selectedPath) || files[0] || null,
    [files, selectedPath],
  )

  const allSelected = files.length > 0 && files.every((f) => checked.has(f.path))
  const checkedFiles = useMemo(
    () => files.filter((f) => checked.has(f.path)),
    [files, checked],
  )

  const writeFile = (path: string, text: string, mime?: string) => {
    const next = upsertWorkspaceFile(workspace, { path, text, mime })
    onChange(next)
    setSelectedPath(normalizeWorkspacePath(path) || path)
  }

  const onUploadText = async (file: File | null) => {
    if (!file) return
    const text = (await file.text()).slice(0, CHAT_WORKSPACE_MAX_TEXT_CHARS)
    const path = `uploads/${file.name.replace(/[^\w.\u3400-\u9fff-]+/g, '_').slice(0, 80) || 'file.txt'}`
    const mime =
      file.type ||
      (/\.(md|markdown|mdx)$/i.test(file.name)
        ? 'text/markdown'
        : /\.html?$/i.test(file.name)
          ? 'text/html'
          : 'text/plain')
    writeFile(path, text, mime)
  }

  const applyWidth = (px: number, persist: boolean) => {
    const next = clampChatWorkspacePanelWidth(
      px,
      typeof window !== 'undefined' ? window.innerWidth : undefined,
    )
    widthRef.current = next
    if (onPanelWidthChange) onPanelWidthChange(next, persist)
    else {
      setLocalWidth(next)
      if (persist) writeChatWorkspacePanelWidth(next)
    }
  }

  const onResizePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (sheet) return
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches) return
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    resizeDrag.current = { startX: e.clientX, startW: width }
    setResizing(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onResizePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = resizeDrag.current
    if (!drag) return
    applyWidth(drag.startW + (drag.startX - e.clientX), false)
  }

  const endResize = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!resizeDrag.current) return
    resizeDrag.current = null
    setResizing(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
    writeChatWorkspacePanelWidth(widthRef.current)
    onPanelWidthChange?.(widthRef.current, true)
  }

  const toggleChecked = (path: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const selectAll = () => {
    if (allSelected) {
      setChecked(new Set())
      return
    }
    setChecked(new Set(files.map((f) => f.path)))
  }

  const downloadHighlighted = () => {
    if (!selected) return
    downloadWorkspaceFile(selected)
  }

  const downloadAll = () => {
    const title = suggestPromotedWorkspaceTitle(workspace)
    downloadWorkspaceZip(files, slugZipName(title))
  }

  const downloadChecked = () => {
    if (!checkedFiles.length) return
    if (checkedFiles.length === 1) {
      downloadWorkspaceFile(checkedFiles[0]!)
      return
    }
    const title = suggestPromotedWorkspaceTitle({
      files: checkedFiles,
      updatedAt: Date.now(),
    })
    downloadWorkspaceZip(checkedFiles, slugZipName(title))
  }

  const createNewFile = () => {
    const suggested = nextUntitledPath(files)
    const raw =
      typeof window !== 'undefined'
        ? window.prompt('New file path', suggested)
        : suggested
    if (raw == null) return
    const path = normalizeWorkspacePath(raw) || suggested
    const mime = /\.(md|markdown|mdx)$/i.test(path)
      ? 'text/markdown'
      : /\.html?$/i.test(path)
        ? 'text/html'
        : 'text/plain'
    writeFile(path, selected?.path === path ? selected.text || '' : '', mime)
  }

  const promote = async () => {
    if (!onPromoteToWorkspaces || !files.length || promoteBusy) return
    const suggested = suggestPromotedWorkspaceTitle(workspace)
    const raw =
      typeof window !== 'undefined'
        ? window.prompt('Name for Workspaces entry', suggested)
        : suggested
    if (raw == null) return
    const title = raw.trim().slice(0, 80) || suggested
    setPromoteBusy(true)
    setPromoteNote(null)
    try {
      const pruned = workspace || { files, updatedAt: Date.now() }
      await onPromoteToWorkspaces({ title, workspace: pruned })
      setPromoteNote(`Saved “${title}” to Workspaces`)
    } catch (err) {
      setPromoteNote(err instanceof Error ? err.message : 'Promote failed')
    } finally {
      setPromoteBusy(false)
    }
  }

  const selectTab = (tab: ChatWorkspaceTabId) => {
    setActiveTab(tab)
    writeChatWorkspaceActiveTab(tab)
  }

  const dismissTab = (tab: ChatWorkspaceTabId) => {
    if (!enablePlanTasks) return
    setOpenTabs((prev) => {
      if (prev.length <= 1) return prev
      const next = prev.filter((t) => t !== tab)
      writeChatWorkspaceOpenTabs(next)
      if (activeTab === tab) {
        const fallback = next[0] || 'files'
        setActiveTab(fallback)
        writeChatWorkspaceActiveTab(fallback)
      }
      return next
    })
    setTabMenuOpen(false)
  }

  const restoreTab = (tab: ChatWorkspaceTabId) => {
    setOpenTabs((prev) => {
      if (prev.includes(tab)) return prev
      const next = [...prev, tab]
      writeChatWorkspaceOpenTabs(next)
      return next
    })
    selectTab(tab)
    setTabMenuOpen(false)
  }

  const setView = (view: ChatWorkspaceFilesView) => {
    setFilesView(view)
    writeChatWorkspaceFilesView(view)
  }

  const toggleSchedule = () => {
    setScheduleOpen((v) => {
      const next = !v
      writeChatWorkspaceScheduleOpen(next)
      return next
    })
  }

  const overseer = projectAgents.find((a) => a.role === 'overseer')
  const workers = projectAgents.filter((a) => a.role === 'worker')
  const dismissedTabs = CHAT_WORKSPACE_TAB_IDS.filter(
    (t) => enablePlanTasks && !openTabs.includes(t),
  )

  const panelStyle =
    sheet || (typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches)
      ? undefined
      : ({ ['--ds-workspace-w' as string]: `${width}px` } as CSSProperties)

  const previewKind = selected ? previewMime(selected) : 'text'
  const isHtmlPreview = Boolean(selected && previewKind === 'html' && selected.text)
  const isMarkdownPreview = Boolean(selected && previewKind === 'markdown')
  const selectedHtml = isHtmlPreview ? selected!.text || '' : ''
  const htmlOptIn = isHtmlPreview && htmlNeedsOptInPreview(selectedHtml)
  // While Agent is Working, keep source text — iframe srcDoc of 28KB three.js freezes the tab.
  const showHtmlIframe =
    isHtmlPreview &&
    !agentBusy &&
    (!htmlOptIn || htmlLivePreview)
  const showMarkdownRendered = isMarkdownPreview && !mdShowSource
  const visibleTab = openTabs.includes(activeTab) ? activeTab : openTabs[0] || 'files'

  // Reset opt-in / md source when switching files or when a new Agent turn starts.
  useEffect(() => {
    setHtmlLivePreview(false)
    setPreviewExpanded(false)
    setMdShowSource(false)
  }, [selected?.path, agentBusy])

  return (
    <aside
      className={`ds-chat-workspace${sheet ? ' is-sheet' : ''}${resizing ? ' is-resizing' : ''}${previewExpanded ? ' is-preview-expanded' : ''}${consentHighlight ? ' is-ws-consent-shake' : ''}`}
      style={panelStyle}
      aria-label="Harness workspace"
    >
      {!sheet ? (
        <div
          className="ds-chat-workspace-resize"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize workspace"
          aria-valuenow={width}
          aria-valuemin={CHAT_WORKSPACE_PANEL_WIDTH_MIN}
          aria-valuemax={CHAT_WORKSPACE_PANEL_WIDTH_MAX}
          title="Drag to resize · double-click to reset"
          tabIndex={0}
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={endResize}
          onPointerCancel={endResize}
          onDoubleClick={() => applyWidth(CHAT_WORKSPACE_PANEL_WIDTH_DEFAULT, true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault()
              applyWidth(width + 16, true)
            } else if (e.key === 'ArrowRight') {
              e.preventDefault()
              applyWidth(width - 16, true)
            } else if (e.key === 'Home') {
              e.preventDefault()
              applyWidth(CHAT_WORKSPACE_PANEL_WIDTH_MAX, true)
            } else if (e.key === 'End') {
              e.preventDefault()
              applyWidth(CHAT_WORKSPACE_PANEL_WIDTH_MIN, true)
            }
          }}
        />
      ) : null}

      <header className="ds-chat-workspace-head">
        <div className="ds-chat-workspace-head-main">
          <div className="ds-chat-workspace-kicker">Workspace</div>
          <div className="ds-chat-workspace-tabs" role="tablist" aria-label="Workspace tabs">
            {openTabs.map((tab) => (
              <div
                key={tab}
                className={`ds-chat-workspace-tab${visibleTab === tab ? ' is-on' : ''}`}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={visibleTab === tab}
                  className="ds-chat-workspace-tab-btn"
                  onClick={() => selectTab(tab)}
                >
                  {TAB_LABEL[tab]}
                </button>
                {enablePlanTasks && openTabs.length > 1 ? (
                  <button
                    type="button"
                    className="ds-chat-workspace-tab-close"
                    aria-label={`Close ${TAB_LABEL[tab]} tab`}
                    title={`Close ${TAB_LABEL[tab]}`}
                    onClick={() => dismissTab(tab)}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            ))}
            {enablePlanTasks && dismissedTabs.length ? (
              <div className="ds-chat-workspace-tab-add">
                <button
                  type="button"
                  className="ds-chat-icon-btn"
                  aria-label="Reopen workspace tab"
                  title="Reopen tab"
                  aria-expanded={tabMenuOpen}
                  onClick={() => setTabMenuOpen((v) => !v)}
                >
                  +
                </button>
                {tabMenuOpen ? (
                  <ul className="ds-chat-workspace-tab-menu" role="menu">
                    {dismissedTabs.map((tab) => (
                      <li key={tab}>
                        <button type="button" role="menuitem" onClick={() => restoreTab(tab)}>
                          {TAB_LABEL[tab]}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <button type="button" className="ds-chat-icon-btn" aria-label="Close workspace" onClick={onClose}>
          ×
        </button>
      </header>

      <div className="ds-chat-workspace-body">
        {visibleTab === 'files' ? (
          <>
            <div className="ds-chat-workspace-tree">
              <div className="ds-chat-workspace-toolbar">
                <IconBtn label="Upload" onClick={() => fileInputRef.current?.click()}>
                  <IcUpload />
                </IconBtn>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="text/*,.md,.json,.csv,.html,.svg,.ts,.tsx,.js,.py"
                  hidden
                  onChange={(e) => {
                    void onUploadText(e.target.files?.[0] || null)
                    e.target.value = ''
                  }}
                />
                <IconBtn label="New file" onClick={createNewFile}>
                  <IcNew />
                </IconBtn>
                <IconBtn
                  label={allSelected ? 'Clear selection' : 'Select all'}
                  disabled={!files.length}
                  onClick={selectAll}
                >
                  <IcSelect />
                </IconBtn>
                <IconBtn
                  label="Download all as zip"
                  disabled={!files.length}
                  onClick={downloadAll}
                >
                  <IcZip />
                </IconBtn>
                <IconBtn
                  label="Download checked"
                  disabled={!checkedFiles.length}
                  onClick={downloadChecked}
                >
                  <IcDl />
                </IconBtn>
                <IconBtn
                  label="Download highlighted file"
                  disabled={!selected}
                  onClick={downloadHighlighted}
                >
                  <IcDl />
                </IconBtn>
                {onPromoteToWorkspaces ? (
                  <IconBtn
                    label={promoteBusy ? 'Saving…' : 'Save to Workspaces'}
                    disabled={!files.length || promoteBusy}
                    accent
                    onClick={() => {
                      void promote()
                    }}
                  >
                    <IcSave />
                  </IconBtn>
                ) : null}
                <span className="ds-chat-workspace-toolbar-sep" aria-hidden />
                <IconBtn
                  label="Classic list view"
                  pressed={filesView === 'list'}
                  onClick={() => setView('list')}
                >
                  <IcList />
                </IconBtn>
                <IconBtn
                  label="Riced desktop view"
                  pressed={filesView === 'riced'}
                  onClick={() => setView('riced')}
                >
                  <IcDesk />
                </IconBtn>
              </div>
              {promoteNote ? <p className="ds-chat-workspace-hint">{promoteNote}</p> : null}
              <div className="ds-chat-workspace-path is-readonly" aria-label="Selected file path">
                {selected?.path || 'No file selected'}
              </div>
              {files.length ? (
                filesView === 'riced' ? (
                  <ul className="ds-chat-workspace-files is-riced">
                    {files.map((f) => (
                      <li key={f.id} className="ds-chat-workspace-riced-item">
                        <label className="ds-chat-workspace-check">
                          <input
                            type="checkbox"
                            checked={checked.has(f.path)}
                            onChange={() => toggleChecked(f.path)}
                            aria-label={`Select ${f.path}`}
                          />
                        </label>
                        <button
                          type="button"
                          className={`ds-chat-workspace-riced-file${selected?.path === f.path ? ' is-on' : ''}`}
                          onClick={() => setSelectedPath(f.path)}
                          title={f.path}
                        >
                          <span className="ds-chat-workspace-riced-icon" data-ext={fileExt(f.path) || 'file'}>
                            {ricedIconLabel(f.path)}
                          </span>
                          <span className="ds-chat-workspace-riced-name">
                            {f.path.split('/').pop() || f.path}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="ds-chat-workspace-files">
                    {files.map((f) => (
                      <li key={f.id} className="ds-chat-workspace-file-row">
                        <label className="ds-chat-workspace-check">
                          <input
                            type="checkbox"
                            checked={checked.has(f.path)}
                            onChange={() => toggleChecked(f.path)}
                            aria-label={`Select ${f.path}`}
                          />
                        </label>
                        <button
                          type="button"
                          className={`ds-chat-workspace-file${selected?.path === f.path ? ' is-on' : ''}`}
                          onClick={() => setSelectedPath(f.path)}
                        >
                          {f.path}
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                <p className="ds-chat-workspace-empty">
                  Empty workspace. Upload a note or ask the model to write a file.
                </p>
              )}
            </div>

            <div className="ds-chat-workspace-preview">
              {selected ? (
                <>
                  <div className="ds-chat-workspace-preview-meta-row">
                    <div className="ds-chat-workspace-preview-meta">{selected.path}</div>
                    <div className="ds-chat-workspace-preview-actions">
                      {isMarkdownPreview ? (
                        <button
                          type="button"
                          className="ds-chat-workspace-btn"
                          onClick={() => setMdShowSource((v) => !v)}
                        >
                          {mdShowSource ? 'Show preview' : 'Edit source'}
                        </button>
                      ) : null}
                      {showHtmlIframe && htmlOptIn ? (
                        <button
                          type="button"
                          className="ds-chat-workspace-btn"
                          onClick={() => {
                            setHtmlLivePreview(false)
                            setPreviewExpanded(false)
                          }}
                        >
                          Show source
                        </button>
                      ) : null}
                      {showHtmlIframe ? (
                        <IconBtn
                          label={previewExpanded ? 'Exit fullscreen' : 'Expand preview'}
                          pressed={previewExpanded}
                          onClick={() => setPreviewExpanded((v) => !v)}
                        >
                          <IcExpand />
                        </IconBtn>
                      ) : null}
                      <IconBtn label="Download" onClick={downloadHighlighted}>
                        <IcDl />
                      </IconBtn>
                    </div>
                  </div>
                  {showHtmlIframe ? (
                    <iframe
                      className="ds-chat-workspace-frame"
                      title={selected.path}
                      sandbox=""
                      // Stable key so parent re-renders do not remount/reload srcDoc.
                      key={`html-frame:${selected.path}:${selectedHtml.length}`}
                      srcDoc={selectedHtml}
                    />
                  ) : showMarkdownRendered ? (
                    <div
                      className="ds-chat-workspace-md"
                      aria-label={`Markdown preview for ${selected.path}`}
                    >
                      {(selected.text || '').trim()
                        ? renderChatMarkdown(selected.text || '')
                        : (
                          <p className="ds-chat-workspace-empty">Empty markdown file.</p>
                        )}
                    </div>
                  ) : (
                    <>
                      {isHtmlPreview && (htmlOptIn || agentBusy) ? (
                        <p className="ds-chat-workspace-hint">
                          {agentBusy
                            ? 'Source view while Agent is Working — render HTML when idle to avoid freezing.'
                            : 'Large or scripted HTML stays as source until you render preview. '}
                          {!agentBusy ? (
                            <button
                              type="button"
                              className="ds-chat-workspace-btn"
                              onClick={() => setHtmlLivePreview(true)}
                            >
                              Render HTML preview
                            </button>
                          ) : null}
                        </p>
                      ) : null}
                      <textarea
                        className="ds-chat-workspace-editor"
                        value={
                          // Cap paint while busy so 28KB+ HTML does not lock the editor.
                          agentBusy && (selected.text?.length || 0) > HTML_EDITOR_PAINT_CHARS
                            ? `${(selected.text || '').slice(0, HTML_EDITOR_PAINT_CHARS)}\n\n… (${(selected.text || '').length - HTML_EDITOR_PAINT_CHARS} more chars — full text after Agent finishes)`
                            : selected.text || ''
                        }
                        spellCheck={false}
                        readOnly={Boolean(
                          agentBusy && (selected.text?.length || 0) > HTML_EDITOR_PAINT_CHARS,
                        )}
                        onChange={(e) => writeFile(selected.path, e.target.value, selected.mime)}
                        aria-label={`Edit ${selected.path}`}
                        aria-busy={agentBusy || undefined}
                      />
                    </>
                  )}
                </>
              ) : (
                <p className="ds-chat-workspace-empty">Select a file to preview.</p>
              )}
            </div>

            {previewExpanded && showHtmlIframe ? (
              <div className="ds-chat-workspace-preview-overlay" role="dialog" aria-label="HTML preview">
                <div className="ds-chat-workspace-preview-overlay-bar">
                  <span>{selected!.path}</span>
                  <button
                    type="button"
                    className="ds-chat-workspace-btn"
                    onClick={() => setPreviewExpanded(false)}
                  >
                    Close
                  </button>
                </div>
                <iframe
                  className="ds-chat-workspace-frame is-fullscreen"
                  title={`${selected!.path} fullscreen`}
                  sandbox=""
                  key={`html-frame-full:${selected!.path}:${selectedHtml.length}`}
                  srcDoc={selectedHtml}
                />
              </div>
            ) : null}

            <div className={`ds-chat-workspace-schedule${scheduleOpen ? ' is-open' : ''}`}>
              <button
                type="button"
                className="ds-chat-workspace-schedule-toggle"
                aria-expanded={scheduleOpen}
                onClick={toggleSchedule}
              >
                <span className="ds-chat-workspace-kicker">Scheduled</span>
                <span className="ds-chat-workspace-schedule-chevron" aria-hidden>
                  {scheduleOpen ? '▾' : '▸'}
                </span>
              </button>
              {scheduleOpen ? (
                <>
                  <p className="ds-chat-workspace-hint">Runs in this tab while Harness chat is open.</p>
                  <div className="ds-chat-workspace-schedule-form">
                    <input
                      className="ds-chat-workspace-schedule-input"
                      value={scheduleDraft}
                      onChange={(e) => setScheduleDraft(e.target.value)}
                      placeholder="every Friday summarize notes"
                      aria-label="Scheduled prompt"
                    />
                    <select
                      className="ds-chat-workspace-select"
                      value={scheduleCadence}
                      onChange={(e) =>
                        setScheduleCadence(e.target.value as ChatScheduleJob['cadence'])
                      }
                      aria-label="Cadence"
                    >
                      <option value="once">Once</option>
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                    <button
                      type="button"
                      className="ds-chat-workspace-btn"
                      disabled={!scheduleDraft.trim() || !onAddSchedule}
                      onClick={() => {
                        onAddSchedule?.(scheduleDraft.trim(), scheduleCadence)
                        setScheduleDraft('')
                      }}
                    >
                      Add
                    </button>
                  </div>
                  {scheduleJobs.length ? (
                    <ul className="ds-chat-workspace-jobs">
                      {scheduleJobs.map((j) => (
                        <li key={j.id} className="ds-chat-workspace-job">
                          <label className="ds-chat-workspace-job-label">
                            <input
                              type="checkbox"
                              checked={j.enabled}
                              onChange={(e) => onToggleSchedule?.(j.id, e.target.checked)}
                            />
                            <span>
                              <strong>{j.label || j.prompt.slice(0, 42)}</strong>
                              <small>
                                {j.cadence} · next {new Date(j.nextAt).toLocaleString()}
                              </small>
                            </span>
                          </label>
                          <button
                            type="button"
                            className="ds-chat-workspace-btn is-danger"
                            aria-label="Remove schedule"
                            onClick={() => onRemoveSchedule?.(j.id)}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="ds-chat-workspace-empty">No scheduled prompts yet.</p>
                  )}
                </>
              ) : null}
            </div>
          </>
        ) : null}

        {visibleTab === 'plan' && enablePlanTasks ? (
          <div className="ds-chat-workspace-plan" aria-label="Plan artifact">
            <div className="ds-chat-workspace-plan-head">
              <span>Plan</span>
              <span className="ds-chat-workspace-hint">Edit before Build · optional Save</span>
              {planSaveNote ? (
                <span className="ds-chat-workspace-plan-saved" role="status">
                  {planSaveNote}
                </span>
              ) : null}
            </div>
            <textarea
              className="ds-chat-workspace-plan-editor"
              value={planDraft}
              rows={14}
              disabled={planBusy}
              placeholder="Plan markdown appears here after a Plan reply — edit freely, then Build."
              onChange={(e) => {
                onPlanDraftChange?.(e.target.value)
                setPlanSaveNote(null)
              }}
            />
            <div className="ds-chat-workspace-plan-actions">
              <button
                type="button"
                className="ds-chat-workspace-btn"
                disabled={planBusy || !planDraft.trim() || !onSavePlan}
                onClick={() => {
                  const res = onSavePlan?.()
                  if (!res) return
                  if (res.ok) setPlanSaveNote(`Saved · ${res.path || 'plans/latest.md'}`)
                  else setPlanSaveNote(res.error || 'Save failed')
                }}
              >
                Save
              </button>
              <button
                type="button"
                className="ds-chat-workspace-btn is-accent"
                disabled={planBusy || !planDraft.trim() || !onBuildPlan}
                onClick={() => {
                  void onBuildPlan?.()
                }}
              >
                Build
              </button>
            </div>
            {!planDraft.trim() ? (
              <p className="ds-chat-workspace-empty">
                Switch to Plan mode in the composer, or wait for a fenced plan reply.
              </p>
            ) : null}
          </div>
        ) : null}

        {visibleTab === 'tasks' && enablePlanTasks ? (
          <div className="ds-chat-workspace-tasks" aria-label="Project tasks">
            {projectTitle ? (
              <div className="ds-chat-workspace-tasks-project">{projectTitle}</div>
            ) : null}
            {!projectAgents.length ? (
              <p className="ds-chat-workspace-empty">
                No Project on this chat. Open a Project from Inbox, or Add to Project — Overseer and
                workers then appear here with Working / Needs you / Done.
              </p>
            ) : (
              <>
                {overseer ? (
                  <div className="ds-chat-workspace-tasks-overseer">
                    <button
                      type="button"
                      className="ds-chat-workspace-task-row is-overseer"
                      onClick={() => onOpenAgent?.(overseer)}
                    >
                      <span className="ds-chat-workspace-task-title">{overseer.title}</span>
                      <span className="ds-chat-workspace-task-meta">Overseer</span>
                      <span className={`ds-chat-workspace-task-status is-${overseer.status}`}>
                        {statusChipLabel(overseer.status)}
                      </span>
                    </button>
                  </div>
                ) : null}
                {TASK_SECTIONS.map((section) => {
                  const rows = workers.filter((a) => section.match(a.status))
                  if (!rows.length && section.id !== 'idle') return null
                  if (section.id === 'idle' && !rows.length) return null
                  const collapsed = section.id === 'idle' && !idleTasksOpen
                  return (
                    <div key={section.id} className="ds-chat-workspace-task-section">
                      <button
                        type="button"
                        className="ds-chat-workspace-task-section-head"
                        aria-expanded={section.id === 'idle' ? idleTasksOpen : true}
                        onClick={() => {
                          if (section.id === 'idle') setIdleTasksOpen((v) => !v)
                        }}
                      >
                        <span>
                          {section.title} ({rows.length})
                        </span>
                        {section.id === 'idle' ? (
                          <span aria-hidden>{idleTasksOpen ? '▾' : '▸'}</span>
                        ) : null}
                      </button>
                      {!collapsed
                        ? rows.map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              className="ds-chat-workspace-task-row"
                              onClick={() => onOpenAgent?.(a)}
                              title={a.compactSummary || a.title}
                            >
                              <span className="ds-chat-workspace-task-title">{a.title}</span>
                              {a.compactSummary ? (
                                <span className="ds-chat-workspace-task-summary">
                                  {a.compactSummary.slice(0, 72)}
                                  {a.compactSummary.length > 72 ? '…' : ''}
                                </span>
                              ) : null}
                              <span className={`ds-chat-workspace-task-status is-${a.status}`}>
                                {statusChipLabel(a.status)}
                              </span>
                            </button>
                          ))
                        : null}
                    </div>
                  )
                })}
                {!workers.length ? (
                  <p className="ds-chat-workspace-empty">
                    Overseer has not spawned workers yet — describe the work in the Overseer chat.
                  </p>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>
    </aside>
  )
}
