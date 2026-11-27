/**
 * Offline smoke: assistant-ui #/chat shell wiring (cutover default ON).
 * Run: npx tsx apps/web/src/lib/chatAui.smoke.ts
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { convertChatMessage } from '../pages/chat/aui/convertChatMessage'
import type { ChatMessage } from './chatHistory'
import { CHAT_AUI_FLAG_KEY, isChatAuiEnabled, setChatAuiEnabled } from './chatAuiFlag'
import {
  CHAT_DEEP_AVATAR_DEEP_MS,
  chatDeepAvatarIntroSrc,
  chatDeepAvatarMoodAssetStem,
  chatDeepAvatarMoodSrc,
  chatDeepAvatarPairSrc,
  isChatDeepAvatarDeepFinish,
  normalizeChatDeepAvatarCelebrateMode,
  normalizeChatDeepAvatarCharacter,
  normalizeChatDeepAvatarDockMode,
  pickChatDeepAvatarOutroMood,
  resolveChatDeepAvatarPairPlaySrc,
  shouldFullscreenCelebrate,
  shouldPlayChatDeepAvatarIntro,
} from './chatDeepAvatarCharacter'
import {
  __resetChatDeepAvatarPlanBuildForTests,
  abortChatDeepAvatarPlanBuild,
  consumeChatDeepAvatarPlanBuild,
  markChatDeepAvatarPlanBuild,
  peekChatDeepAvatarPlanBuild,
  setChatDeepAvatarPlanBuildChainBusy,
  settleChatDeepAvatarPlanBuild,
} from './chatDeepAvatarPlanBuild'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

const flagSrc = readFileSync(join(here, 'chatAuiFlag.ts'), 'utf8')
assert.match(flagSrc, /yue-chat-aui-v1/, 'flag key constant')
assert.equal(CHAT_AUI_FLAG_KEY, 'yue-chat-aui-v1')
assert.match(flagSrc, /!== '0'/, 'cutover defaults ON unless explicit opt-out')
assert.match(flagSrc, /not `@assistant-ui\/styles` stock CDN/, 'stock CDN look is off')

// Node has no localStorage — polyfill for default-ON cutover.
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
  get length() {
    return mem.size
  },
} as Storage

mem.clear()
assert.equal(isChatAuiEnabled(), true, 'missing key → AUI on')
setChatAuiEnabled(false)
assert.equal(isChatAuiEnabled(), false, 'explicit 0 → classic')
setChatAuiEnabled(true)
assert.equal(isChatAuiEnabled(), true, 'explicit 1 → AUI')

const app = readFileSync(join(root, 'App.tsx'), 'utf8')
assert.match(app, /isChatAuiEnabled/, 'App gates chat on AUI flag')
assert.match(app, /ChatAuiPage/, 'App lazy-loads ChatAuiPage')

const classic = readFileSync(join(root, 'pages/ChatPage.tsx'), 'utf8')
assert.match(classic, /Back to new chat UI/, 'classic can return to AUI after opt-out')
assert.match(classic, /setChatAuiEnabled\(true\)/, 'classic re-enables AUI flag')
assert.match(
  classic,
  /entitlement\?\.allowed\?\.autoSpeak/,
  'classic optional-chains allowed before autoSpeak (blank-#root crash)',
)

const page = readFileSync(join(root, 'pages/chat/aui/ChatAuiPage.tsx'), 'utf8')
assert.match(page, /ChatAuiRuntimeProvider/, 'AUI page wraps runtime')
assert.match(page, /canUseDeepseekChat/, 'AUI page keeps Family gate')
assert.match(page, /ds-chat-top-brand/, 'AUI uses classic centered brand classes')
// Header must be nested under main — a header sibling of main under row-flex
// .ds-chat vertically centered the chrome and hid the composer on iPhone.
const auiShellFn = page.slice(page.indexOf('function AuiShell'), page.indexOf('function GateShell'))
assert.match(
  auiShellFn,
  /ds-chat-main aui-main[\s\S]*<header className="ds-chat-top"[\s\S]*ChatAuiThread/,
  'top bar lives inside ds-chat-main (mobile layout)',
)
assert.doesNotMatch(
  auiShellFn,
  /<header className="ds-chat-top"[\s\S]*ds-chat-main aui-main/,
  'top bar must not precede ds-chat-main in AuiShell',
)
// History drawer flush left: classic absolute sidebar + absolute backdrop under
// `.ds-chat` — never an unstyled in-flow scrim (that shoved main right). Desktop
// push layout hides the backdrop via CSS (not a floating Esc/scrim modal).
assert.match(auiShellFn, /ds-chat-sidebar-backdrop/, 'mobile history uses classic absolute backdrop')
assert.doesNotMatch(auiShellFn, /ds-chat-sidebar-scrim/, 'no unstyled in-flow scrim')
assert.doesNotMatch(
  auiShellFn,
  /Popup Inbox: Esc|Escape[\s\S]*setSidebarOpen\(false\)/,
  'desktop push Inbox is not Esc-dismiss modal',
)
assert.match(
  auiShellFn,
  /ds-chat-sidebar[\s\S]*ds-chat-main aui-main/,
  'sidebar is a sibling of main under ds-chat (flush left)',
)
assert.match(auiShellFn, /InboxShell/, 'Inbox chrome lives in shell sidebar')
assert.match(auiShellFn, /aria-label="Inbox"/, 'sidebar is the Chat Inbox')
assert.match(page, /ChatInboxProvider/, 'Inbox provider wraps AUI runtime')
// New chat (+) must latch / debounce so spam-clicks cannot stack empty threads.
assert.match(
  auiShellFn,
  /aria-label="New chat"[\s\S]*aria-busy=\{newChatBusy \|\| undefined\}[\s\S]*disabled=\{busy \|\| newChatBusy/,
  'header New chat uses aria-busy + disabled while creating',
)
const runtimeSrc = readFileSync(join(root, 'pages/chat/aui/ChatAuiRuntime.tsx'), 'utf8')
assert.match(runtimeSrc, /NEW_CHAT_COOLDOWN_MS/, 'runtime defines new-chat cooldown')
assert.match(runtimeSrc, /creatingNewChatRef/, 'runtime sync-latches new-chat create')
assert.match(runtimeSrc, /newChatBusyRef/, 'runtime mirrors cooldown for pre-paint spam')
assert.match(
  runtimeSrc,
  /force\?: boolean|opts\?\.force/,
  'startNewChat accepts force for project/agent binds',
)
assert.doesNotMatch(
  runtimeSrc,
  /messages\.length === 0[\s\S]*return active\.id/,
  'startNewChat must not reuse empty drafts (steals project/agent threads)',
)
assert.match(runtimeSrc, /newChatBusy/, 'session exposes newChatBusy for header a11y')
const inboxShellForNew = readFileSync(join(root, 'pages/chat/inbox/InboxShell.tsx'), 'utf8')
assert.match(
  inboxShellForNew,
  /startNewChat\(\{\s*force:\s*true\s*\}\)/,
  'project/agent opens force a fresh thread',
)
// Classic / Back to app / theme live in Inbox header cog (not sidebar foot / top bar).
assert.doesNotMatch(auiShellFn, /ds-chat-sidebar-foot/, 'sidebar foot chrome removed')
assert.doesNotMatch(
  auiShellFn,
  /ds-chat-top[\s\S]*aria-label="Back to app"/,
  'Back to app is not in the AUI top bar',
)
const settingsMenu = readFileSync(join(root, 'pages/chat/inbox/InboxSettingsMenu.tsx'), 'utf8')
assert.match(settingsMenu, /Classic chat UI/, 'settings menu can flip to classic')
assert.match(settingsMenu, /Back to app/, 'settings menu has Back to app')
assert.match(settingsMenu, /ThemeToggle|toggleTheme/, 'settings menu wires theme')
assert.match(settingsMenu, /setChatAuiEnabled\(false\)/, 'classic opt-out still flips flag')
assert.match(settingsMenu, /inbox-settings-companion|Companion/, 'settings menu has Companion section')
assert.match(settingsMenu, /useChatDeepAvatarCharacter/, 'Companion uses persisted character hook')
assert.match(
  settingsMenu,
  /names\[id\]|useChatDeepAvatarNameEditor|CHAT_DEEP_AVATAR_CHARACTER_LABEL/,
  'Companion shows renameable character names',
)
assert.match(settingsMenu, /inbox-settings-rename|Rename/, 'Companion rename field')
assert.match(
  settingsMenu,
  /PencilIcon|Edit name|inbox-settings-rename-view/,
  'Companion name is static until pencil/edit',
)
assert.match(
  settingsMenu,
  /CheckIcon|Save name|commitRename|inbox-settings-rename-edit/,
  'Companion name edit commits via save/check',
)
assert.match(
  settingsMenu,
  /cancelRename|CloseIcon|Escape/,
  'Companion name edit cancels via Esc/close',
)
assert.match(
  settingsMenu,
  /CHAT_INBOX_COMPANION_OPEN_KEY|companionOpen|aria-expanded/,
  'Companion block collapses and persists open state',
)
assert.match(settingsMenu, /CHAT_DEEP_AVATAR_TRAITS|Trait/, 'Companion trait presets')
assert.match(
  settingsMenu,
  /inbox-settings-notes-input|useChatDeepAvatarNotes|Companion notes/,
  'Companion notes textarea',
)
assert.match(
  settingsMenu,
  /onBlur[\s\S]*notes\.trim\(\)|trimmed !== notes/,
  'Companion notes trim on blur only (Space works while typing)',
)
assert.match(settingsMenu, /Sound /, 'Companion sound toggle')
assert.match(
  settingsMenu,
  /useChatDeepAvatar3dEnabled|3D companion/,
  'Companion 3D chrome toggle',
)
assert.match(settingsMenu, /inbox-settings-celebrate|Celebrate/, 'settings menu has Celebrate section')
assert.match(
  settingsMenu,
  /CHAT_DEEP_AVATAR_CELEBRATE_MODES|Every success|Deep finishes|Frame only/,
  'Celebrate lists Every / Deep / Frame modes',
)
assert.match(settingsMenu, /useChatDeepAvatarCelebrateMode/, 'Celebrate uses persisted mode hook')
assert.match(settingsMenu, /createPortal/, 'Celebrate/Companion settings portal past sidebar overflow')
assert.match(settingsMenu, /is-portaled/, 'portaled settings menu class')
assert.match(
  settingsMenu,
  /querySelector\('\.ds-chat'\)|querySelector\("\.ds-chat"\)/,
  'settings portal prefers .ds-chat so DS tokens stay in scope',
)
assert.match(settingsMenu, /first\?\.focus\(\)|querySelector.*menuitem/, 'portaled menu focuses first item on open')
assert.match(settingsMenu, /triggerRef\.current\?\.focus/, 'Esc/dismiss restores focus to cog')
assert.match(
  settingsMenu,
  /inbox-settings-companion[\s\S]*inbox-settings-celebrate/,
  'Celebrate renders after Companion in the cog menu',
)
const settingsInboxCss = readFileSync(join(root, 'pages/chat/inbox/Inbox.css'), 'utf8')
assert.match(settingsInboxCss, /inbox-settings-menu\.is-portaled/, 'portaled settings CSS')
assert.match(
  settingsInboxCss,
  /\.inbox-settings-menu\.is-portaled[\s\S]*z-index:\s*130/,
  'portaled settings sits above sidebar chrome (and at body fallback above .ds-chat 120)',
)
assert.match(
  settingsInboxCss,
  /\.inbox-settings-menu\.is-portaled[\s\S]*--ds-canvas:\s*#ffffff/,
  'portaled settings redeclares --ds-canvas (body fallback opaque panel)',
)
assert.match(
  settingsInboxCss,
  /\.inbox-settings-menu\.is-portaled[\s\S]*background:\s*var\(--ds-canvas\)/,
  'portaled settings forces solid canvas background',
)
assert.match(
  settingsInboxCss,
  /html\[data-theme='dark'\]\s*\.inbox-settings-menu\.is-portaled[\s\S]*--ds-canvas:\s*#0e0e10/,
  'portaled settings dark theme canvas',
)
assert.match(
  readFileSync(join(root, 'pages/chat/aui/ChatAui.css'), 'utf8'),
  /\.aui-deep-avatar-fx[\s\S]*z-index:\s*130/,
  'celebrate FX stays above .ds-chat (120)',
)
const inboxShell = readFileSync(join(root, 'pages/chat/inbox/InboxShell.tsx'), 'utf8')
assert.match(inboxShell, /InboxSettingsMenu/, 'Inbox header mounts settings cog')
assert.match(inboxShell, /inbox-header-actions/, 'settings sits beside New project +')
assert.match(auiShellFn, /ds-chat-menu-btn/, 'menu button collapses/expands Inbox')
assert.match(auiShellFn, /is-inbox-collapsed|is-inbox-open/, 'shell marks Inbox collapse state')
assert.match(auiShellFn, /ds-chat-sidebar-resize/, 'Inbox edge resize handle')
assert.match(auiShellFn, /is-inbox-resizing/, 'shell marks live resize')
assert.match(auiShellFn, /readChatInboxSidebarWidth|writeChatInboxSidebarWidth/, 'Inbox width persists')
assert.doesNotMatch(auiShellFn, /aui-shell-footer|aui-classic-link/, 'no page-bottom classic link')
assert.doesNotMatch(page, /ChatAuiStock\.css/, 'page does not import stock styles')
assert.doesNotMatch(auiShellFn, /is-stock/, 'shell does not mark stock look')
assert.doesNotMatch(page, /Stock/, 'no Stock badge in AUI page')
assert.doesNotMatch(page, /useAuiStockDark/, 'no stock dark bridge')

const auiCss = readFileSync(join(root, 'pages/chat/aui/ChatAui.css'), 'utf8')
assert.match(auiCss, /\.ds-chat\.aui-chat/, 'AUI shell scoped under .aui-chat')
assert.match(auiCss, /--ds-font-display:\s*Orbitron/, 'AUI headers use Orbitron (OFL Ailerons lookalike)')
assert.doesNotMatch(
  auiCss,
  /--ds-font-display:\s*[^;]*Ailerons/,
  'AUI display stack does not name Ailerons',
)
assert.match(auiCss, /--ds-font:\s*'Noto Sans'/, 'AUI body uses Noto Sans')
assert.match(auiCss, /Noto Sans Chao/, 'Chao / Jyutping face preserved under AUI')
assert.doesNotMatch(
  auiCss,
  /@font-face[\s\S]*Ailerons/,
  'Ailerons binary not bundled without commercial license',
)

const indexHtml = readFileSync(join(root, '../index.html'), 'utf8')
assert.match(indexHtml, /family=Orbitron/, 'Orbitron loaded via Google Fonts')
assert.doesNotMatch(indexHtml, /Ailerons/, 'index.html does not ship Ailerons')
assert.match(
  auiCss,
  /\.ds-chat\.aui-chat \.ds-chat-menu-btn[\s\S]*display:\s*grid/,
  'AUI keeps menu btn on desktop to collapse Inbox',
)
assert.match(auiCss, /is-inbox-collapsed/, 'desktop collapsed Inbox width rules')
assert.match(
  auiCss,
  /\.ds-chat\.aui-chat \.ds-chat-sidebar[\s\S]*position:\s*relative[\s\S]*flex:\s*0\s+0\s+var\(--ds-sidebar-w\)/,
  'desktop Inbox is in-flow push (not floating popup)',
)
assert.match(
  auiCss,
  /\.ds-chat\.aui-chat \.ds-chat-sidebar-backdrop[\s\S]*display:\s*none/,
  'desktop push Inbox hides backdrop scrim',
)
assert.doesNotMatch(
  auiCss,
  /Float over main|Cursor-like popup reveal/,
  'no floating popup copy left in AUI Inbox chrome',
)
assert.match(
  auiCss,
  /\.aui-thread-item::before[\s\S]*height:\s*58%|\.aui-thread-item\[data-active\]::before/,
  'Cursor LINE active indicator on thread rows',
)
assert.match(auiCss, /\.ds-chat-sidebar-resize/, 'desktop resize grip styles')
assert.match(
  auiCss,
  /@media \(max-width: 899px\)[\s\S]*\.ds-chat-sidebar-resize[\s\S]*display:\s*none/,
  'mobile drawer hides resize grip',
)
assert.match(
  auiCss,
  /Top bar must live inside|never becomes a full-height row sibling|flex-row sibling/i,
  'CSS documents the iPhone layout invariant',
)
assert.match(
  auiCss,
  /\.aui-thread-list[\s\S]*flex:\s*1\s+1\s+auto/,
  'thread list grows so sidebar foot pins to bottom',
)
assert.match(
  auiCss,
  /\.inbox-agents \.aui-thread-list[\s\S]*flex:\s*0\s+0\s+auto/,
  'nested inbox thread list does not shrink under CHATS or steal scroll',
)
assert.doesNotMatch(auiCss, /\.aui-shell-footer|\.aui-classic-link/, 'page-bottom classic link CSS removed')
assert.match(
  auiCss,
  /\.aui-viewport[\s\S]*overflow-x:\s*hidden[\s\S]*overflow-y:\s*auto/,
  'AUI viewport scrolls vertically only (no iPhone horizontal bar)',
)
assert.match(
  auiCss,
  /\.aui-md[\s\S]*overflow-wrap:\s*anywhere/,
  'AUI markdown wraps long unbroken strings',
)
assert.match(
  auiCss,
  /\.aui-bubble\.is-user[\s\S]*overflow-wrap:\s*anywhere/,
  'AUI user bubbles wrap long URLs',
)
assert.doesNotMatch(
  auiCss,
  /\.aui-layout\.is-sidebar-open \.aui-sidebar/,
  'no nested absolute aui-sidebar under aui-layout (left gap)',
)

const classicCss = readFileSync(join(root, 'pages/ChatPage.css'), 'utf8')
assert.match(classicCss, /\.ds-chat\s*\{[\s\S]*max-width:\s*100%;/, 'chat shell avoids 100vw overflow')
assert.doesNotMatch(
  classicCss,
  /\.ds-chat\s*\{[^}]*max-width:\s*100vw/,
  'chat shell must not use max-width:100vw',
)
assert.match(
  classicCss,
  /\.ds-chat-messages[\s\S]*overflow-x:\s*hidden[\s\S]*overflow-y:\s*auto/,
  'classic messages scroll vertically only',
)
assert.match(
  classicCss,
  /\.ds-md-code-wrap[\s\S]*max-width:\s*100%/,
  'code blocks stay within chat width',
)
assert.match(
  classicCss,
  /\.ds-md-table-wrap\s*\{[^}]*overflow-x:\s*auto/,
  'markdown tables scroll horizontally inside the wrap',
)
assert.match(
  classicCss,
  /\.ds-md-table\s*\{[^}]*width:\s*max-content[^}]*min-width:\s*100%/,
  'tables keep intrinsic column width (no letter-crush fit)',
)
assert.match(
  classicCss,
  /\.ds-md-table th,\s*\.ds-md-table td\s*\{[^}]*white-space:\s*nowrap[^}]*min-width:\s*6ch/,
  'table cells keep words intact with a floor min-width',
)
assert.match(
  classicCss,
  /\.ds-md-code\s*\{[^}]*overflow-x:\s*auto[^}]*white-space:\s*pre/,
  'code fences scroll horizontally without soft-wrapping',
)

const runtime = readFileSync(join(root, 'pages/chat/aui/ChatAuiRuntime.tsx'), 'utf8')
assert.match(runtime, /useExternalStoreRuntime/, 'ExternalStoreRuntime bridge')
assert.match(runtime, /streamDeepseekChat/, 'SSE still via streamDeepseekChat')
assert.match(runtime, /hydrateChatThreadsAsync/, 'device-local history hydrate')
assert.match(runtime, /adapters:\s*\{[\s\S]*threadList/, 'thread list adapter')
assert.match(runtime, /plugins: enabledPluginsRef/, 'plugins forwarded to SSE')
assert.match(runtime, /uploadDeepseekChatFile/, 'file attach upload')
assert.match(runtime, /ocrDeepseekChatFile/, 'OCR helper')
assert.match(
  runtime,
  /entitlement\?\.allowed\?\.autoSpeak/,
  'AUI optional-chains allowed before autoSpeak (blank-#root crash)',
)
assert.doesNotMatch(
  runtime,
  /entitlement\?\.allowed\.autoSpeak/,
  'AUI must not use entitlement?.allowed.autoSpeak (throws when allowed missing)',
)

const thread = readFileSync(join(root, 'pages/chat/aui/ChatAuiThread.tsx'), 'utf8')
assert.match(thread, /ThreadPrimitive/, 'Thread primitives')
assert.match(thread, /ComposerPrimitive/, 'Composer primitives')
assert.match(thread, /ChatDictateButton/, 'keeps DeepSeek dictate')
assert.match(thread, /SpeakButton/, 'keeps SpeakButton')
assert.match(thread, /DeepThink/, 'DeepThink toggle chrome')
assert.match(thread, /CHAT_COMPOSER_MODES|aui-composer-modes/, 'Agent/Ask/Plan mode picker')
assert.match(thread, /AgentModeIcon|AskModeIcon|PlanModeIcon/, 'mode icons')
assert.match(thread, /cycleChatComposerMode|Shift\+Tab/, 'Shift+Tab cycles Agent/Ask/Plan')
assert.match(thread, /ToolActivityCards|aui-tool-cards/, 'inline tool-call cards in replies')
assert.match(thread, /followUpQueue|aui-followups/, 'follow-up queue while running')
assert.match(
  thread,
  /submitMode=\{busy \? 'none' : 'enter'\}|Queue a follow-up \(Enter\)/,
  'Enter-while-busy queues (not blocked by isRunning submit)',
)
assert.match(
  runtime,
  /enqueuePrompt\(head\.text, head\.threadId\)/,
  'queued follow-ups flush to their stamped threadId',
)
assert.match(thread, /aui-tools-toggle|toolsExpanded/, 'collapsible Tools')
assert.match(thread, /aui-composer-toolbar/, 'composer toolbar under full-width input')
assert.doesNotMatch(thread, /title="Insert @ context/, 'no dedicated @ button')
assert.match(thread, /ProjectAgentStrip|aui-agent-strip/, 'project agent strip')
assert.match(thread, /aui-plan-artifact|planDraft/, 'editable Plan artifact')
assert.match(thread, /onPaste|onDrop/, 'composer image paste/drop')
assert.match(thread, /ChatPluginKeysModal/, 'BYOK keys modal')
assert.match(thread, /Rich layout/, 'rich layout toggle')
assert.match(thread, /renderChatMarkdown\(text,\s*\{\s*sources\s*\}\)/, 'citation chips get source hrefs')
assert.match(thread, /ChatSourcesList/, 'collapsible sources list under assistant')
assert.match(thread, /className="aui-thread"/, 'DeepSeek thread root class')
assert.match(thread, /className=\{`aui-composer/, 'DeepSeek composer class')
assert.match(thread, /aui-msg is-user/, 'DeepSeek user message class')
assert.match(thread, /aui-msg is-assistant/, 'DeepSeek assistant message class')
assert.match(thread, /aui-send/, 'DeepSeek send button class')
assert.match(thread, /aui-scroll-bottom/, 'scroll-to-bottom uses DeepSeek hide-when-disabled class')
const inboxShellSrc = readFileSync(join(root, 'pages/chat/inbox/InboxShell.tsx'), 'utf8')
assert.match(inboxShellSrc, /\+ New chat/, 'inbox new-chat CTA matches classic tone')
assert.match(inboxShellSrc, /ArchiveList/, 'inbox has archive browser')
assert.match(
  inboxShellSrc,
  /ThreadListItemPrimitive\.Archive[\s\S]*ArchiveIcon/,
  'archive button renders ArchiveIcon child',
)
assert.match(
  inboxShellSrc,
  /ThreadListItemPrimitive\.Delete[\s\S]*DeleteIcon/,
  'delete button renders DeleteIcon child',
)
assert.match(auiCss, /\.aui-thread-archive[\s\S]*place-items:\s*center/, 'archive icon button centered')
assert.doesNotMatch(
  thread,
  /useAuiStockDark|aui-thread-root|aui-composer-root|aui-user-message-root|aui-thread-scroll-to-bottom/,
  'no stock class bridge',
)
assert.match(auiCss, /\.aui-scroll-bottom:disabled/, 'disabled scroll button is display:none')
assert.doesNotMatch(
  thread,
  /pluginsOpen \|\| harnessOn/,
  'Harness must not force-open the plugins strip',
)
assert.match(
  thread,
  /\{\/\* Plugins strip is Plugins-toggle only[\s\S]*\{pluginsOpen && toolsExpanded \?/,
  'plugins strip gated on pluginsOpen (and Tools expanded)',
)
assert.match(thread, /is-streaming/, 'streaming markdown caret class')
assert.match(thread, /EMPTY_SOURCES/, 'stable empty sources sentinel (Object.is loop guard)')
assert.match(thread, /Object\.is/, 'documents Object.is array trap for useMessageSources')
assert.match(thread, /blank `#root`|blank #root/, 'documents blank-#root failure mode')
assert.match(auiCss, /\.aui-composer\b/, 'DeepSeek composer styles')
assert.match(auiCss, /max-width:\s*none/, 'composer is full-bleed (no 46rem card)')
assert.match(auiCss, /border-radius:\s*0/, 'composer drops floating card radius')
assert.match(auiCss, /\.aui-composer-portrait\b/, 'WC3-style portrait slot in composer')
assert.match(auiCss, /\.aui-composer-main\b/, 'composer main column beside portrait')
assert.match(auiCss, /\.aui-composer-body\b/, 'portrait + draft share a body row under modes')
assert.match(
  auiCss,
  /\.aui-composer\b[\s\S]*flex-direction:\s*column/,
  'composer stacks modes above portrait|draft',
)
assert.match(
  auiCss,
  /\.aui-composer-modes[\s\S]*flex-wrap:\s*nowrap[\s\S]*overflow-x:\s*auto/,
  'modes + Tools share one horizontally scrollable row',
)
assert.match(auiCss, /\.aui-tool-card\b/, 'tool card DeepSeek chrome')
assert.match(auiCss, /\.aui-followups\b/, 'follow-up queue chrome')
assert.match(
  auiCss,
  /@media \(max-width: 599px\)[\s\S]*\.aui-composer-portrait[\s\S]*4\.5rem/,
  'phone soak shrinks WC3 portrait',
)
assert.match(
  auiCss,
  /@media \(max-height: 700px\)[\s\S]*\.aui-composer-input[\s\S]*max-height:\s*4\.5rem/,
  'short desktop soak caps composer input height',
)
assert.match(
  auiCss,
  /\.aui-followups-list[\s\S]*max-height:\s*5\.5rem[\s\S]*overflow:\s*auto/,
  'follow-up queue list scrolls instead of crushing the WC3 bar',
)
assert.match(
  auiCss,
  /@media \(max-width: 599px\)[\s\S]*\.aui-review-rail\.is-sheet[\s\S]*42dvh/,
  'phone soak shortens Diffs/Runs sheet',
)
assert.match(auiCss, /\.aui-deep-avatar\.is-portrait\b/, 'portrait size class')
assert.match(auiCss, /\.aui-send\b/, 'DeepSeek send styles restored')
assert.match(auiCss, /\.aui-empty\b/, 'DeepSeek empty-state styles')
assert.match(thread, /size="portrait"/, 'composer mounts portrait avatar')
assert.match(thread, /aui-composer-portrait/, 'portrait lives inside composer')
assert.match(
  thread,
  /aui-composer-modes[\s\S]*aui-composer-body[\s\S]*aui-composer-portrait/,
  'modes bar spans above portrait + draft body',
)
assert.match(thread, /function AuiCopyButton|AuiCopyButton/, 'icon-only Copy control')
assert.match(thread, /aria-label=\{isCopied \? 'Copied' : 'Copy'\}/, 'Copy aria-label Copy/Copied')
assert.match(thread, /CopyIcon|CopiedCheckIcon/, 'Copy uses overlapping-pages / check icons')
assert.doesNotMatch(
  thread,
  /ActionBarPrimitive\.Copy[^>]*>Copy</,
  'Copy is not a literal text label in the action bar',
)
assert.doesNotMatch(thread, /ChatDeepAvatarBubble|ChatDeepAvatarStage/, 'floating dock stage removed')
assert.doesNotMatch(thread, /ChatDeepAvatarCharacterPicker|size="hero"/, 'empty-state hero + picker removed')
assert.doesNotMatch(thread, /ChatAuiSidebar/, 'deprecated ChatAuiSidebar re-export removed')
assert.match(thread, /FALLBACK_PLUGINS|EMPTY_THREADS_FOR_MENTIONS/, 'composer uses stable fallback/mention sentinels')
assert.match(thread, /useChatDeepAvatarLipLevel/, 'TTS lip level wired into portrait')
assert.match(thread, /useChatDeepAvatarDock/, 'persisted bar|stage dock hook')
assert.match(thread, /aui-avatar-stage/, 'stage panel uses aui-avatar-stage (not revived deep-avatar-stage)')
assert.match(thread, /size="stage"/, 'stage dock mounts size=stage avatar')
assert.match(
  thread,
  /Show large companion|Dock companion to composer/,
  'portrait toggle aria-labels for bar↔stage',
)
assert.match(
  thread,
  /celebrateFx[\s\S]*setDock|if \(celebrateFx\) return/,
  'dock toggle ignored while celebrate FX owns the screen',
)
assert.match(auiCss, /\.aui-deep-avatar\b/, 'companion avatar styles')
assert.doesNotMatch(auiCss, /\.aui-deep-avatar-dock\b|\.aui-deep-avatar-stage\b/, 'old dock/stage CSS stay removed')
assert.match(auiCss, /\.aui-avatar-stage\b/, 'new stage panel class aui-avatar-stage')
assert.match(auiCss, /\.aui-layout\.is-avatar-stage\b/, 'layout grid when stage docked')
assert.match(auiCss, /\.aui-deep-avatar\.is-stage\b/, 'stage size class')
assert.match(
  auiCss,
  /\.aui-layout\.is-avatar-stage\s*\{[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\)/,
  'stage grid row is minmax(0,1fr) so thread stays viewport-tall',
)
assert.match(
  auiCss,
  /\.aui-layout\.is-avatar-stage\s*\{[^}]*overflow:\s*hidden/,
  'stage layout clips/contains so composer cannot drift with messages',
)
assert.match(
  auiCss,
  /\.aui-layout\.is-avatar-stage\s*>\s*\.aui-thread\s*\{[^}]*min-height:\s*0[^}]*overflow:\s*hidden/s,
  'stage thread column min-height 0 + overflow hidden (scroll in viewport)',
)
assert.match(
  auiCss,
  /\.aui-footer\s*\{[^}]*position:\s*sticky[^}]*bottom:\s*0/s,
  'composer footer sticky bottom under message viewport',
)
assert.match(
  auiCss,
  /\.aui-footer\s*\{[^}]*margin-top:\s*auto/s,
  'footer margin-top auto pins composer when thread is short',
)
assert.match(
  auiCss,
  /@media \(max-width: 700px\)[\s\S]*\.aui-layout\.is-avatar-stage\s*\{[\s\S]*grid-template-rows:\s*auto\s+minmax\(0,\s*1fr\)/,
  'phone soak: stage strip + constrained thread row',
)
assert.match(
  auiCss,
  /@media \(max-width: 700px\)[\s\S]*\.aui-avatar-stage/,
  'phone soak: stage becomes top strip',
)
assert.match(auiCss, /\.aui-composer-body\.is-avatar-staged\b/, 'composer full-width when staged')
assert.match(thread, /ComposerStatusCluster/, 'status chips extracted for dock-aware placement')
assert.match(
  thread,
  /aui-avatar-stage-toggle[\s\S]*ComposerStatusCluster placement="stage"/,
  'stage dock: status cluster sits in stage toggle above portrait',
)
assert.match(
  thread,
  /dock === 'bar' \? <ComposerStatusCluster placement="bar" \/>/,
  'bar dock: status cluster mounts above composer harness',
)
assert.doesNotMatch(
  thread,
  /aui-composer-modes[\s\S]*className="aui-status"/,
  'status chips no longer live in the modes row',
)
assert.match(auiCss, /\.aui-status-cluster\.is-bar\b/, 'bar status cluster styles')
assert.match(auiCss, /\.aui-status-cluster\.is-stage\b/, 'stage status cluster styles')
assert.match(
  auiCss,
  /\.aui-avatar-stage-toggle\s*\{[^}]*flex-direction:\s*column/s,
  'stage toggle stacks status above avatar',
)
assert.match(
  auiCss,
  /@media \(max-width: 700px\)[\s\S]*\.aui-status-cluster\.is-stage/,
  'phone soak: stage status stays readable in top strip',
)
assert.match(
  thread,
  /ThreadPrimitive\.ViewportFooter[\s\S]*className="aui-footer"[\s\S]*ComposerChrome/,
  'composer stays in ViewportFooter (sticky under scrollport, not after messages)',
)
assert.match(
  thread,
  /ThreadPrimitive\.Viewport[\s\S]*aui-viewport[\s\S]*ThreadPrimitive\.Messages[\s\S]*ViewportFooter/s,
  'messages scroll in viewport; footer sibling under messages inside viewport',
)
assert.doesNotMatch(auiCss, /\.aui-new-thread\b|\.aui-deep-avatar\.is-bubble\b/, 'dead new-thread + bubble size CSS removed')
assert.match(auiCss, /\.aui-deep-avatar-lips\b/, 'TTS lip overlay styles')
const avatarSrc = readFileSync(join(root, 'pages/chat/aui/ChatDeepAvatar.tsx'), 'utf8')
const audioSrc = readFileSync(join(here, 'chatDeepAvatarAudio.ts'), 'utf8')
assert.match(avatarSrc, /size = 'portrait'|Size = 'portrait'/, 'portrait is default/supported size')
assert.match(avatarSrc, /'stage'|size === 'stage'/, 'stage size supported on ChatDeepAvatar')
assert.doesNotMatch(
  avatarSrc,
  /'bubble'|CHAT_DEEP_AVATAR_HAPPY_MS|CHAT_DEEP_AVATAR_POSTER/,
  'dead bubble size + deprecated avatar exports removed',
)
assert.match(
  avatarSrc,
  /useChatDeepAvatarDisplayName/,
  'live companion display-name hook for nameplate + aria',
)
assert.match(
  readFileSync(join(root, 'pages/chat/aui/ChatAuiRuntime.tsx'), 'utf8'),
  /visibleThreads|activeFollowUps|clearError = useCallback/,
  'runtime memoizes visible threads / follow-ups / clearError',
)
assert.match(
  runtimeSrc,
  /retryLastTurn|continueLastAssistant|regenerateLastAssistant|continueAvailable/,
  'runtime exposes Retry / Continue / Regenerate',
)
assert.match(
  thread,
  /ChatSkillMenu|\/plan|\/ask|\/agent|\/clear/,
  'AUI slash mode palette on skill menu',
)
assert.match(
  thread,
  /aui-error-actions|Retry|continueAvailable/,
  'error banner Retry + Continue after Stop',
)
assert.match(
  thread,
  /is-done[\s\S]*Done|Done[\s\S]*is-done/,
  'Working→Done settle chip',
)
assert.match(
  thread,
  /wasBusyOnThreadRef|prev\.id === activeId/,
  'Done flash only when the viewed thread settles (not on tab switch)',
)
assert.match(
  thread,
  /regenerateLastAssistant|Regenerate/,
  'Regenerate on last assistant turn',
)
assert.match(avatarSrc, /useChatDeepAvatarCharacter/, 'persisted character hook')
assert.match(avatarSrc, /CHAT_DEEP_AVATAR_CHARACTER_EVENT/, 'same-tab character sync')
assert.match(avatarSrc, /useChatDeepAvatarCelebrateMode/, 'celebrate mode hook')
assert.match(avatarSrc, /useChatDeepAvatarDock/, 'dock mode hook')
assert.match(avatarSrc, /ChatDeepAvatarCelebrateFx/, 'fullscreen celebrate FX component')
assert.match(
  avatarSrc,
  /forced\?\.forceFullscreen[\s\S]*sessionRef\.current/,
  'outro celebrate skips when forced play already owns fullscreen',
)
assert.match(
  avatarSrc,
  /onDismissRef\.current/,
  'CelebrateFx dismiss via ref so playReq churn does not restart audio',
)
assert.match(
  audioSrc,
  /let playGen[\s\S]*isCurrent\(myGen\)/,
  'emotion audio uses generation token against Strict Mode double-play',
)
assert.doesNotMatch(
  audioSrc,
  /fetch\([^)]*\/api\/tts|new Audio\([^)]*\/api\/tts/,
  'companion VO never fetches /api/tts',
)
assert.match(avatarSrc, /createPortal/, 'celebrate FX portals to body')
assert.match(avatarSrc, /pickChatDeepAvatarOutroMood|setOutro/, 'outro latch wired in mood hook')
assert.match(avatarSrc, /Priority \(high → low\)/, 'documents mood priority')
assert.match(avatarSrc, /celebrate \/ proud \/ eureka|proud.*eureka/, 'documents proud/eureka outros')
assert.doesNotMatch(avatarSrc, /[Ll]ive2[Dd]|Cubism/, 'no Live2D / Cubism in avatar')
assert.match(thread, /ChatDeepAvatar3DGate/, 'thread mounts 3D companion gate')
assert.match(auiCss, /\.aui-deep-avatar-3d-handle\b/, '3D companion handle CSS')
assert.doesNotMatch(avatarSrc, /ChatDeepAvatarCharacterPicker|ChatDeepAvatarBubble/, 'picker/bubble moved out of avatar module')
assert.doesNotMatch(auiCss, /\.aui-avatar-char-picker\b/, 'composer-adjacent character picker CSS removed')
assert.match(auiCss, /\.aui-deep-avatar-fx\b/, 'fullscreen celebrate overlay styles')
assert.match(auiCss, /\.aui-deep-avatar-fx-stars\b/, 'canvas star field class')
assert.match(
  auiCss,
  /\.aui-deep-avatar-fx\b[\s\S]*z-index:\s*130/,
  'celebrate FX above .ds-chat (120) so body portal is visible',
)
assert.match(auiCss, /prefers-reduced-motion[\s\S]*aui-deep-avatar-fx/, 'reduced-motion hides fullscreen FX')
assert.match(
  auiCss,
  /\.aui-deep-avatar-fx-fly[\s\S]*min\(22rem,\s*78vw,\s*70vh\)/,
  'FX avatar sized for desktop without clipping',
)
assert.match(
  auiCss,
  /@media \(max-width: 399px\)[\s\S]*\.aui-deep-avatar-fx-fly/,
  'FX shrinks on ~390 phone widths',
)
assert.match(
  auiCss,
  /@media \(max-height: 700px\)[\s\S]*\.aui-deep-avatar-fx-fly/,
  'FX shrinks on short viewports',
)
assert.match(thread, /ChatDeepAvatarCelebrateFx/, 'thread mounts celebrate FX')
assert.match(thread, /useChatDeepAvatarCelebrateFx/, 'thread gates fullscreen via pref')
assert.match(thread, /originRef=\{dockRef\}/, 'celebrate FLIP origin follows active dock')
assert.match(
  thread,
  /className="aui-avatar-dock-origin"\s+ref=\{dockRef\}/,
  'celebrate origin wraps avatar (not full-height stage toggle)',
)
assert.doesNotMatch(
  thread,
  /className="aui-avatar-stage-toggle"[^>]*ref=\{dockRef\}/,
  'stage toggle button is not the celebrate origin',
)
assert.match(thread, /dimmed=\{dimPortrait\}/, 'portrait dims while FX flies')
assert.match(thread, /ChatDeepAvatarNameplate/, 'MapleStory nameplate under companion')
assert.match(
  thread,
  /aui-avatar-dock-frame[\s\S]*ChatDeepAvatarNameplate[\s\S]*size="portrait"/,
  'bar dock: nameplate under portrait outside FLIP origin',
)
assert.match(
  thread,
  /aui-avatar-dock-frame is-stage[\s\S]*ChatDeepAvatarNameplate[\s\S]*size="stage"/,
  'stage dock: nameplate under staged avatar',
)
assert.match(
  auiCss,
  /\.aui-deep-avatar-nameplate\b/,
  'companion nameplate styles',
)
assert.match(
  auiCss,
  /\.aui-deep-avatar-nameplate-text[\s\S]*text-overflow:\s*ellipsis/,
  'nameplate ellipsizes long names',
)
assert.match(
  auiCss,
  /\.aui-deep-avatar-nameplate\b[\s\S]*pointer-events:\s*none/,
  'nameplate does not steal dock tap / mic hits',
)
assert.match(
  auiCss,
  /\.aui-avatar-dock-frame\b/,
  'dock frame stacks bust + nameplate',
)
assert.match(
  avatarSrc,
  /useChatDeepAvatarDisplayName|ChatDeepAvatarNameplate/,
  'nameplate reads live companion display name',
)
assert.match(
  avatarSrc,
  /displayChatDeepAvatarName/,
  'nameplate reuses persona display name helper (no second store)',
)
const inboxCss = readFileSync(join(root, 'pages/chat/inbox/Inbox.css'), 'utf8')
assert.match(inboxCss, /\.inbox-settings-companion\b/, 'Inbox Companion settings styles')
assert.match(inboxCss, /\.inbox-settings-celebrate\b/, 'Inbox Celebrate settings styles')
assert.match(
  inboxCss,
  /\.inbox-settings-rename-input[\s\S]*background:\s*var\(--ds-surface-1\)/,
  'rename input uses DS surface-1 (readable in dark + light)',
)
assert.match(
  inboxCss,
  /\.inbox-settings-rename-text[\s\S]*color:\s*var\(--ds-text\)/,
  'static companion name uses DS text token',
)
assert.match(
  inboxCss,
  /\.inbox-band[\s\S]*color-mix\(in srgb,\s*var\(--ds-blue\)/,
  'Inbox section bands use themed glow seams',
)
assert.match(
  inboxCss,
  /\.inbox-settings-menu\.is-portaled[\s\S]*--ds-surface:\s*var\(--ds-surface-1\)/,
  'portaled settings aliases --ds-surface to surface-1',
)
assert.match(
  inboxCss,
  /\.inbox-settings-companion-toggle\b/,
  'Companion settings has collapse toggle styles',
)
assert.match(page, /ChatDeepAvatarIntroOverlay/, 'AUI shell mounts companion intro overlay')
assert.match(auiCss, /\.aui-deep-avatar-intro\b/, 'companion intro overlay styles')
assert.match(
  auiCss,
  /\.aui-deep-avatar-intro\b[\s\S]*z-index:\s*140/,
  'intro sits above celebrate FX (130)',
)
assert.match(
  auiCss,
  /\.aui-deep-avatar-intro\s*\{[^}]*width:\s*100vw/,
  'intro overlay spans full viewport width',
)
assert.match(
  auiCss,
  /\.aui-deep-avatar-intro\s*\{[^}]*height:\s*100vh/,
  'intro overlay spans full viewport height',
)
assert.match(
  auiCss,
  /\.aui-deep-avatar-intro-stage\s*\{[^}]*inset:\s*0/,
  'intro stage fills the fixed overlay',
)
assert.match(
  auiCss,
  /\.aui-deep-avatar-intro-video\s*\{[^}]*object-fit:\s*contain/,
  'intro video uses contain so portrait fits all viewports without crop',
)
assert.doesNotMatch(
  auiCss,
  /\.aui-deep-avatar-intro-video\s*\{[^}]*object-fit:\s*cover/,
  'intro video must not cover-crop on desktop landscape',
)
assert.doesNotMatch(
  auiCss,
  /\.aui-deep-avatar-intro-video\s*\{[^}]*min-width:\s*100%/,
  'intro video must not force min-width cover fill',
)
assert.doesNotMatch(
  auiCss,
  /\.aui-deep-avatar-intro-video\s*\{[^}]*min-height:\s*100%/,
  'intro video must not force min-height cover fill',
)
assert.match(auiCss, /prefers-reduced-motion[\s\S]*aui-deep-avatar-intro/, 'reduced-motion softens intro')
assert.match(auiCss, /\.aui-deep-avatar-intro-mute\b/, 'intro Mute control styles')
assert.doesNotMatch(auiCss, /\.aui-deep-avatar-intro-unmute\b/, 'dedicated unmute chip class removed from CSS')
const introSrc = readFileSync(join(root, 'pages/chat/aui/ChatDeepAvatarIntro.tsx'), 'utf8')
assert.match(introSrc, /shouldPlayChatDeepAvatarIntro/, 'intro play gate on every mount')
assert.doesNotMatch(introSrc, /markChatDeepAvatarIntroSeen|hasSeenChatDeepAvatarIntro/, 'no once-per-character seen latch')
assert.match(introSrc, /chatDeepAvatarIntroSrc/, 'intro resolves per-character MP4')
assert.match(introSrc, /useReducedMotion/, 'intro respects reduced motion')
assert.match(introSrc, /Tap to skip|beginExit/, 'intro is skippable')
assert.match(introSrc, /is-reduced/, 'reduced-motion wash class')
assert.match(introSrc, /useChatDeepAvatarSoundEnabled/, 'intro follows Companion Sound pref')
assert.match(introSrc, /layoutIntroContainElement/, 'intro uses JS pixel contain layout')
assert.match(introSrc, /sessionMuted/, 'intro tap-to-mute')
assert.match(introSrc, /policyMuted/, 'intro tracks autoplay policy mute')
assert.match(introSrc, /unlockConsumedClick/, 'first unlock gesture does not dismiss')
assert.match(introSrc, /primeChatDeepAvatarIntro|takePrimedChatDeepAvatarIntro/, 'intro adopts chat-open gesture prime')
assert.match(introSrc, /sessionMuted \|\| policyMuted \? 'Unmute'/, 'Mute label honest while policy-silent')
assert.doesNotMatch(introSrc, /needsGestureUnmute/, 'old needsGestureUnmute unlock chip removed')
assert.doesNotMatch(introSrc, /aui-deep-avatar-intro-unmute/, 'intro unmute chip class removed')
assert.match(introSrc, /soundEnabledRef/, 'intro sound pref is live during playback')
assert.doesNotMatch(
  introSrc,
  /<video[^>]*\bmuted\b(?!\s*=)/,
  'intro video must not hard-code muted without binding to Sound pref',
)
assert.match(introSrc, /playMutedMotion|muted motion/i, 'policy block falls back to muted motion (no hold frame)')
assert.doesNotMatch(introSrc, /HOLD at frame 0/, 'no hold-frame-0 wait for Unmute')
assert.match(introSrc, /removeAttribute\('poster'\)/, 'intro skips poster still on mount')
assert.match(
  introSrc,
  /if \(!soundEnabled \|\| sessionMuted \|\| policyMuted\) \{\s*v\.muted = true/s,
  'intro mute tracks Sound-off, user Mute, or policy-silent muted motion',
)
assert.match(
  introSrc,
  /createElement\('video'\)|takePrimedChatDeepAvatarIntro/,
  'intro mounts video imperatively (prime-safe)',
)
assert.match(introSrc, /applyChatDeepAvatarIntroPlaybackRate|playbackRate/, 'intro applies 3× playbackRate')
assert.match(introSrc, /wasChatDeepAvatarIntroArmed|markChatDeepAvatarIntroArmed/, 'once-per-visit arm latch')
assert.match(introSrc, /adoptLiveChatDeepAvatarIntroVideo/, 'live video handoff (no Strict restart)')
assert.match(introSrc, /startInFlight/, 'guards re-entrant start()/canplay')
assert.match(page, /retainChatDeepAvatarIntroShell/, 'AuiShell retains intro shell visit')
assert.match(page, /releaseChatDeepAvatarIntroShell/, 'AuiShell releases intro shell visit')
const introAudioSrc = readFileSync(join(here, 'chatDeepAvatarIntroAudio.ts'), 'utf8')
assert.match(
  introAudioSrc,
  /CHAT_DEEP_AVATAR_INTRO_PLAYBACK_RATE\s*=\s*3/,
  'intro playback rate constant is 3',
)
assert.match(
  introSrc,
  /setPhase\('enter'\)[\s\S]*REDUCED_HOLD_MS/,
  'reduced-motion starts visible (enter) before exit fade',
)
assert.match(
  introSrc,
  /every `#\/chat` enter|every #\/chat|no persistent/,
  'intro docs: play on every chat enter',
)
assert.match(page, /every #\/chat mount/, 'AUI page notes intro every mount')
const charSrc = readFileSync(join(here, 'chatDeepAvatarCharacter.ts'), 'utf8')
assert.match(charSrc, /CHAT_DEEP_AVATAR_CHARACTER_KEY/, 'character localStorage key')
assert.match(charSrc, /CHAT_DEEP_AVATAR_CHARACTER_EVENT/, 'character change event for sync')
assert.match(charSrc, /CHAT_DEEP_AVATAR_DOCK_KEY/, 'dock mode localStorage key')
assert.match(charSrc, /CHAT_DEEP_AVATAR_DOCK_EVENT/, 'dock mode change event')
assert.match(charSrc, /ChatDeepAvatarDockMode/, 'dock mode type')
assert.equal(normalizeChatDeepAvatarDockMode(''), 'bar')
assert.equal(normalizeChatDeepAvatarDockMode('stage'), 'stage')
assert.equal(normalizeChatDeepAvatarDockMode('panel'), 'stage')
assert.equal(normalizeChatDeepAvatarDockMode('bar'), 'bar')
assert.match(charSrc, /chatDeepAvatarIntroSrc/, 'intro src helper')
assert.doesNotMatch(charSrc, /CHAT_DEEP_AVATAR_INTRO_SEEN_KEY|intro-seen-v1/, 'intro seen localStorage key removed')
assert.match(charSrc, /shouldPlayChatDeepAvatarIntro/, 'intro play gate')
assert.equal(chatDeepAvatarIntroSrc('boy'), '/chat-avatar/boy/intro.mp4', 'boy intro path')
assert.equal(chatDeepAvatarIntroSrc('girl'), '/chat-avatar/girl/intro.mp4', 'girl intro path')
assert.equal(shouldPlayChatDeepAvatarIntro('boy'), true, 'boy intro plays whenever chat mounts')
assert.equal(shouldPlayChatDeepAvatarIntro('girl'), true, 'girl intro plays whenever chat mounts')
assert.equal(
  existsSync(join(root, '../public/chat-avatar/boy/intro.mp4')),
  true,
  'boy intro.mp4 is committed under public/',
)
assert.equal(
  existsSync(join(root, '../public/chat-avatar/girl/intro.mp4')),
  true,
  'girl intro.mp4 is committed under public/',
)
assert.equal(
  existsSync(join(root, '../public/chat-avatar/boy/intro-poster.jpg')),
  true,
  'boy intro poster committed',
)
assert.equal(
  existsSync(join(root, '../public/chat-avatar/girl/intro-poster.jpg')),
  true,
  'girl intro poster committed',
)
const viteCfg = readFileSync(join(root, '../vite.config.ts'), 'utf8')
assert.match(viteCfg, /chat-avatar\/\*\*\/intro\.mp4/, 'SW globIgnores intro mp4')
assert.match(viteCfg, /intro-poster/, 'SW globIgnores intro poster')
assert.match(viteCfg, /chat-avatar\/\*\*\/\*\.glb/, 'SW excludes chat-avatar GLBs')
assert.match(charSrc, /CHAT_DEEP_AVATAR_CELEBRATE_MODE_KEY/, 'celebrate mode localStorage key')
assert.match(charSrc, /CHAT_DEEP_AVATAR_CELEBRATE_MODE_EVENT/, 'celebrate mode change event')
assert.match(charSrc, /shouldFullscreenCelebrate/, 'fullscreen gate helper')
assert.match(charSrc, /pickChatDeepAvatarOutroMood/, 'outro mood picker')
assert.match(charSrc, /isChatDeepAvatarDeepFinish/, 'deep-finish helper')
assert.match(charSrc, /chatDeepAvatarMoodAssetStem/, 'mood → GIF stem helper')
assert.match(charSrc, /DS Boy/, 'DS Boy label')
assert.match(charSrc, /DS Girl/, 'DS Girl label')
assert.match(charSrc, /Both/, 'Both companion label')
assert.match(charSrc, /\/chat-avatar\/boy/, 'boy asset dir')
assert.match(charSrc, /\/chat-avatar\/girl/, 'girl asset dir')
assert.match(charSrc, /\/chat-avatar\/both/, 'both pair asset dir')
assert.equal(normalizeChatDeepAvatarCharacter('both'), 'both')
assert.equal(chatDeepAvatarPairSrc('celebrate'), '/chat-avatar/both/pair-celebrate.gif')
assert.equal(resolveChatDeepAvatarPairPlaySrc('fist'), '/chat-avatar/both/pair-highfive.gif')
assert.equal(
  pickChatDeepAvatarOutroMood({
    durationMs: 1000,
    composerMode: 'agent',
    searchOn: false,
    planBuild: true,
  }),
  'handoff',
  'Plan→Build outro latches handoff',
)
assert.equal(
  existsSync(join(root, '../public/chat-avatar/both/pair-highfive.gif')),
  true,
  'pair-highfive.gif committed',
)
assert.equal(
  existsSync(join(root, '../public/chat-avatar/both/pair-handoff.gif')),
  true,
  'pair-handoff.gif committed',
)
assert.match(avatarSrc, /ChatDeepAvatarDuo/, 'Both mode dual mount component')
assert.match(auiCss, /\.aui-deep-avatar-duo\b/, 'duo portrait CSS')
const threadSrc = readFileSync(join(root, 'pages/chat/aui/ChatAuiThread.tsx'), 'utf8')
assert.match(threadSrc, /ChatDeepAvatarDuo/, 'Thread mounts duo for Both')
assert.match(threadSrc, /isChatDeepAvatarBothMode/, 'Thread gates dual mount')

// Pure helpers — celebrate mode / outro / deep finish (no DOM).
assert.equal(normalizeChatDeepAvatarCelebrateMode(''), 'every')
assert.equal(normalizeChatDeepAvatarCelebrateMode('deep'), 'deep')
assert.equal(normalizeChatDeepAvatarCelebrateMode('frame-only'), 'frame')
assert.equal(
  shouldFullscreenCelebrate({
    celebrateMode: 'every',
    deepFinish: false,
    reducedMotion: false,
    outroActive: true,
  }),
  true,
)
assert.equal(
  shouldFullscreenCelebrate({
    celebrateMode: 'deep',
    deepFinish: false,
    reducedMotion: false,
    outroActive: true,
  }),
  false,
)
assert.equal(
  shouldFullscreenCelebrate({
    celebrateMode: 'deep',
    deepFinish: true,
    reducedMotion: false,
    outroActive: true,
  }),
  true,
)
assert.equal(
  shouldFullscreenCelebrate({
    celebrateMode: 'every',
    deepFinish: true,
    reducedMotion: true,
    outroActive: true,
  }),
  false,
)
assert.equal(
  shouldFullscreenCelebrate({
    celebrateMode: 'frame',
    deepFinish: true,
    reducedMotion: false,
    outroActive: true,
  }),
  false,
)
assert.equal(
  pickChatDeepAvatarOutroMood({
    durationMs: 1200,
    composerMode: 'ask',
    searchOn: false,
    planBuild: false,
  }),
  'proud',
)
assert.equal(
  pickChatDeepAvatarOutroMood({
    durationMs: 9000,
    composerMode: 'agent',
    searchOn: true,
    planBuild: false,
  }),
  'eureka',
)
assert.equal(
  pickChatDeepAvatarOutroMood({
    durationMs: 8000,
    composerMode: 'agent',
    searchOn: false,
    planBuild: false,
  }),
  'celebrate',
)
assert.equal(
  isChatDeepAvatarDeepFinish({
    durationMs: CHAT_DEEP_AVATAR_DEEP_MS,
    composerMode: 'agent',
    searchOn: false,
    planBuild: false,
  }),
  true,
)
assert.equal(
  isChatDeepAvatarDeepFinish({
    durationMs: 1000,
    composerMode: 'agent',
    searchOn: false,
    planBuild: true,
  }),
  true,
)
assert.equal(chatDeepAvatarMoodAssetStem('proud'), 'proud')
assert.equal(chatDeepAvatarMoodAssetStem('eureka'), 'eureka')
assert.equal(chatDeepAvatarMoodAssetStem('celebrate'), 'celebrate')
assert.equal(chatDeepAvatarMoodAssetStem('sleepy'), 'sleepy')
assert.notEqual(
  chatDeepAvatarMoodSrc('boy', 'eureka'),
  chatDeepAvatarMoodSrc('boy', 'celebrate'),
  'eureka must not collapse to celebrate GIF',
)
assert.equal(
  chatDeepAvatarMoodSrc('boy', 'proud'),
  '/chat-avatar/boy/deep-proud.gif',
)
assert.equal(
  chatDeepAvatarMoodSrc('girl', 'eureka'),
  '/chat-avatar/girl/deep-eureka.gif',
)
assert.equal(
  chatDeepAvatarMoodSrc('boy', 'sleepy'),
  '/chat-avatar/boy/deep-sleepy.gif',
)
assert.match(
  avatarSrc,
  /consumeChatDeepAvatarOutroSuppression/,
  'tool play/react suppresses natural celebrate outro',
)
assert.match(
  avatarSrc,
  /softOutroVisible/,
  'soft moods beat speak/TTS so sleepy GIFs paint',
)
assert.match(
  avatarSrc,
  /is-cheer|is-soft/,
  'fullscreen FX distinguishes cheer vs soft moods',
)
assert.match(auiCss, /\.aui-deep-avatar-fx\.is-soft\b/, 'soft FX wash styles')
assert.match(audioSrc, /chatDeepAvatarSfxEnergy|\/sfx\/\$\{energy\}/, 'SFX routes by energy class')
assert.match(runtimeSrc, /markChatDeepAvatarPlanBuild/, 'Plan→Build latches deep celebrate')
assert.match(runtimeSrc, /setChatDeepAvatarPlanBuildChainBusy/, 'Plan→Build gates Overseer→worker chain')
assert.match(runtimeSrc, /settleChatDeepAvatarPlanBuild/, 'Plan→Build settles Deep credit when chain idles')
const planBuildSrc = readFileSync(join(here, 'chatDeepAvatarPlanBuild.ts'), 'utf8')
assert.match(planBuildSrc, /markChatDeepAvatarPlanBuild/, 'plan-build latch module')
assert.match(planBuildSrc, /consumeChatDeepAvatarPlanBuild/, 'plan-build latch consumed on run end')
assert.match(
  planBuildSrc,
  /planBuildChainBusy|setChatDeepAvatarPlanBuildChainBusy/,
  'consume keeps latch armed while chain busy',
)
assert.match(planBuildSrc, /settleChatDeepAvatarPlanBuild/, 'settle bumps deferred deep outro epoch')
assert.match(planBuildSrc, /abortChatDeepAvatarPlanBuild/, 'error path can abort plan-build latch')
const signalsSrcCelebrate = readFileSync(join(here, 'chatDeepAvatarSignals.ts'), 'utf8')
assert.match(signalsSrcCelebrate, /chatDeepAvatarPlanBuild/, 'signals re-exports plan-build latch')
assert.match(avatarSrc, /hasError|abortChatDeepAvatarPlanBuild/, 'error skips celebratory outro')
assert.match(avatarSrc, /wasPlanBuildArmed && !planBuild/, 'skips outro on intermediate Plan→Build turns')
assert.match(
  avatarSrc,
  /Snapshot mode\/search only at run \*\*start\*\*|run \*\*start\*\*/,
  'run meta snapshotted at start only',
)

__resetChatDeepAvatarPlanBuildForTests()
markChatDeepAvatarPlanBuild()
setChatDeepAvatarPlanBuildChainBusy(true)
assert.equal(consumeChatDeepAvatarPlanBuild(), false, 'no consume while chain busy')
assert.equal(peekChatDeepAvatarPlanBuild(), true, 'latch stays armed while chain busy')
setChatDeepAvatarPlanBuildChainBusy(false)
assert.equal(settleChatDeepAvatarPlanBuild(), true, 'settle claims credit when chain idles')
assert.equal(peekChatDeepAvatarPlanBuild(), false, 'settle clears armed latch')
markChatDeepAvatarPlanBuild()
abortChatDeepAvatarPlanBuild()
assert.equal(peekChatDeepAvatarPlanBuild(), false, 'abort clears armed latch')
markChatDeepAvatarPlanBuild()
assert.equal(consumeChatDeepAvatarPlanBuild(), true, 'solo consume when chain idle')
__resetChatDeepAvatarPlanBuildForTests()
for (const character of ['boy', 'girl'] as const) {
  for (const f of [
    'deep-idle.gif',
    'deep-happy.gif',
    'deep-think.gif',
    'deep-speak.gif',
    'deep-listen.gif',
    'deep-concern.gif',
    'deep-celebrate.gif',
    'deep-proud.gif',
    'deep-eureka.gif',
    'deep-bow.gif',
    'deep-fist.gif',
    'deep-wave.gif',
    'deep-nod.gif',
    'deep-relieved.gif',
    'deep-sleepy.gif',
    'deep-bust.png',
  ]) {
    assert.ok(
      existsSync(join(root, '../public/chat-avatar', character, f)),
      `public/chat-avatar/${character}/${f} present`,
    )
  }
  for (const mood of ['celebrate', 'fist', 'bow'] as const) {
    assert.ok(
      existsSync(join(root, '../public/chat-avatar', character, 'vo', `${mood}.mp3`)),
      `public/chat-avatar/${character}/vo/${mood}.mp3 present`,
    )
  }
}
assert.ok(existsSync(join(root, '../public/chat-avatar/sfx/celebrate.mp3')), 'shared celebrate sfx')
assert.ok(existsSync(join(root, '../public/chat-avatar/sfx/fist.mp3')), 'shared fist sfx')
assert.ok(existsSync(join(root, '../public/chat-avatar/sfx/soft.mp3')), 'soft energy sfx')
assert.ok(existsSync(join(root, '../public/chat-avatar/sfx/cheer.mp3')), 'cheer energy sfx')
assert.ok(existsSync(join(root, '../public/chat-avatar/sfx/hype.mp3')), 'hype energy sfx')
assert.ok(existsSync(join(root, '../public/chat-avatar/boy/vo/sleepy.mp3')), 'boy sleepy VO')
assert.ok(existsSync(join(root, '../public/chat-avatar/boy/vo/eureka.mp3')), 'boy eureka VO')
assert.equal(chatDeepAvatarMoodAssetStem('bow'), 'bow')
assert.equal(chatDeepAvatarMoodAssetStem('fist'), 'fist')
assert.equal(chatDeepAvatarMoodAssetStem('sleepy'), 'sleepy')
assert.match(
  runtimeSrc,
  /onAvatar|requestChatDeepAvatarPlay/,
  'runtime wires avatar SSE play/react',
)
assert.match(
  runtimeSrc,
  /abortByThreadRef|Do NOT abort/,
  'background project runs: per-thread abort, selectThread does not kill streams',
)
assert.match(
  runtimeSrc,
  /stopGeneration:\s*\(threadId\?: string\)\s*=> void/,
  'Stop can target a specific thread id',
)
const signalsSrc = readFileSync(join(here, 'chatDeepAvatarSignals.ts'), 'utf8')
assert.match(signalsSrc, /setChatDeepAvatarListening/, 'dictate → listen bus')
assert.match(signalsSrc, /setChatDeepAvatarTtsPlaying/, 'chat TTS → lips bus')
assert.match(signalsSrc, /getChatDeepAvatarLipLevel/, 'synthetic lip envelope')
const dictateSrc = readFileSync(join(root, 'components/ChatDictateButton.tsx'), 'utf8')
assert.match(dictateSrc, /setChatDeepAvatarListening/, 'dictate publishes listen signal')
const chatTtsSrc = readFileSync(join(here, 'chatDeepseekVoice.ts'), 'utf8')
assert.match(chatTtsSrc, /setChatDeepAvatarTtsPlaying\(true\)/, 'chat TTS marks playing for lips')
assert.match(chatTtsSrc, /setChatDeepAvatarTtsPlaying\(false\)/, 'chat TTS clears playing for lips')
assert.doesNotMatch(thread, /WebSpeechSynthesisAdapter|speechSynthesis\.speak/, 'no browser TTS adapter')
assert.doesNotMatch(
  thread,
  /streaming \|\| !rich \?[\s\S]*ds-chat-plain/,
  'AUI does not use classic plain-while-streaming gate',
)
assert.doesNotMatch(thread, /aui-source/, 'no always-on inline source chip spam')

const pkg = JSON.parse(readFileSync(join(root, '../package.json'), 'utf8')) as {
  dependencies?: Record<string, string>
}
assert.ok(pkg.dependencies?.['@assistant-ui/react'], '@assistant-ui/react dependency')
assert.equal(pkg.dependencies?.['@assistant-ui/styles'], undefined, 'no @assistant-ui/styles stock CSS')

const user: ChatMessage = {
  id: 'u1',
  role: 'user',
  content: '你好',
  createdAt: 1,
}
const assistant: ChatMessage = {
  id: 'a1',
  role: 'assistant',
  content: 'Hello',
  createdAt: 2,
  reasoning: 'think…',
  thoughtMs: 1200,
  sources: [{ url: 'https://example.com', title: 'Example' }],
}

const u = convertChatMessage(user)
assert.equal(u.role, 'user')
assert.ok(Array.isArray(u.content))

const a = convertChatMessage(assistant, { streamingId: null })
assert.equal(a.role, 'assistant')
assert.ok(Array.isArray(a.content))
const parts = a.content as Array<{ type: string }>
assert.ok(parts.some((p) => p.type === 'reasoning'))
assert.ok(parts.some((p) => p.type === 'text'))
assert.ok(parts.some((p) => p.type === 'source'))

const live = convertChatMessage(assistant, { streamingId: 'a1' })
assert.equal(live.status?.type, 'running')

const emptySettled = convertChatMessage(
  { id: 'a-empty', role: 'assistant', content: '', createdAt: 3 },
  { streamingId: null },
)
assert.equal(
  emptySettled.status?.type,
  'incomplete',
  'Empty settled assistant must not stay running (Ask Stop/caret stuck)',
)

// Citation rewriter: bare [n] → <a class="ds-md-cite" href=…> when sources[n-1] exists.
const mdSrc = readFileSync(join(here, 'renderChatMarkdown.tsx'), 'utf8')
assert.match(
  mdSrc,
  /citationChipHtml[\s\S]*class="ds-md-cite"[\s\S]*sources\[n - 1\]/,
  'markdown maps [n] chips to source URLs',
)

console.log('chatAui.smoke: ok')
