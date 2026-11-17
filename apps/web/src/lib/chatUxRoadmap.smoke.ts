import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractChatArtifacts, relatedQuestionsFromReply } from './chatArtifacts.js'
import { CHAT_DEFERRED_FEATURES } from './chatDeferred.js'
import {
  parseImportedThread,
  threadToMarkdown,
} from './chatExport.js'
import {
  emptyThread,
  searchChatThreads,
  setChatThreadArchived,
  setChatThreadPinned,
  type ChatThread,
} from './chatHistory.js'
import { applyChatSkill, CHAT_SKILLS, filterChatSkills, translationChatPrefill } from './chatSkills.js'
import { chatSpeakLang } from './chatVoice.js'

const here = dirname(fileURLToPath(import.meta.url))

assert.ok(CHAT_SKILLS.length >= 5)
assert.ok(filterChatSkills('/wea').some((s) => s.slash === '/weather'))
assert.match(applyChatSkill(CHAT_SKILLS[0]!, '你好'), /你好/)
assert.match(translationChatPrefill({ source: '你好', translation: 'hello', fromLang: 'yue', toLang: 'en' }), /Help me understand/)

const arts = extractChatArtifacts('Intro\n\n```html\n<h1>Hi</h1>\n```\n\n```mermaid\ngraph TD;A-->B\n```\n')
assert.ok(arts.some((a) => a.kind === 'html'))
assert.ok(arts.some((a) => a.kind === 'mermaid'))

const qs = relatedQuestionsFromReply('## Topic\n\nWhat is quantum entanglement?\n\nMore text.')
assert.ok(qs.length >= 1)
assert.ok(qs.some((q) => q.includes('?')))

let thread: ChatThread = { ...emptyThread(), title: 'Pin me', messages: [] }
thread = setChatThreadPinned(thread, true)
assert.equal(thread.pinned, true)
thread = setChatThreadArchived(thread, true)
assert.equal(thread.archived, true)
assert.equal(thread.pinned, false)

const threads = [
  { ...emptyThread(), title: 'Cantonese tones', messages: [] },
  { ...emptyThread(), title: 'Travel plan', messages: [{ id: '1', role: 'user' as const, content: 'Hong Kong trip', createdAt: 1 }] },
]
assert.equal(searchChatThreads(threads, 'cantonese').length, 1)
assert.equal(searchChatThreads(threads, 'hong kong').length, 1)

const md = threadToMarkdown({
  ...emptyThread(),
  title: 'Export',
  messages: [
    { id: 'u', role: 'user', content: 'Hi', createdAt: 1 },
    { id: 'a', role: 'assistant', content: 'Hello', createdAt: 2, sources: [{ url: 'https://example.com', title: 'Ex' }] },
  ],
})
assert.match(md, /# Export/)
assert.match(md, /Hello/)
assert.match(md, /example\.com/)

const imported = parseImportedThread(
  JSON.stringify({
    id: 'old',
    title: 'Imported',
    updatedAt: 1,
    messages: [{ id: 'm', role: 'user', content: 'yo', createdAt: 1 }],
  }),
)
assert.ok(imported)
assert.notEqual(imported!.id, 'old')
assert.equal(imported!.title, 'Imported')

assert.equal(chatSpeakLang('nei5 hou2 maa3 dim2 gai2'), 'yue')
assert.equal(chatSpeakLang('Hola gracias por la ayuda con el proyecto también'), 'es')

assert.ok(!CHAT_DEFERRED_FEATURES.includes('conversation_branching' as never))
assert.ok(CHAT_DEFERRED_FEATURES.includes('supabase_cloud_thread_sync'))

const chatPage = readFileSync(join(here, '../pages/ChatPage.tsx'), 'utf8')
assert.match(chatPage, /ChatThreadRow/, 'Sidebar thread power tools')
assert.match(chatPage, /ChatArtifactPanel/, 'Artifacts panel')
assert.match(chatPage, /ChatSkillMenu/, 'Slash skills menu')
assert.match(chatPage, /ChatRelatedQuestions/, 'Related questions')
assert.match(chatPage, /searchThisReply/, 'Search this reply')
assert.match(chatPage, /canAutoSpeak && autoSpeak/, 'Auto-speak after reply')
assert.match(chatPage, /onDragOver|onDrop|onPaste/, 'Drag-drop / paste attach')
assert.match(chatPage, /copyConversation|shareConversation/, 'Share / copy conversation')
assert.doesNotMatch(chatPage, /safety_check/, 'Chat UI stays uncensored')

const solo = readFileSync(join(here, '../components/SoloView.tsx'), 'utf8')
assert.match(solo, /openDeepseekChatWithPrefill/, 'Solo deep-link to chat')
const conv = readFileSync(join(here, '../components/ConversationView.tsx'), 'utf8')
assert.match(conv, /openDeepseekChatWithPrefill/, 'Conversation deep-link to chat')

const mdSrc = readFileSync(join(here, './renderChatMarkdown.tsx'), 'utf8')
assert.match(mdSrc, /loadMermaid|cdn\.jsdelivr\.net\/npm\/mermaid/, 'Local Mermaid render')
assert.doesNotMatch(mdSrc, /mermaid\.ink/, 'mermaid.ink removed')

console.log('chatUxRoadmap.smoke: ok')
