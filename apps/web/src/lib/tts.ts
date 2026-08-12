import { fetchTtsAudio } from './api'
import type { Lang } from './types'

let audio: HTMLAudioElement | null = null
let url: string | null = null
let gen = 0
let playing = false
let startedAt = 0

export function isTtsPlaying() {
  return playing
}
export function getPlaybackStartedAt() {
  return startedAt
}

export function stopSpeaking() {
  gen += 1
  playing = false
  if (audio) {
    audio.onended = null
    audio.pause()
    audio.src = ''
    audio = null
  }
  if (url) {
    URL.revokeObjectURL(url)
    url = null
  }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}

export function notifyBargeIn() {
  if (!playing) return
  if (Date.now() - startedAt < 280) return
  stopSpeaking()
}

function browserSpeak(text: string, lang: Lang, g: number) {
  return new Promise<void>((resolve) => {
    if (!('speechSynthesis' in window)) {
      playing = false
      resolve()
      return
    }
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang === 'yue' ? 'zh-HK' : 'en-US'
    u.onend = () => {
      if (g === gen) playing = false
      resolve()
    }
    u.onerror = () => {
      if (g === gen) playing = false
      resolve()
    }
    playing = true
    startedAt = Date.now()
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  })
}

export async function speakText(text: string, lang: Lang) {
  const trimmed = text.trim()
  if (!trimmed) return
  stopSpeaking()
  const g = gen
  playing = true
  startedAt = Date.now()
  const blob = await fetchTtsAudio(trimmed, lang)
  if (g !== gen) return
  if (blob && blob.size > 0) {
    const objectUrl = URL.createObjectURL(blob)
    url = objectUrl
    const el = new Audio(objectUrl)
    audio = el
    await new Promise<void>((resolve) => {
      el.onended = () => {
        if (g === gen) playing = false
        resolve()
      }
      el.onerror = () => {
        if (g === gen) playing = false
        resolve()
      }
      void el.play().catch(() => {
        if (g === gen) playing = false
        resolve()
      })
    })
    return
  }
  await browserSpeak(trimmed, lang, g)
}
