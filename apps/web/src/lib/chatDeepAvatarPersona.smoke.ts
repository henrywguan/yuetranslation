/**
 * Offline smoke for companion persona / catalog / name sanitize.
 * Run: npx tsx apps/web/src/lib/chatDeepAvatarPersona.smoke.ts
 */
import assert from 'node:assert/strict'
import {
  CHAT_DEEP_AVATAR_SHOWCASE,
  CHAT_DEEP_AVATAR_SHOWCASE_IDS,
  CHAT_DEEP_AVATAR_SOUND_KEY,
  buildChatDeepAvatarPersonaPromptBlock,
  highEnergyAvatarMood,
  normalizeChatDeepAvatarCloudPrefs,
  normalizeChatDeepAvatarNames,
  normalizeChatDeepAvatarShowcaseMood,
  readChatDeepAvatarSoundEnabled,
  sanitizeChatDeepAvatarName,
  sanitizeChatDeepAvatarNotes,
  writeChatDeepAvatarSoundEnabled,
} from './chatDeepAvatarPersona.ts'
import {
  chatDeepAvatarMoodAssetStem,
  chatDeepAvatarMoodSrc,
  chatDeepAvatarPairSrc,
  normalizeChatDeepAvatarCharacter,
  resolveChatDeepAvatarPairPlaySrc,
} from './chatDeepAvatarCharacter.ts'
import {
  consumeChatDeepAvatarOutroSuppression,
  inferChatDeepAvatarMoodFromText,
  __resetChatDeepAvatarPlayBusForTests,
  requestChatDeepAvatarPlay,
  requestChatDeepAvatarReact,
  peekChatDeepAvatarPlay,
} from './chatDeepAvatarPlayBus.ts'
import { chatDeepAvatarSfxSrc, chatDeepAvatarVoSrc } from './chatDeepAvatarAudio.ts'

assert.equal(sanitizeChatDeepAvatarName('  Ada  ', 'DS Boy'), 'Ada')
assert.equal(sanitizeChatDeepAvatarName('', 'DS Boy'), 'DS Boy')
assert.equal(sanitizeChatDeepAvatarName('x'.repeat(40), 'DS Boy').length, 24)
assert.ok(sanitizeChatDeepAvatarNotes('hi\nthere').includes('hi'))
// Live notes field re-sanitizes every keystroke — keep trailing Space.
assert.equal(sanitizeChatDeepAvatarNotes('Please '), 'Please ')
assert.equal(sanitizeChatDeepAvatarNotes('  Henry-Sama  '), '  Henry-Sama  ')
assert.equal(
  sanitizeChatDeepAvatarNotes('Please always refer to me as Henry-Sama'),
  'Please always refer to me as Henry-Sama',
)
const paddedPrompt = buildChatDeepAvatarPersonaPromptBlock({
  character: 'boy',
  name: 'Kai',
  trait: 'cheerful',
  notes: '  remember spaces  ',
})
assert.match(paddedPrompt, /\nremember spaces$/)
assert.doesNotMatch(paddedPrompt, /  remember spaces  /)

const names = normalizeChatDeepAvatarNames({ boy: 'Kai', girl: '' })
assert.equal(names.boy, 'Kai')
assert.equal(names.girl, 'DS Girl')

assert.equal(CHAT_DEEP_AVATAR_SHOWCASE.length, CHAT_DEEP_AVATAR_SHOWCASE_IDS.length)
for (const id of ['bow', 'fist', 'wave', 'nod', 'relieved', 'sleepy'] as const) {
  assert.ok(CHAT_DEEP_AVATAR_SHOWCASE_IDS.includes(id), `showcase has ${id}`)
  assert.equal(normalizeChatDeepAvatarShowcaseMood(id), id)
  assert.match(chatDeepAvatarMoodSrc('boy', id), new RegExp(`deep-${id}\\.gif`))
  assert.equal(chatDeepAvatarMoodAssetStem(id), id)
}

assert.equal(highEnergyAvatarMood('celebrate'), true)
assert.equal(highEnergyAvatarMood('eureka'), true)
assert.equal(highEnergyAvatarMood('fist'), true)
assert.equal(highEnergyAvatarMood('nod'), false)
assert.equal(highEnergyAvatarMood('sleepy'), false)

const prompt = buildChatDeepAvatarPersonaPromptBlock({
  character: 'girl',
  name: 'Momo',
  trait: 'witty',
  notes: 'likes Cantonese puns',
})
assert.match(prompt, /Momo/)
assert.match(prompt, /avatar_play/)
assert.match(prompt, /likes Cantonese puns/)

const cloud = normalizeChatDeepAvatarCloudPrefs({
  character: 'girl',
  names: { girl: 'Momo' },
  trait: 'coach',
  soundEnabled: false,
  companion3d: true,
  updatedAt: '2026-01-01T00:00:00.000Z',
})
assert.equal(cloud?.character, 'girl')
assert.equal(cloud?.trait, 'coach')
assert.equal(cloud?.soundEnabled, false)
assert.equal(cloud?.companion3d, true)

assert.equal(normalizeChatDeepAvatarCharacter('both'), 'both')
assert.equal(normalizeChatDeepAvatarCharacter('duo'), 'both')
const bothCloud = normalizeChatDeepAvatarCloudPrefs({ character: 'both' })
assert.equal(bothCloud?.character, 'both')
assert.equal(chatDeepAvatarPairSrc('highfive'), '/chat-avatar/both/pair-highfive.gif')
assert.equal(resolveChatDeepAvatarPairPlaySrc('fist'), '/chat-avatar/both/pair-highfive.gif')
assert.equal(resolveChatDeepAvatarPairPlaySrc('handoff'), '/chat-avatar/both/pair-handoff.gif')
assert.match(
  buildChatDeepAvatarPersonaPromptBlock({
    character: 'both',
    name: 'Kai & Momo',
    trait: 'cheerful',
  }),
  /duo/,
)

// Companion Sound defaults ON when unset; only explicit off is silent.
{
  const g = globalThis as { localStorage?: Storage; window?: unknown }
  const mem = new Map<string, string>()
  const ls = {
    getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k: string, v: string) => {
      mem.set(k, String(v))
    },
    removeItem: (k: string) => {
      mem.delete(k)
    },
  } as Storage
  g.localStorage = ls
  g.window = {
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  }
  mem.delete(CHAT_DEEP_AVATAR_SOUND_KEY)
  assert.equal(readChatDeepAvatarSoundEnabled(), true, 'missing sound pref → on')
  assert.equal(writeChatDeepAvatarSoundEnabled(false), false)
  assert.equal(readChatDeepAvatarSoundEnabled(), false, 'explicit sound off')
  assert.equal(writeChatDeepAvatarSoundEnabled(true), true)
  assert.equal(readChatDeepAvatarSoundEnabled(), true, 'explicit sound on')
}

assert.equal(inferChatDeepAvatarMoodFromText('Hooray, we shipped it!'), 'celebrate')
assert.equal(inferChatDeepAvatarMoodFromText('Sorry, that failed.'), 'concern')
assert.equal(inferChatDeepAvatarMoodFromText('Eureka — we found the breakthrough!'), 'eureka')
assert.equal(inferChatDeepAvatarMoodFromText('Getting sleepy, good night soon.'), 'sleepy')

assert.equal(normalizeChatDeepAvatarShowcaseMood('eureka!'), 'eureka')
assert.equal(normalizeChatDeepAvatarShowcaseMood('Hooray'), 'celebrate')
assert.equal(normalizeChatDeepAvatarShowcaseMood('zzz'), 'sleepy')
assert.equal(normalizeChatDeepAvatarShowcaseMood('sleep'), 'sleepy')
assert.equal(normalizeChatDeepAvatarShowcaseMood('aha'), 'eureka')

__resetChatDeepAvatarPlayBusForTests()
requestChatDeepAvatarPlay('eureka', { forceFullscreen: true, source: 'play' })
assert.equal(peekChatDeepAvatarPlay()?.mood, 'eureka')
assert.equal(peekChatDeepAvatarPlay()?.forceFullscreen, true)
requestChatDeepAvatarReact('nod')
assert.equal(peekChatDeepAvatarPlay()?.mood, 'nod')
assert.equal(peekChatDeepAvatarPlay()?.forceFullscreen, false)
requestChatDeepAvatarReact('sleepy')
assert.equal(peekChatDeepAvatarPlay()?.mood, 'sleepy')
assert.equal(peekChatDeepAvatarPlay()?.forceFullscreen, false)

assert.match(chatDeepAvatarSfxSrc('celebrate'), /\/sfx\/cheer\.mp3$/)
assert.match(chatDeepAvatarSfxSrc('eureka'), /\/sfx\/hype\.mp3$/)
assert.match(chatDeepAvatarSfxSrc('sleepy'), /\/sfx\/soft\.mp3$/)
assert.notEqual(chatDeepAvatarSfxSrc('eureka'), chatDeepAvatarSfxSrc('celebrate'))
assert.match(chatDeepAvatarVoSrc('boy', 'fist'), /\/boy\/vo\/fist\.mp3$/)
assert.match(chatDeepAvatarVoSrc('boy', 'eureka!'), /\/boy\/vo\/eureka\.mp3$/)
assert.match(chatDeepAvatarVoSrc('girl', 'zzz'), /\/girl\/vo\/sleepy\.mp3$/)

assert.equal(chatDeepAvatarMoodAssetStem('eureka'), 'eureka')
assert.equal(chatDeepAvatarMoodAssetStem('sleepy'), 'sleepy')
assert.equal(chatDeepAvatarMoodAssetStem('proud'), 'proud')
assert.match(chatDeepAvatarMoodSrc('boy', 'eureka'), /deep-eureka\.gif$/)
assert.match(chatDeepAvatarMoodSrc('boy', 'sleepy'), /deep-sleepy\.gif$/)
assert.notEqual(chatDeepAvatarMoodSrc('boy', 'eureka'), chatDeepAvatarMoodSrc('boy', 'celebrate'))

__resetChatDeepAvatarPlayBusForTests()
assert.equal(consumeChatDeepAvatarOutroSuppression(), false)
requestChatDeepAvatarPlay('sleepy', { forceFullscreen: true, source: 'play' })
assert.equal(consumeChatDeepAvatarOutroSuppression(), true)
assert.equal(consumeChatDeepAvatarOutroSuppression(), false)

console.log('chatDeepAvatarPersona.smoke: ok')
