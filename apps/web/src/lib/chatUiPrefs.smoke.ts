import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CHAT_EMPTY_SUGGESTIONS,
  CHAT_INBOX_COMPANION_OPEN_KEY,
  CHAT_INBOX_SIDEBAR_WIDTH_DEFAULT,
  CHAT_INBOX_SIDEBAR_WIDTH_KEY,
  CHAT_INBOX_SIDEBAR_WIDTH_MAX,
  CHAT_INBOX_SIDEBAR_WIDTH_MIN,
  CHAT_LIVE_REASONING_KEEP,
  CHAT_MODE_KEY,
  CHAT_SEARCH_KEY,
  CHAT_THINK_KEY,
  CHAT_WORKSPACE_ACTIVE_TAB_KEY,
  CHAT_WORKSPACE_FILES_VIEW_KEY,
  CHAT_WORKSPACE_PANEL_WIDTH_DEFAULT,
  CHAT_WORKSPACE_PANEL_WIDTH_KEY,
  CHAT_WORKSPACE_PANEL_WIDTH_MAX,
  CHAT_WORKSPACE_PANEL_WIDTH_MIN,
  CHAT_WORKSPACE_SCHEDULE_OPEN_KEY,
  CHAT_WORKSPACE_TABS_KEY,
  clampChatInboxSidebarWidth,
  clampChatWorkspacePanelWidth,
  cycleChatComposerMode,
  readChatComposerMode,
  readChatFlag,
  readChatInboxSidebarWidth,
  readChatWorkspaceActiveTab,
  readChatWorkspaceFilesView,
  readChatWorkspaceOpenTabs,
  readChatWorkspacePanelWidth,
  readChatWorkspaceScheduleOpen,
  writeChatComposerMode,
  writeChatFlag,
  writeChatInboxSidebarWidth,
  writeChatWorkspaceActiveTab,
  writeChatWorkspaceFilesView,
  writeChatWorkspaceOpenTabs,
  writeChatWorkspacePanelWidth,
  writeChatWorkspaceScheduleOpen,
} from './chatUiPrefs.js'

assert.equal(CHAT_THINK_KEY, 'yue-deepseek-chat-deepthink-v1')
assert.equal(CHAT_SEARCH_KEY, 'yue-deepseek-chat-search-v1')
assert.equal(CHAT_MODE_KEY, 'yue-deepseek-chat-mode-v1')
assert.equal(CHAT_INBOX_SIDEBAR_WIDTH_KEY, 'yue-chat-inbox-sidebar-w-v1')
assert.equal(CHAT_INBOX_COMPANION_OPEN_KEY, 'yue-chat-inbox-companion-open-v1')
assert.equal(CHAT_INBOX_SIDEBAR_WIDTH_DEFAULT, 280)
assert.ok(CHAT_INBOX_SIDEBAR_WIDTH_MIN < CHAT_INBOX_SIDEBAR_WIDTH_DEFAULT)
assert.ok(CHAT_INBOX_SIDEBAR_WIDTH_MAX > CHAT_INBOX_SIDEBAR_WIDTH_DEFAULT)
assert.ok(CHAT_LIVE_REASONING_KEEP >= 12_000)
assert.ok(CHAT_EMPTY_SUGGESTIONS.length >= 3)

const mem = new Map<string, string>()
;(globalThis as { localStorage?: Storage }).localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k, v) => {
    mem.set(k, String(v))
  },
  removeItem: (k) => {
    mem.delete(k)
  },
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
}

writeChatFlag(CHAT_THINK_KEY, false)
assert.equal(readChatFlag(CHAT_THINK_KEY, true), false)
writeChatFlag(CHAT_THINK_KEY, true)
assert.equal(readChatFlag(CHAT_THINK_KEY, false), true)
writeChatFlag(CHAT_INBOX_COMPANION_OPEN_KEY, false)
assert.equal(readChatFlag(CHAT_INBOX_COMPANION_OPEN_KEY, true), false)
writeChatFlag(CHAT_INBOX_COMPANION_OPEN_KEY, true)
assert.equal(readChatFlag(CHAT_INBOX_COMPANION_OPEN_KEY, false), true)
writeChatComposerMode('ask')
assert.equal(readChatComposerMode(), 'ask')
writeChatComposerMode('agent')
assert.equal(readChatComposerMode('plan'), 'agent')
assert.equal(cycleChatComposerMode('agent'), 'ask')
assert.equal(cycleChatComposerMode('ask'), 'plan')
assert.equal(cycleChatComposerMode('plan'), 'agent')

assert.equal(clampChatInboxSidebarWidth(100), CHAT_INBOX_SIDEBAR_WIDTH_MIN)
assert.equal(clampChatInboxSidebarWidth(9999), CHAT_INBOX_SIDEBAR_WIDTH_MAX)
assert.equal(clampChatInboxSidebarWidth(320), 320)
assert.equal(clampChatInboxSidebarWidth(400, 600), Math.floor(600 * 0.45))
writeChatInboxSidebarWidth(360)
assert.equal(readChatInboxSidebarWidth(), 360)
writeChatInboxSidebarWidth(50)
assert.equal(readChatInboxSidebarWidth(), CHAT_INBOX_SIDEBAR_WIDTH_MIN)

assert.equal(CHAT_WORKSPACE_PANEL_WIDTH_KEY, 'yue-chat-workspace-panel-w-v1')
assert.ok(CHAT_WORKSPACE_PANEL_WIDTH_MIN < CHAT_WORKSPACE_PANEL_WIDTH_DEFAULT)
assert.ok(CHAT_WORKSPACE_PANEL_WIDTH_MAX > CHAT_WORKSPACE_PANEL_WIDTH_DEFAULT)
assert.equal(clampChatWorkspacePanelWidth(100), CHAT_WORKSPACE_PANEL_WIDTH_MIN)
assert.equal(clampChatWorkspacePanelWidth(9999), CHAT_WORKSPACE_PANEL_WIDTH_MAX)
assert.equal(clampChatWorkspacePanelWidth(500, 700), Math.floor(700 * 0.6))
writeChatWorkspacePanelWidth(520)
assert.equal(readChatWorkspacePanelWidth(), 520)
writeChatWorkspacePanelWidth(50)
assert.equal(readChatWorkspacePanelWidth(), CHAT_WORKSPACE_PANEL_WIDTH_MIN)

assert.equal(CHAT_WORKSPACE_TABS_KEY, 'yue-chat-workspace-tabs-v1')
assert.equal(CHAT_WORKSPACE_ACTIVE_TAB_KEY, 'yue-chat-workspace-active-tab-v1')
assert.equal(CHAT_WORKSPACE_FILES_VIEW_KEY, 'yue-chat-workspace-files-view-v1')
assert.equal(CHAT_WORKSPACE_SCHEDULE_OPEN_KEY, 'yue-chat-workspace-schedule-open-v1')
writeChatWorkspaceOpenTabs(['files', 'tasks'])
assert.deepEqual(readChatWorkspaceOpenTabs(), ['files', 'tasks'])
writeChatWorkspaceActiveTab('tasks')
assert.equal(readChatWorkspaceActiveTab(), 'tasks')
writeChatWorkspaceFilesView('riced')
assert.equal(readChatWorkspaceFilesView(), 'riced')
writeChatWorkspaceScheduleOpen(true)
assert.equal(readChatWorkspaceScheduleOpen(false), true)

const here = dirname(fileURLToPath(import.meta.url))
const chatPage = readFileSync(join(here, '../pages/ChatPage.tsx'), 'utf8')
const aui = readFileSync(join(here, '../pages/chat/aui/ChatAuiRuntime.tsx'), 'utf8')
const auiPage = readFileSync(join(here, '../pages/chat/aui/ChatAuiPage.tsx'), 'utf8')
const auiCss = readFileSync(join(here, '../pages/chat/aui/ChatAui.css'), 'utf8')
assert.match(chatPage, /chatUiPrefs/, 'Classic chat shares prefs module')
assert.match(chatPage, /readChatWorkspacePanelWidth/, 'Classic persists workspace panel width')
assert.match(aui, /chatUiPrefs/, 'AUI chat shares prefs module')
assert.match(auiPage, /ds-chat-sidebar-resize/, 'AUI Inbox has resize handle')
assert.match(auiPage, /readChatInboxSidebarWidth/, 'AUI reads persisted Inbox width')
assert.match(auiPage, /readChatWorkspacePanelWidth/, 'AUI reads workspace panel width')
assert.match(auiPage, /onPromoteToWorkspaces|promoteThreadWorkspace/, 'AUI promotes thread files')
assert.match(auiPage, /max-width: 899px/, 'resize drag skipped on mobile drawer')
assert.match(auiCss, /\.ds-chat-sidebar-resize/, 'resize handle styles')
assert.match(auiCss, /display:\s*none\s*!important/, 'mobile hides resize grip')
assert.match(
  readFileSync(join(here, '../pages/chat/aui/ChatAuiThread.tsx'), 'utf8'),
  /consumeChatPrefill/,
  'AUI consumes Solo/Conversation prefill',
)

console.log('chatUiPrefs.smoke: ok')
