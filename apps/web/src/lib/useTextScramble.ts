import { useCallback, useEffect, useRef, useState } from 'react'

const LATIN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const CJK = '粵語翻譯器廣東話漢字拼音聲調'
const POOL = LATIN + CJK

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function randomGlyph(preferCjk: boolean) {
  const pool = preferCjk ? CJK + LATIN : LATIN + CJK
  return pool[Math.floor(Math.random() * pool.length)] ?? '·'
}

export type TextScrambleControls = {
  text: string
  scrambleTo: (target: string) => void
  busy: boolean
}

/**
 * Classic left-to-right text scramble (decode / encode).
 * Handles unequal source/target lengths by morphing length over the run.
 */
export function useTextScramble(initial: string): TextScrambleControls {
  const [text, setText] = useState(initial)
  const [busy, setBusy] = useState(false)
  const frameRef = useRef(0)
  const textRef = useRef(initial)
  const runId = useRef(0)

  useEffect(() => {
    textRef.current = text
  }, [text])

  useEffect(
    () => () => {
      cancelAnimationFrame(frameRef.current)
      runId.current += 1
    },
    [],
  )

  const scrambleTo = useCallback((target: string) => {
    cancelAnimationFrame(frameRef.current)
    const id = ++runId.current

    if (prefersReducedMotion()) {
      textRef.current = target
      setText(target)
      setBusy(false)
      return
    }

    const from = textRef.current
    if (from === target) return

    setBusy(true)
    const maxLen = Math.max(from.length, target.length)
    // ~28ms/step × maxLen settles quickly without feeling sluggish.
    const stepMs = 28
    const settleStagger = 1
    const started = performance.now()
    const preferCjk = /[\u4e00-\u9fff]/.test(target)

    const tick = (now: number) => {
      if (id !== runId.current) return
      const elapsed = now - started
      const steps = Math.floor(elapsed / stepMs)
      let done = true
      let next = ''

      for (let i = 0; i < maxLen; i += 1) {
        const revealAt = i * settleStagger
        const targetCh = target[i]
        const fromCh = from[i]

        if (i >= target.length) {
          // Shrinking: drop trailing noise after its reveal window.
          if (steps < revealAt + 2) {
            next += randomGlyph(preferCjk)
            done = false
          }
          continue
        }

        if (steps >= revealAt + 2) {
          next += targetCh!
          continue
        }

        done = false
        if (steps < revealAt) {
          next += fromCh && i < from.length ? fromCh : randomGlyph(preferCjk)
        } else {
          next += randomGlyph(preferCjk)
        }
      }

      // Avoid empty flash while shrinking mid-frame.
      textRef.current = next || target
      setText(textRef.current)

      if (!done) {
        frameRef.current = requestAnimationFrame(tick)
        return
      }

      textRef.current = target
      setText(target)
      setBusy(false)
    }

    frameRef.current = requestAnimationFrame(tick)
  }, [])

  return { text, scrambleTo, busy }
}

/** Glyph pool exported for tests / demos. */
export const TEXT_SCRAMBLE_POOL = POOL
