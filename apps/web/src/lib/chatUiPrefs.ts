/**
 * Shared `#/chat` composer prefs (mode / DeepThink / Search / Rich layout / Plugins).
 * Used by classic ChatPage and AUI ChatAuiRuntime.
 */

/** Cursor-like Agent / Ask / Plan — capabilities (DeepThink/Search) stay under modes. */
export type ChatComposerMode = 'agent' | 'ask' | 'plan'

export const CHAT_MODE_KEY = 'yue-deepseek-chat-mode-v1'
/** Cursor-like Auto profile — server picks DeepThink / Search per turn. Default on. */
export const CHAT_AUTO_KEY = 'yue-deepseek-chat-auto-v1'
export const CHAT_THINK_KEY = 'yue-deepseek-chat-deepthink-v1'
export const CHAT_SEARCH_KEY = 'yue-deepseek-chat-search-v1'
export const CHAT_RICH_LAYOUT_KEY = 'yue-deepseek-chat-rich-layout-v1'
export const CHAT_PLUGINS_KEY = 'yue-deepseek-chat-plugins-v1'
/** Composer Tools row expand/collapse (DeepThink / Search / Harness / …). */
export const CHAT_TOOLS_EXPANDED_KEY = 'yue-deepseek-chat-tools-expanded-v1'
/** Desktop Inbox sidebar width (px). Mobile drawer ignores drag; still caps via 86vw. */
export const CHAT_INBOX_SIDEBAR_WIDTH_KEY = 'yue-chat-inbox-sidebar-w-v1'
/** Matches ChatPage.css `--ds-sidebar-w: 17.5rem` at 16px root. */
export const CHAT_INBOX_SIDEBAR_WIDTH_DEFAULT = 280
export const CHAT_INBOX_SIDEBAR_WIDTH_MIN = 220
export const CHAT_INBOX_SIDEBAR_WIDTH_MAX = 480

/** Desktop Harness Workspace (Thread files) panel width (px). Sheets ignore drag. */
export const CHAT_WORKSPACE_PANEL_WIDTH_KEY = 'yue-chat-workspace-panel-w-v1'
/** Wider default so HTML previews are usable (was fixed ~26rem / 416px). */
export const CHAT_WORKSPACE_PANEL_WIDTH_DEFAULT = 440
export const CHAT_WORKSPACE_PANEL_WIDTH_MIN = 300
export const CHAT_WORKSPACE_PANEL_WIDTH_MAX = 760
/** Inbox settings → Companion block expand/collapse. */
export const CHAT_INBOX_COMPANION_OPEN_KEY = 'yue-chat-inbox-companion-open-v1'

export const CHAT_COMPOSER_MODES: readonly ChatComposerMode[] = ['agent', 'ask', 'plan'] as const

export const CHAT_COMPOSER_MODE_LABEL: Record<ChatComposerMode, string> = {
  agent: 'Agent',
  ask: 'Ask',
  plan: 'Plan',
}

export function normalizeChatComposerMode(raw: unknown): ChatComposerMode {
  const v = String(raw || '')
    .trim()
    .toLowerCase()
  if (v === 'ask' || v === 'plan' || v === 'agent') return v
  return 'agent'
}

export function readChatComposerMode(fallback: ChatComposerMode = 'agent'): ChatComposerMode {
  try {
    return normalizeChatComposerMode(localStorage.getItem(CHAT_MODE_KEY) || fallback)
  } catch {
    return fallback
  }
}

export function writeChatComposerMode(mode: ChatComposerMode) {
  try {
    localStorage.setItem(CHAT_MODE_KEY, normalizeChatComposerMode(mode))
  } catch {
    /* ignore */
  }
}

/** Shift+Tab cycle: Agent → Ask → Plan → Agent. */
export function cycleChatComposerMode(mode: ChatComposerMode): ChatComposerMode {
  const cur = normalizeChatComposerMode(mode)
  const i = CHAT_COMPOSER_MODES.indexOf(cur)
  const next = CHAT_COMPOSER_MODES[(i < 0 ? 0 : i + 1) % CHAT_COMPOSER_MODES.length]
  return next || 'agent'
}

/** Default: collapsed on narrow viewports, expanded on desktop — until user toggles. */
export function readChatToolsExpanded(fallbackNarrow = false, fallbackWide = true): boolean {
  try {
    const v = localStorage.getItem(CHAT_TOOLS_EXPANDED_KEY)
    if (v === '0') return false
    if (v === '1') return true
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches) {
    return fallbackNarrow
  }
  return fallbackWide
}

export function writeChatToolsExpanded(on: boolean) {
  try {
    localStorage.setItem(CHAT_TOOLS_EXPANDED_KEY, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

/** Bound live DeepThink buffer mid-stream (full prune still runs on disk write). */
export const CHAT_LIVE_REASONING_KEEP = 24_000

export const CHAT_EMPTY_SUGGESTIONS = [
  'Explain quantum computing simply',
  'Draft a polite follow-up email',
  'Give me a 3-day city trip outline',
  'Help me debug this error message',
] as const

export function readChatFlag(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key)
    if (v === '0') return false
    if (v === '1') return true
  } catch {
    /* ignore */
  }
  return fallback
}

export function writeChatFlag(key: string, on: boolean) {
  try {
    localStorage.setItem(key, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function readChatPluginIds(): string[] | null {
  try {
    const raw = localStorage.getItem(CHAT_PLUGINS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    return parsed.map(String).filter(Boolean).slice(0, 16)
  } catch {
    return null
  }
}

export function writeChatPluginIds(ids: string[]) {
  try {
    localStorage.setItem(CHAT_PLUGINS_KEY, JSON.stringify(ids.slice(0, 16)))
  } catch {
    /* ignore */
  }
}

/** Clamp Inbox sidebar width; optional viewport keeps the thread usable. */
export function clampChatInboxSidebarWidth(px: number, viewportWidth?: number): number {
  const n = Math.round(Number(px))
  if (!Number.isFinite(n)) return CHAT_INBOX_SIDEBAR_WIDTH_DEFAULT
  let max = CHAT_INBOX_SIDEBAR_WIDTH_MAX
  if (typeof viewportWidth === 'number' && Number.isFinite(viewportWidth) && viewportWidth > 0) {
    // Leave ≥55% for the thread; never below min even on short viewports.
    max = Math.min(max, Math.max(CHAT_INBOX_SIDEBAR_WIDTH_MIN, Math.floor(viewportWidth * 0.45)))
  }
  return Math.min(max, Math.max(CHAT_INBOX_SIDEBAR_WIDTH_MIN, n))
}

export function readChatInboxSidebarWidth(
  fallback = CHAT_INBOX_SIDEBAR_WIDTH_DEFAULT,
): number {
  try {
    const raw = localStorage.getItem(CHAT_INBOX_SIDEBAR_WIDTH_KEY)
    if (raw == null || raw === '') return fallback
    return clampChatInboxSidebarWidth(Number(raw))
  } catch {
    return fallback
  }
}

export function writeChatInboxSidebarWidth(px: number) {
  try {
    localStorage.setItem(
      CHAT_INBOX_SIDEBAR_WIDTH_KEY,
      String(clampChatInboxSidebarWidth(px)),
    )
  } catch {
    /* ignore */
  }
}

/** Clamp Workspace panel width; leave room for the thread column. */
export function clampChatWorkspacePanelWidth(px: number, viewportWidth?: number): number {
  const n = Math.round(Number(px))
  if (!Number.isFinite(n)) return CHAT_WORKSPACE_PANEL_WIDTH_DEFAULT
  let max = CHAT_WORKSPACE_PANEL_WIDTH_MAX
  if (typeof viewportWidth === 'number' && Number.isFinite(viewportWidth) && viewportWidth > 0) {
    // Leave ≥40% for the thread; never below min even on short viewports.
    max = Math.min(max, Math.max(CHAT_WORKSPACE_PANEL_WIDTH_MIN, Math.floor(viewportWidth * 0.6)))
  }
  return Math.min(max, Math.max(CHAT_WORKSPACE_PANEL_WIDTH_MIN, n))
}

export function readChatWorkspacePanelWidth(
  fallback = CHAT_WORKSPACE_PANEL_WIDTH_DEFAULT,
): number {
  try {
    const raw = localStorage.getItem(CHAT_WORKSPACE_PANEL_WIDTH_KEY)
    if (raw == null || raw === '') return fallback
    return clampChatWorkspacePanelWidth(Number(raw))
  } catch {
    return fallback
  }
}

export function writeChatWorkspacePanelWidth(px: number) {
  try {
    localStorage.setItem(
      CHAT_WORKSPACE_PANEL_WIDTH_KEY,
      String(clampChatWorkspacePanelWidth(px)),
    )
  } catch {
    /* ignore */
  }
}

/** Right-rail Workspace tabs: Files / Plan / Tasks. */
export type ChatWorkspaceTabId = 'files' | 'plan' | 'tasks'

export const CHAT_WORKSPACE_TAB_IDS: readonly ChatWorkspaceTabId[] = [
  'files',
  'plan',
  'tasks',
] as const

export const CHAT_WORKSPACE_TABS_KEY = 'yue-chat-workspace-tabs-v1'
export const CHAT_WORKSPACE_ACTIVE_TAB_KEY = 'yue-chat-workspace-active-tab-v1'
export const CHAT_WORKSPACE_FILES_VIEW_KEY = 'yue-chat-workspace-files-view-v1'
export const CHAT_WORKSPACE_SCHEDULE_OPEN_KEY = 'yue-chat-workspace-schedule-open-v1'

export type ChatWorkspaceFilesView = 'list' | 'riced'

export function normalizeChatWorkspaceTabId(raw: unknown): ChatWorkspaceTabId {
  const v = String(raw || '')
    .trim()
    .toLowerCase()
  if (v === 'plan' || v === 'tasks' || v === 'files') return v
  return 'files'
}

export function normalizeChatWorkspaceFilesView(raw: unknown): ChatWorkspaceFilesView {
  return String(raw || '')
    .trim()
    .toLowerCase() === 'riced'
    ? 'riced'
    : 'list'
}

export function readChatWorkspaceOpenTabs(
  fallback: ChatWorkspaceTabId[] = ['files', 'plan', 'tasks'],
): ChatWorkspaceTabId[] {
  try {
    const raw = localStorage.getItem(CHAT_WORKSPACE_TABS_KEY)
    if (!raw) return [...fallback]
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return [...fallback]
    const next = parsed
      .map((t) => normalizeChatWorkspaceTabId(t))
      .filter((t, i, arr) => arr.indexOf(t) === i)
    return next.length ? next : [...fallback]
  } catch {
    return [...fallback]
  }
}

export function writeChatWorkspaceOpenTabs(tabs: ChatWorkspaceTabId[]) {
  const next = tabs
    .map((t) => normalizeChatWorkspaceTabId(t))
    .filter((t, i, arr) => arr.indexOf(t) === i)
  const saved = next.length ? next : (['files'] as ChatWorkspaceTabId[])
  try {
    localStorage.setItem(CHAT_WORKSPACE_TABS_KEY, JSON.stringify(saved))
  } catch {
    /* ignore */
  }
}

export function readChatWorkspaceActiveTab(
  fallback: ChatWorkspaceTabId = 'files',
): ChatWorkspaceTabId {
  try {
    return normalizeChatWorkspaceTabId(
      localStorage.getItem(CHAT_WORKSPACE_ACTIVE_TAB_KEY) || fallback,
    )
  } catch {
    return fallback
  }
}

export function writeChatWorkspaceActiveTab(tab: ChatWorkspaceTabId) {
  try {
    localStorage.setItem(CHAT_WORKSPACE_ACTIVE_TAB_KEY, normalizeChatWorkspaceTabId(tab))
  } catch {
    /* ignore */
  }
}

export function readChatWorkspaceFilesView(
  fallback: ChatWorkspaceFilesView = 'list',
): ChatWorkspaceFilesView {
  try {
    const raw = localStorage.getItem(CHAT_WORKSPACE_FILES_VIEW_KEY)
    if (raw == null || raw === '') return fallback
    return normalizeChatWorkspaceFilesView(raw)
  } catch {
    return fallback
  }
}

export function writeChatWorkspaceFilesView(view: ChatWorkspaceFilesView) {
  try {
    localStorage.setItem(CHAT_WORKSPACE_FILES_VIEW_KEY, normalizeChatWorkspaceFilesView(view))
  } catch {
    /* ignore */
  }
}

export function readChatWorkspaceScheduleOpen(fallback = false): boolean {
  return readChatFlag(CHAT_WORKSPACE_SCHEDULE_OPEN_KEY, fallback)
}

export function writeChatWorkspaceScheduleOpen(on: boolean) {
  writeChatFlag(CHAT_WORKSPACE_SCHEDULE_OPEN_KEY, on)
}
