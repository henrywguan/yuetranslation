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
  chatDeepAvatarMoodAssetStem,
  isChatDeepAvatarDeepFinish,
  normalizeChatDeepAvatarCelebrateMode,
  pickChatDeepAvatarOutroMood,
  shouldFullscreenCelebrate,
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
// `.ds-chat` — never an unstyled in-flow scrim (that shoved main right).
assert.match(auiShellFn, /ds-chat-sidebar-backdrop/, 'mobile history uses classic absolute backdrop')
assert.doesNotMatch(auiShellFn, /ds-chat-sidebar-scrim/, 'no unstyled in-flow scrim')
assert.match(
  auiShellFn,
  /ds-chat-sidebar[\s\S]*ds-chat-main aui-main/,
  'sidebar is a sibling of main under ds-chat (flush left)',
)
assert.match(auiShellFn, /InboxShell/, 'Inbox chrome lives in shell sidebar')
assert.match(auiShellFn, /aria-label="Inbox"/, 'sidebar is the Chat Inbox')
assert.match(page, /ChatInboxProvider/, 'Inbox provider wraps AUI runtime')
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
assert.match(settingsMenu, /DS Boy|CHAT_DEEP_AVATAR_CHARACTER_LABEL/, 'Companion lists DS Boy / Girl')
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
  /inbox-settings-companion[\s\S]*inbox-settings-celebrate/,
  'Celebrate renders after Companion in the cog menu',
)
const settingsInboxCss = readFileSync(join(root, 'pages/chat/inbox/Inbox.css'), 'utf8')
assert.match(settingsInboxCss, /inbox-settings-menu\.is-portaled/, 'portaled settings CSS')
assert.match(
  settingsInboxCss,
  /\.inbox-settings-menu\.is-portaled[\s\S]*z-index:\s*130/,
  'portaled settings sits above .ds-chat (120)',
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
assert.match(thread, /useChatDeepAvatarLipLevel/, 'TTS lip level wired into portrait')
assert.match(auiCss, /\.aui-deep-avatar\b/, 'companion avatar styles')
assert.doesNotMatch(auiCss, /\.aui-deep-avatar-dock\b|\.aui-deep-avatar-stage\b/, 'dock/stage CSS removed')
assert.match(auiCss, /\.aui-deep-avatar-lips\b/, 'TTS lip overlay styles')
const avatarSrc = readFileSync(join(root, 'pages/chat/aui/ChatDeepAvatar.tsx'), 'utf8')
assert.match(avatarSrc, /size = 'portrait'|Size = 'portrait'/, 'portrait is default/supported size')
assert.match(avatarSrc, /useChatDeepAvatarCharacter/, 'persisted character hook')
assert.match(avatarSrc, /CHAT_DEEP_AVATAR_CHARACTER_EVENT/, 'same-tab character sync')
assert.match(avatarSrc, /useChatDeepAvatarCelebrateMode/, 'celebrate mode hook')
assert.match(avatarSrc, /ChatDeepAvatarCelebrateFx/, 'fullscreen celebrate FX component')
assert.match(avatarSrc, /createPortal/, 'celebrate FX portals to body')
assert.match(avatarSrc, /pickChatDeepAvatarOutroMood|setOutro/, 'outro latch wired in mood hook')
assert.match(avatarSrc, /Priority \(high → low\)/, 'documents mood priority')
assert.match(avatarSrc, /celebrate \/ proud \/ eureka|proud.*eureka/, 'documents proud/eureka outros')
assert.doesNotMatch(avatarSrc, /[Ll]ive2[Dd]|Cubism/, 'no Live2D / Cubism in avatar')
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
assert.match(thread, /ChatDeepAvatarCelebrateFx/, 'composer mounts celebrate FX')
assert.match(thread, /useChatDeepAvatarCelebrateFx/, 'composer gates fullscreen via pref')
assert.match(thread, /dimmed=\{dimPortrait\}/, 'portrait dims while FX flies')
const inboxCss = readFileSync(join(root, 'pages/chat/inbox/Inbox.css'), 'utf8')
assert.match(inboxCss, /\.inbox-settings-companion\b/, 'Inbox Companion settings styles')
assert.match(inboxCss, /\.inbox-settings-celebrate\b/, 'Inbox Celebrate settings styles')
const charSrc = readFileSync(join(here, 'chatDeepAvatarCharacter.ts'), 'utf8')
assert.match(charSrc, /CHAT_DEEP_AVATAR_CHARACTER_KEY/, 'character localStorage key')
assert.match(charSrc, /CHAT_DEEP_AVATAR_CHARACTER_EVENT/, 'character change event for sync')
assert.match(charSrc, /CHAT_DEEP_AVATAR_CELEBRATE_MODE_KEY/, 'celebrate mode localStorage key')
assert.match(charSrc, /CHAT_DEEP_AVATAR_CELEBRATE_MODE_EVENT/, 'celebrate mode change event')
assert.match(charSrc, /shouldFullscreenCelebrate/, 'fullscreen gate helper')
assert.match(charSrc, /pickChatDeepAvatarOutroMood/, 'outro mood picker')
assert.match(charSrc, /isChatDeepAvatarDeepFinish/, 'deep-finish helper')
assert.match(charSrc, /chatDeepAvatarMoodAssetStem/, 'proud/eureka map to existing GIFs')
assert.match(charSrc, /DS Boy/, 'DS Boy label')
assert.match(charSrc, /DS Girl/, 'DS Girl label')
assert.match(charSrc, /\/chat-avatar\/boy/, 'boy asset dir')
assert.match(charSrc, /\/chat-avatar\/girl/, 'girl asset dir')

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
assert.equal(chatDeepAvatarMoodAssetStem('proud'), 'happy')
assert.equal(chatDeepAvatarMoodAssetStem('eureka'), 'celebrate')
const runtimeSrc = readFileSync(join(root, 'pages/chat/aui/ChatAuiRuntime.tsx'), 'utf8')
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
    'deep-bust.png',
  ]) {
    assert.ok(
      existsSync(join(root, '../public/chat-avatar', character, f)),
      `public/chat-avatar/${character}/${f} present`,
    )
  }
}
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

// Citation rewriter: bare [n] → <a class="ds-md-cite" href=…> when sources[n-1] exists.
const mdSrc = readFileSync(join(here, 'renderChatMarkdown.tsx'), 'utf8')
assert.match(
  mdSrc,
  /citationChipHtml[\s\S]*class="ds-md-cite"[\s\S]*sources\[n - 1\]/,
  'markdown maps [n] chips to source URLs',
)

console.log('chatAui.smoke: ok')
