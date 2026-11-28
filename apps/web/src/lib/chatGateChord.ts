/**
 * Quiet chord listener for the #/chat gate.
 * Codes are XOR+chunked — no obvious branded sequence strings in source.
 */
import { redeemChatGateChord, type ChatGateRedeemResult } from './chatGateRedeem'

const XOR_KEY = [0x5a, 0x3c, 0x91, 0xe2, 0x17, 0xb4, 0x6d, 0x08]

/** Four opaque chunks (base64 of XOR'd pipe-joined KeyboardEvent.code list). */
const CHUNKS = [
  'G07jjWDhHXQbTuONYOEddBtO441g8AJ/',
  'NEDQkGXbGkw1S/+eVsYfZy1w9IRjyCx6',
  'KFPmsH7TBXwmfeOQeMMhbTxI7aNlxgJ/',
  'CFX2imPIJm0jfu2pcs0sdBFZ6KBr/whxGw==',
] as const

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function decodeTarget(): string[] {
  const bytes: number[] = []
  for (const chunk of CHUNKS) {
    const part = b64ToBytes(chunk)
    for (let i = 0; i < part.length; i++) bytes.push(part[i]!)
  }
  const plain = String.fromCharCode(
    ...bytes.map((b, i) => b ^ XOR_KEY[i % XOR_KEY.length]!),
  )
  return plain.split('|').filter(Boolean)
}

export type ChatGateChordHandlers = {
  onUnlocked?: () => void
  onResult?: (result: ChatGateRedeemResult) => void
}

/**
 * While the chat gate is visible, listen for the quiet chord on document (capture).
 * Returns an unsubscribe. Prefer focusing the gate root (tabIndex=-1) when shown.
 */
export function attachChatGateChord(handlers?: ChatGateChordHandlers | (() => void)): () => void {
  const onUnlocked = typeof handlers === 'function' ? handlers : handlers?.onUnlocked
  const onResult = typeof handlers === 'function' ? undefined : handlers?.onResult

  let target: string[] | null = null
  try {
    target = decodeTarget()
  } catch {
    return () => {}
  }
  if (!target.length) return () => {}

  let idx = 0
  let busy = false
  const targetSet = new Set(target)

  const onKey = (ev: KeyboardEvent) => {
    if (busy) return
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return
    // Ignore OS key-repeat so a held arrow does not skip the sequence.
    if (ev.repeat) return
    const el = ev.target as HTMLElement | null
    const tag = el?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable) {
      return
    }
    const code = ev.code
    if (!code) return
    if (code === target![idx]) {
      // Stop arrow-key focus/scroll steal while the chord is in progress.
      if (targetSet.has(code)) {
        ev.preventDefault()
        ev.stopPropagation()
      }
      idx += 1
      if (idx >= target!.length) {
        idx = 0
        busy = true
        void redeemChatGateChord(target!.join('|'))
          .then((result) => {
            onResult?.(result)
            if (result.ok) onUnlocked?.()
          })
          .finally(() => {
            busy = false
          })
      }
    } else {
      idx = code === target![0] ? 1 : 0
      if (idx === 1 && targetSet.has(code)) {
        ev.preventDefault()
        ev.stopPropagation()
      }
    }
  }

  // document + capture: works even when a gate button holds focus.
  document.addEventListener('keydown', onKey, true)
  return () => document.removeEventListener('keydown', onKey, true)
}
